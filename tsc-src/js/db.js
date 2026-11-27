'use strict';
/* ============================================================
   CAPA DE DATOS — Firestore
   ------------------------------------------------------------
   API única para el resto de la app: dbGetAll/dbGet/dbAdd/
   dbAddMany/dbPut/dbDelete/dbDeleteMany/dbWriteBatch/dbSubscribe
   + getForSeason.

   IDs: enteros autoincrementales, con un documento contador por
   colección en _counters/{store}.

   Sin SDK de Firebase (USE_FIRESTORE en false) no hay base: initDB
   lanza (code 'offline') y el arranque muestra «Sin conexión». Antes
   caía a un IndexedDB local que sembraba datos inventados con aspecto
   de reales y sin aviso (H-23, decisión D6).
   ============================================================ */

/* `db` ya está declarado en state.js (instancia de Firestore) */

function _isFS(){ return typeof USE_FIRESTORE !== 'undefined' && USE_FIRESTORE; }

/* Guard de verificación: localhost apunta a la base real de producción —
   no hay sandbox. Con window.__TSC_READONLY__ activo, toda escritura lanza
   en vez de tocar la base, para que una verificación automatizada no pueda
   escribir ni por accidente. Sin el flag, el comportamiento es idéntico
   al de siempre. Se activa DESPUÉS de window.onload — nunca antes, o
   seedInitialData() revienta al arrancar una base vacía. */
function _assertWritable(op, store){
  if (typeof window !== 'undefined' && window.__TSC_READONLY__){
    throw new Error(`[TSC readonly] Escritura bloqueada: ${op} en "${store}".`);
  }
}

/* ------------------------------------------------------------
   TEMPORADAS ARCHIVADAS (D8, MS-5.15)
   ------------------------------------------------------------
   Una temporada finalizada pasa a un archivo fijo del repo
   (data/temporadas/<número>.json, generado por scripts/season-archive.mjs)
   y sus documentos se borran de Firestore (MS-5.16). Al arrancar se carga
   el índice y cada archivo; dbGetAll / dbGet / dbSubscribe suman esas filas
   a las de Firestore (si un registro está en los dos lados, gana el
   archivo), así que todas las pantallas la ven sin cambiar su código.
   Es de solo lectura para todos: cualquier escritura sobre un registro
   archivado, o un registro nuevo que cuelgue de una temporada archivada,
   lanza un error con code 'archived'. La APK baja del hosting el índice y
   los archivos que no trae en su paquete. */
const ARCHIVE_STORES = ['competitions','phases','matches','matchHistory','coins','sorteo','sorteoEvents','calDayLabels'];
// Colecciones donde `season` es el número de temporada (en `teams` es un 1
// fijo y en `palmares` una etiqueta de texto: no cuentan).
const _ARCH_SEASON_FIELD = new Set(['competitions','matches','coins','sorteo','sorteoEvents','calDayLabels']);
const _ARCH_REMOTE = 'https://teamsubscup.web.app/data/temporadas/';
const _ARCH = { numbers:new Set(), keys:new Set(), rows:{}, compIds:new Set(), phaseIds:new Set(), seasons:[], error:null };

function _archNative(){
  return !!(typeof window!=='undefined' && window.Capacitor && typeof window.Capacitor.isNativePlatform==='function' && window.Capacitor.isNativePlatform());
}
function _archFreeze(o){
  if(o && typeof o==='object' && !Object.isFrozen(o)){ Object.values(o).forEach(_archFreeze); Object.freeze(o); }
  return o;
}
/* Lee un archivo de data/temporadas. remoteFirst (índice en la APK): primero
   el hosting, que trae las temporadas archivadas después del build. null si
   no existe (404) en ningún lado; lanza si no se pudo leer. */
async function _archFetchJSON(file, remoteFirst){
  const local = 'data/temporadas/'+file;
  const urls = !_archNative() ? [local] : (remoteFirst ? [_ARCH_REMOTE+file, local] : [local, _ARCH_REMOTE+file]);
  let lastErr = null, notFound = 0;
  for(const url of urls){
    try{
      const res = await fetch(url, { cache:'no-cache' });
      if(res.status===404){ notFound++; continue; }
      if(!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
      return await res.json();
    }catch(err){ lastErr = err; }
  }
  if(notFound===urls.length) return null;
  throw lastErr || new Error('No se pudo leer '+file);
}

async function _archLoad(){
  try{
    const index = await _archFetchJSON('index.json', true);
    if(!index) return;   // todavía no hay temporadas archivadas
    if(index.format!=='tsc-season-archive-index' || !Array.isArray(index.seasons)) throw new Error('índice de temporadas archivadas inválido');
    for(const entry of index.seasons){
      const arch = await _archFetchJSON(entry.file, false);
      if(!arch) throw new Error(`falta ${entry.file}`);
      if(arch.format!=='tsc-season-archive' || arch.season?.number!==entry.number) throw new Error(`${entry.file} no corresponde a la temporada ${entry.number}`);
      for(const st of ARCHIVE_STORES){
        const rows = arch.stores?.[st] || [];
        if(rows.length!==arch.counts?.[st]) throw new Error(`${entry.file}: ${st} tiene ${rows.length} y el archivo declara ${arch.counts?.[st]}`);
      }
      _archAdd(arch);
    }
  }catch(err){
    _ARCH.error = err;
    console.error('[db] temporadas archivadas:', err);
  }
}

function _archAdd(arch){
  const n = arch.season.number;
  _ARCH.numbers.add(n);
  const seasonRow = _archFreeze({ ...arch.season, status:'finished', archived:true });
  (_ARCH.rows.seasons ||= []).push(seasonRow);
  _ARCH.keys.add('seasons/'+seasonRow.id);
  _ARCH.seasons.push({ number:n, name:arch.season.name, generatedAt:arch.generatedAt, teamsAtClose:arch.teamsAtClose||[] });
  for(const st of ARCHIVE_STORES){
    for(const r of (arch.stores[st]||[])){
      (_ARCH.rows[st] ||= []).push(_archFreeze(r));
      _ARCH.keys.add(st+'/'+r.id);
      if(st==='competitions') _ARCH.compIds.add(r.id);
      if(st==='phases') _ARCH.phaseIds.add(r.id);
    }
  }
}

/* Filas de Firestore + filas archivadas (el archivo gana si se repite el id).
   Copia de primer nivel: las filas archivadas están congeladas. */
function _archMergeRows(store, rows){
  const arch = _ARCH.rows[store];
  if(!arch || !arch.length) return rows;
  const out = rows.filter(r=>!_ARCH.keys.has(store+'/'+r.id));
  for(const r of arch) out.push({ ...r });
  // Mismo orden que Firestore (id como texto: "1009" antes que "101"): hay
  // pantallas que muestran en el orden recibido, sin ordenar.
  out.sort((a,b)=>{ const x=String(a.id), y=String(b.id); return x<y?-1:x>y?1:0; });
  return out;
}

/* JSON canónico (claves ordenadas): compara registros sin depender del orden. */
function _archCanon(v){
  if(Array.isArray(v)) return '['+v.map(_archCanon).join(',')+']';
  if(v && typeof v==='object') return '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+_archCanon(v[k])).join(',')+'}';
  return JSON.stringify(v);
}

/* Lo que Firestore todavía guarda de una temporada archivada (MS-5.16).
   same: documentos idénticos a su copia del archivo (se pueden borrar);
   changed: con el mismo id pero distintos; extra: de esa temporada y que no
   están en el archivo (creados después de generarlo). Si changed o extra no
   están vacíos, no se borra nada: hay que regenerar el archivo. */
async function dbArchivedSeasonLiveCheck(number){
  number = Number(number);
  if(!_ARCH.numbers.has(number)) throw new Error('Esa temporada no está archivada');
  const byKey = new Map();
  for(const st of ARCHIVE_STORES) (_ARCH.rows[st]||[]).forEach(r=>byKey.set(st+'/'+r.id, r));
  const out = { same:[], changed:[], extra:[] };
  for(const st of ARCHIVE_STORES){
    const live = await dbGetAllLive(st);
    for(const r of live){
      const arch = byKey.get(st+'/'+r.id);
      if(arch){
        if(!_archOfSeason(st, arch, number)) continue;   // de otra temporada archivada
        (_archCanon(arch)===_archCanon(r) ? out.same : out.changed).push({ store:st, row:r });
      } else if(_archBlocked(st, r) && _archOfSeason(st, r, number)){
        out.extra.push({ store:st, row:r });
      }
    }
  }
  return out;
}
function _archOfSeason(store, r, number){
  if(_ARCH_SEASON_FIELD.has(store)) return r.season===number;
  if(store==='matchHistory') return r.seasonRef===number || _ARCH.keys.has('matches/'+r.matchRef);
  return true;   // phases: cuelgan de competiciones archivadas
}

/* Borra de Firestore los documentos de una temporada archivada que son
   idénticos al archivo (dbArchivedSeasonLiveCheck), en lotes, y anota la
   temporada en archive/seasons para que las reglas rechacen escrituras
   nuevas con ese número. No pasa por _archGuard a propósito: es la única
   escritura permitida sobre lo archivado. Si se corta a mitad, la app sigue
   mostrando la temporada completa desde el archivo; se puede reintentar. */
async function dbPurgeArchivedSeason(number, check){
  _assertWritable('dbPurgeArchivedSeason', 'archive');
  number = Number(number);
  if(check.changed.length || check.extra.length) throw new Error('El archivo no coincide con Firestore: regenera el archivo antes de borrar');
  const rows = check.same;
  for(let i=0;i<rows.length;i+=DB_BATCH_MAX){
    const batch = db.batch();
    rows.slice(i, i+DB_BATCH_MAX).forEach(({store,row})=>batch.delete(db.collection(store).doc(String(row.id))));
    await batch.commit();
  }
  // El resumen de partidos de la temporada ya no hace falta: sus partidos se
  // leen del archivo (y el cliente ignora los resúmenes archivados). Se borra
  // ANTES de anotar la temporada en archive/seasons, porque las reglas ya no
  // admiten escrituras sobre una temporada archivada.
  try { await db.collection(SUMMARY_STORE).doc(_SUMMARY_MATCH_PREFIX + number).delete(); } catch(_){}
  const ref = db.collection('archive').doc('seasons');
  const cur = (await ref.get()).data() || { numbers:[], compIds:[] };
  const numbers = [...new Set([...(cur.numbers||[]), number])].sort((a,b)=>a-b);
  const compIds = [...new Set([...(cur.compIds||[]), ...(_ARCH.rows.competitions||[]).filter(c=>c.season===number).map(c=>c.id)])].sort((a,b)=>a-b);
  await ref.set({ numbers, compIds, updatedAt:new Date().toISOString() });
  dbMirrorInvalidate(...ARCHIVE_STORES);
  return { deleted:rows.length };
}

function dbIsArchivedSeason(number){ return _ARCH.numbers.has(Number(number)); }
function dbArchiveInfo(){ return { seasons:_ARCH.seasons.slice(), error:_ARCH.error }; }

function _archBlocked(store, rec, id){
  if(!_ARCH.numbers.size) return false;
  if(id!=null && _ARCH.keys.has(store+'/'+id)) return true;
  if(!rec) return false;
  if(rec.id!=null && _ARCH.keys.has(store+'/'+rec.id)) return true;
  if(store==='seasons') return _ARCH.numbers.has(rec.number);
  if(_ARCH_SEASON_FIELD.has(store) && _ARCH.numbers.has(rec.season)) return true;
  if(store==='matchHistory' && _ARCH.numbers.has(rec.seasonRef)) return true;
  if(store==='phases' && _ARCH.compIds.has(rec.compId)) return true;
  if(store==='matches' && _ARCH.phaseIds.has(rec.phaseId)) return true;
  return false;
}
function _archGuard(op, store, rec, id){
  if(!_archBlocked(store, rec, id)) return;
  const err = new Error(`Temporada archivada: solo lectura (${op} en ${store}).`);
  err.code = 'archived';
  throw err;
}

function initDB(){
  if (!_isFS()) {
    const err = new Error('Sin conexión con el servidor (no cargó Firebase)');
    err.code = 'offline';
    return Promise.reject(err);
  }
  db = firebase.firestore();
  console.log('[db] backend: Firestore (nube) ·', FIREBASE_CONFIG.projectId);
  // Abre YA, en paralelo, los espejos de las colecciones que lee cualquier
  // visita pública (panel/palmarés/equipos/calendario). Sin esto el arranque
  // las pedía una tras otra: un viaje completo al servidor por cada una.
  // `matches` ya no: sus partidos salen del resumen por temporada (LECT,
  // SUMMARY_STORE), un documento por temporada en vez de la colección entera.
  if (_fsMirrorEnabled()) {
    ['seasons','settings','teams','competitions','phases',SUMMARY_STORE,'palmares','palmares-comps']
      .forEach(store => { try { _fsMirror(store); } catch(_){} });
  }
  return _archLoad();
}

/* Asigna el siguiente id entero de forma atómica (emula autoIncrement) */
function _fsNextId(store){
  const ref = db.collection('_counters').doc(store);
  return db.runTransaction(async tx => {
    const snap = await tx.get(ref);
    const next = ((snap.exists ? snap.data().value : 0) || 0) + 1;
    tx.set(ref, { value: next }, { merge: true });
    return next;
  });
}

/* Mantiene el contador Firestore por encima de IDs restaurados explícitamente. */
function dbEnsureCounterAtLeast(store, value){
  _assertWritable('dbEnsureCounterAtLeast', store);
  const target = Number(value);
  if (!Number.isSafeInteger(target) || target < 1) return Promise.resolve();
  const ref = db.collection('_counters').doc(store);
  return db.runTransaction(async tx => {
    const snap = await tx.get(ref);
    const current = (snap.exists ? Number(snap.data().value) : 0) || 0;
    if (current < target) tx.set(ref, { value: target }, { merge: true });
  });
}

/* ------------------------------------------------------------
   ESPEJO EN MEMORIA
   ------------------------------------------------------------
   Antes, CADA dbGetAll() era un viaje de ida y vuelta al servidor
   (Firestore está en Santiago): recorrer las páginas públicas hacía
   ~5.000 lecturas, ~2.500 solo en Equipos (mismas colecciones pedidas
   una vez por equipo). Desde Perú cada viaje cuesta bastante más que
   desde Chile, y se acumulaba.

   Ahora la primera lectura de una colección abre un onSnapshot y espera
   el primer snapshot CONFIRMADO por el servidor (nunca caché vieja); las
   siguientes salen de memoria al instante. El listener mantiene el espejo
   al día con los cambios de cualquier dispositivo y con las escrituras
   propias (dbPut/dbAdd/dbDelete/lotes se reflejan localmente antes de que
   su promesa resuelva). Contrato intacto: cada llamada devuelve objetos
   NUEVOS (d.data() crea uno por llamada), así que mutar el resultado no
   contamina el espejo.

   Cae a la lectura directa de siempre si: el listener falla (p.ej.
   permission-denied), no hay confirmación del servidor en 10 s (offline),
   el último snapshot viene de caché (conexión caída), o la colección se
   invalidó tras una transacción (dbMirrorInvalidate). Un espejo sin uso
   por 3 min se cierra para no pagar lecturas de cambios que nadie mira.
   Desactivable en caliente con `window.TSC_FS_MIRROR = false`. */
const _FS_MIRROR = new Map(); // store -> { snap, ready, unsub, dead, denied, staleUntil, lastUse, byId }
const _FS_MIRROR_IDLE_MS = 3 * 60 * 1000;
const _FS_MIRROR_FIRST_TIMEOUT_MS = 10000;
let _fsMirrorSweepTimer = null;
let _fsMirrorAuthHooked = false;

function _fsMirrorEnabled(){
  return typeof window === 'undefined' || window.TSC_FS_MIRROR !== false;
}

function _fsMirrorDrop(store, m){
  if (_FS_MIRROR.get(store) !== m) return;
  _FS_MIRROR.delete(store);
  try { m.unsub && m.unsub(); } catch(_){}
}

function _fsMirrorSweep(){
  const now = Date.now();
  for (const [store, m] of _FS_MIRROR) {
    if (m.subs.size) continue; // una vista suscrita (dbSubscribe) lo mantiene vivo
    if (now - m.lastUse > _FS_MIRROR_IDLE_MS) _fsMirrorDrop(store, m);
  }
  if (!_FS_MIRROR.size) { clearInterval(_fsMirrorSweepTimer); _fsMirrorSweepTimer = null; }
}

function _fsMirror(store){
  const existing = _FS_MIRROR.get(store);
  // `denied` se conserva (muerto) para no reabrir un listener que va a volver
  // a fallar en cada llamada: dbGetAll cae a la lectura directa hasta que
  // cambie la sesión (ver onAuthStateChanged abajo).
  if (existing && (!existing.dead || existing.denied)) { existing.lastUse = Date.now(); return existing; }
  if (existing) _fsMirrorDrop(store, existing);

  // Con login/logout cambian los permisos: un espejo que murió por
  // permission-denied se descarta para reintentar con el usuario nuevo.
  if (!_fsMirrorAuthHooked && typeof firebase !== 'undefined' && firebase.auth) {
    _fsMirrorAuthHooked = true;
    try {
      firebase.auth().onAuthStateChanged(() => {
        for (const [s, m] of _FS_MIRROR) if (m.dead) _fsMirrorDrop(s, m);
      });
    } catch(_){}
  }

  // `synced`: llegó al menos un snapshot del servidor (el espejo está completo,
  // aunque ahora venga de caché). `subs`: callbacks de dbSubscribe que
  // comparten este listener en vez de abrir otro (MS-2.5).
  const m = { snap: null, ready: null, unsub: null, dead: false, denied: false, synced: false, staleUntil: 0, lastUse: Date.now(), byId: null, subs: new Set() };
  m.ready = new Promise((resolve, reject) => {
    let settled = false;
    // El timeout solo destraba la PRIMERA lectura (cae a la directa); el
    // listener sigue abierto y el espejo se usa en cuanto llegue el servidor.
    // Antes lo marcaba muerto: cada dbGetAll siguiente abría otro listener
    // (otra lectura completa) y volvía a esperar 10 s (MS-2.5).
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new Error('sin confirmación del servidor'));
    }, _FS_MIRROR_FIRST_TIMEOUT_MS);
    m.unsub = db.collection(store).onSnapshot({ includeMetadataChanges: true }, snap => {
      m.snap = snap;
      m.byId = null;
      if (!snap.metadata.fromCache) { m.staleUntil = 0; m.synced = true; }
      if (!settled && !snap.metadata.fromCache) { settled = true; clearTimeout(timer); resolve(); }
      m.subs.forEach(fn => { try { fn(snap); } catch (e) { console.error('[db] dbSubscribe ' + store + ':', e); } });
    }, err => {
      m.dead = true;
      m.denied = err?.code === 'permission-denied';
      clearTimeout(timer);
      if (!settled) { settled = true; reject(err); }
      console.warn('[db] espejo ' + store + ':', err?.code || err?.message);
      if (!m.denied) _fsMirrorDrop(store, m);
    });
  });
  m.ready.catch(() => {});
  _FS_MIRROR.set(store, m);
  if (!_fsMirrorSweepTimer) _fsMirrorSweepTimer = setInterval(_fsMirrorSweep, 60 * 1000);
  return m;
}

/* Snapshot fresco del espejo, o null si hay que leer directo del servidor. */
function _fsMirrorFresh(m){
  if (!m || m.dead || !m.snap || m.snap.metadata.fromCache || Date.now() < m.staleUntil) return null;
  return m.snap;
}

/* Fuerza a que las lecturas de estas colecciones vayan directo al servidor
   hasta que el listener entregue un snapshot nuevo, o 2 s como máximo (si
   la transacción no cambió nada, no llega ningún snapshot). Para usar
   tras db.runTransaction(): a diferencia de set()/batch, una transacción no
   se refleja localmente antes de resolver, así que el espejo podría ir
   unos milisegundos atrasado justo después. */
function dbMirrorInvalidate(...stores){
  stores.forEach(store => {
    const m = _FS_MIRROR.get(store);
    if (m) m.staleUntil = Date.now() + 2000;
  });
}

/* Lectura directa, SIEMPRE del servidor. Sin conexión, get() normal devuelve
   lo que haya en la caché aunque esté vacía o incompleta, y se tomaba como
   dato real (p. ej. el próximo id de matchHistory saldría repetido). Ahora:
   si el servidor no responde y el espejo llegó a sincronizarse, se usa su
   última copia completa (vieja, con aviso); si nunca se sincronizó, lanza. */
function _fsGetAllDirect(store, filter, m){
  return db.collection(store).get({ source: 'server' }).then(snap => snap.docs, err => {
    if (m && m.synced && m.snap) {
      console.warn('[db] ' + store + ': sin servidor, uso la última copia del espejo');
      return m.snap.docs;
    }
    throw err;
  }).then(docs => {
    let result = docs.map(d=>d.data());
    if(filter) result = result.filter(filter);
    return result;
  });
}

/* Solo Firestore, sin las temporadas archivadas: para export, import y todo
   lo que necesita lo que vive en la base. */
function dbGetAllLive(store, filter){
  if (!_fsMirrorEnabled()) return _fsGetAllDirect(store, filter);
  const m = _fsMirror(store);
  // Si la primera espera venció, igual se mira el espejo: puede haber
  // llegado el snapshot del servidor después del timeout.
  return m.ready.then(() => _fsMirrorFresh(m), () => _fsMirrorFresh(m)).then(snap => {
    if (!snap) return _fsGetAllDirect(store, filter, m);
    let result = snap.docs.map(d=>d.data());
    if(filter) result = result.filter(filter);
    return result;
  });
}

/* ------------------------------------------------------------
   RESUMEN DE PARTIDOS POR TEMPORADA (LECT)
   ------------------------------------------------------------
   `resumenes/matches_<temporada>` = {
     season, count, updatedAt,
     items:     { "<id de partido>": {...partido...} },   // mapa, nunca lista
     historial: { "<id de partido>": {id, createdAt} },   // registro de matchHistory
   }
   Lo mantiene la Cloud Function `onMatchWritten`
   (functions/lib/matchSummary.js): editar, agregar o borrar un partido solo
   toca su entrada. El cliente lee UN documento por temporada no archivada en
   vez de la colección `matches` entera, y devuelve exactamente los mismos
   objetos que antes (el mapa se aplana en una lista con el mismo orden que
   Firestore: id como texto).
   `historial` guarda el id del registro de historial de cada partido para que
   el Historial (js/history.js) siga saliendo idéntico —mismos ids y mismo
   orden— sin leer `matchHistory` entera.
   Si el resumen no existe o falla, `dbGetAll('matches')` cae a la lectura
   actual de la colección: nunca devuelve datos vacíos por un resumen ausente. */
const SUMMARY_STORE = 'resumenes';
const _SUMMARY_MATCH_PREFIX = 'matches_';
const _SUMMARY_OVERLAY_TTL_MS = 15 * 60 * 1000;
/* Escrituras de partidos hechas por este cliente que el resumen todavía no
   refleja (la Function tarda uno o dos segundos). Sin esto, una lectura
   inmediata después de guardar un resultado (propagación de bracket, tabla de
   posiciones, re-render del panel) vería el valor viejo. Cada entrada se
   descarta sola cuando el resumen ya trae el mismo contenido, o al vencer el
   TTL si la Function no llegó a correr. */
const _SUMMARY_MATCH_WRITES = new Map(); // "id" -> { data:{...}|null, at }

/* Anota una escritura (o un borrado, data=null) de `matches` de este cliente. */
function _summaryNoteMatchWrite(id, data){
  if(id == null) return;
  _SUMMARY_MATCH_WRITES.set(String(id), { data: data ? {...data} : null, at: Date.now() });
}

/* Snapshot fresco del espejo del resumen, o null si hay que caer a la
   lectura de la colección (sin confirmación del servidor, sin conexión…). */
function _summarySnap(){
  const m = _fsMirror(SUMMARY_STORE);
  return m.ready.then(()=>_fsMirrorFresh(m), ()=>_fsMirrorFresh(m));
}

/* Aplana los documentos del resumen en la lista de partidos, salteando las
   temporadas archivadas (esas filas las suma dbGetAll desde el archivo). */
function _summaryMatchRows(snap){
  const rows = [];
  const byId = new Map();
  for(const doc of snap.docs){
    const s = doc.data() || {};
    const season = Number(s.season);
    if(Number.isFinite(season) && season > 0 && _ARCH.numbers.has(season)) continue;
    const items = s.items;
    if(!items || typeof items !== 'object') continue;
    for(const k of Object.keys(items)){
      const m = items[k];
      if(!m || typeof m !== 'object') continue;
      const copy = { ...m };
      rows.push(copy);
      byId.set(String(copy.id != null ? copy.id : k), copy);
    }
  }
  // Overlay: primero descartar lo que el resumen ya refleja, después aplicar
  // lo que falta (ver _SUMMARY_MATCH_WRITES).
  const now = Date.now();
  for(const [id, o] of _SUMMARY_MATCH_WRITES){
    if(now - o.at > _SUMMARY_OVERLAY_TTL_MS){ _SUMMARY_MATCH_WRITES.delete(id); continue; }
    const cur = byId.get(id);
    if(o.data == null){ if(!cur) _SUMMARY_MATCH_WRITES.delete(id); continue; }
    if(cur && _archCanon(cur) === _archCanon(o.data)) _SUMMARY_MATCH_WRITES.delete(id);
  }
  let out = rows;
  for(const [id, o] of _SUMMARY_MATCH_WRITES){
    const has = out.some(r=>String(r.id) === id);
    if(o.data == null){ if(has) out = out.filter(r=>String(r.id) !== id); continue; }
    out = has ? out.map(r=>String(r.id) === id ? {...o.data} : r) : [...out, {...o.data}];
  }
  // Mismo orden que el Firestore de siempre (id como texto; hay pantallas que
  // muestran en el orden recibido).
  out.sort((a,b)=>{ const x=String(a.id), y=String(b.id); return x<y?-1:x>y?1:0; });
  return out;
}

async function _matchesGetAll(filter){
  let rows = null;
  if(_fsMirrorEnabled()){
    const snap = await _summarySnap();
    if(snap && snap.size > 0) rows = _summaryMatchRows(snap);
  }
  if(rows == null){
    // Sin resumen: la lectura de siempre (con su espejo) y el overlay encima.
    rows = await dbGetAllLive('matches');
    if(_SUMMARY_MATCH_WRITES.size){
      const byId = new Map(rows.map(r=>[String(r.id), r]));
      const now = Date.now();
      for(const [id, o] of _SUMMARY_MATCH_WRITES){
        if(now - o.at > _SUMMARY_OVERLAY_TTL_MS) continue;
        if(o.data == null){ if(byId.has(id)) byId.delete(id); }
        else byId.set(id, {...o.data});
      }
      rows = [...byId.values()];
    }
  }
  const all = _archMergeRows('matches', rows);
  return filter ? all.filter(filter) : all;
}

/* Suscripción en tiempo real a `matches` sobre el espejo del resumen: un
   listener sobre esos documentos (1 lectura por temporada) en vez de la
   colección entera. Si el resumen no existe todavía, se comparte el espejo de
   la colección (el mismo que usa dbGetAll, así se lee UNA vez) y se cambia al
   resumen en cuanto aparece. */
function _matchesSubscribe(filter, cb){
  let prevJSON = null;
  const deliver = rows => {
    let result = _archMergeRows('matches', rows);
    if(filter) result = result.filter(filter);
    const json = JSON.stringify(result);
    if(json === prevJSON) return;
    prevJSON = json;
    cb(result);
  };
  const onCollection = snap => deliver(snap.docs.map(d=>d.data()));
  if(!_fsMirrorEnabled()){
    return db.collection('matches').onSnapshot(onCollection,
      err => console.warn('[db] onSnapshot matches:', err.code||err.message));
  }
  const m = _fsMirror(SUMMARY_STORE);
  let colMirror = null;
  const stopCol = ()=>{
    if(!colMirror) return;
    colMirror.subs.delete(onCollection);
    colMirror = null;
  };
  const startCol = ()=>{
    if(colMirror) return;
    // Espejo compartido de la colección: el mismo que abre dbGetAll('matches')
    // cuando no hay resumen, para no leerla dos veces.
    colMirror = _fsMirror('matches');
    colMirror.subs.add(onCollection);
    if(colMirror.snap) Promise.resolve().then(()=>{ if(colMirror && colMirror.subs.has(onCollection)) onCollection(colMirror.snap); });
  };
  const onSummary = snap => {
    if(!snap || !snap.size){ startCol(); return; }   // sin resumen: lectura de siempre
    stopCol();
    deliver(_summaryMatchRows(snap));
  };
  m.subs.add(onSummary);
  if(m.snap) Promise.resolve().then(()=>{ if(m.subs.has(onSummary)) onSummary(m.snap); });
  // Si el listener del resumen no se puede abrir (p. ej. reglas todavía sin
  // desplegar), se sigue con el de la colección: la vista en vivo no se queda
  // muda mientras el resumen no esté disponible.
  if(m.dead) startCol();
  else m.ready.catch(()=>{ if(m.subs.has(onSummary)) startCol(); });
  return ()=>{ m.subs.delete(onSummary); m.lastUse = Date.now(); stopCol(); };
}

/* { "<id de partido>": {id, createdAt} } con los ids de los registros de
   historial, tomados del resumen. null si el resumen no está disponible: en
   ese caso el Historial usa la lectura de siempre de `matchHistory` (LECT §3). */
async function dbMatchHistoryMeta(){
  if(!_fsMirrorEnabled()) return null;
  const snap = await _summarySnap();
  if(!snap || !snap.size) return null;
  const out = {};
  for(const doc of snap.docs){
    const s = doc.data() || {};
    const season = Number(s.season);
    if(Number.isFinite(season) && season > 0 && _ARCH.numbers.has(season)) continue;
    const hist = s.historial;
    if(!hist || typeof hist !== 'object') continue;
    for(const k of Object.keys(hist)){
      const v = hist[k];
      if(v && typeof v === 'object' && v.id != null) out[k] = { id: Number(v.id), createdAt: v.createdAt ?? null };
    }
  }
  return out;
}

/* Filas de una colección que vienen del archivo de temporadas archivadas,
   sin tocar Firestore. Para pantallas que ya no leen la colección entera y
   solo necesitan lo archivado (Historial, LECT §3). */
function dbArchivedRows(store){
  return (_ARCH.rows[store] || []).map(r=>({ ...r }));
}

function dbGetAll(store, filter){
  // Partidos: del resumen por temporada (1 lectura por temporada), no de la
  // colección entera. Si el resumen no existe o falla, cae a la lectura de
  // siempre (nunca a datos vacíos). LECT §2.
  if (store === 'matches') return _matchesGetAll(filter);
  if(!_ARCH.rows[store]) return dbGetAllLive(store, filter);
  return dbGetAllLive(store).then(rows=>{
    const all = _archMergeRows(store, rows);
    return filter ? all.filter(filter) : all;
  });
}


function dbGet(store, id){
  if(_ARCH.keys.has(store+'/'+id)){
    const r = _ARCH.rows[store].find(x=>String(x.id)===String(id));
    return Promise.resolve(r ? { ...r } : undefined);
  }
  // Solo usa el espejo si la colección ya está espejada y fresca: un get
  // suelto no justifica suscribirse a la colección entera.
  const snap = _fsMirrorEnabled() ? _fsMirrorFresh(_FS_MIRROR.get(store)) : null;
  if (snap) {
    const m = _FS_MIRROR.get(store);
    m.lastUse = Date.now();
    if (!m.byId) m.byId = new Map(snap.docs.map(d => [d.id, d]));
    const doc = m.byId.get(String(id));
    return Promise.resolve(doc ? doc.data() : undefined);
  }
  return db.collection(store).doc(String(id)).get()
    .then(snap => snap.exists ? snap.data() : undefined);
}

async function dbAdd(store, data){
  _assertWritable('dbAdd', store);
  _archGuard('dbAdd', store, data);
  const id = await _fsNextId(store);
  await db.collection(store).doc(String(id)).set({ ...data, id });
  if(store === 'matches') _summaryNoteMatchWrite(id, { ...data, id });
  return id;
}

/* Reserva n IDs consecutivos en UNA sola transacción (bloque para dbAddMany) */
function _fsReserveIds(store, n){
  const ref = db.collection('_counters').doc(store);
  return db.runTransaction(async tx => {
    const snap = await tx.get(ref);
    const base = ((snap.exists ? snap.data().value : 0) || 0);
    tx.set(ref, { value: base + n }, { merge: true });
    return Array.from({length:n}, (_,i)=>base+1+i);
  });
}

/* Inserta N registros de una vez. Misma semántica que dbAdd, pero en lote:
   1 transacción reserva el bloque de IDs + writeBatch (límite 500 ops).
   Devuelve los IDs asignados en el mismo orden que `items`. */
async function dbAddMany(store, items){
  _assertWritable('dbAddMany', store);
  if(!Array.isArray(items) || !items.length) return [];
  items.forEach(it=>_archGuard('dbAddMany', store, it));
  const ids = await _fsReserveIds(store, items.length);
  for(let i=0;i<items.length;i+=450){
    const chunk = items.slice(i, i+450);
    const batch = db.batch();
    chunk.forEach((data,j)=>{
      const id = ids[i+j];
      batch.set(db.collection(store).doc(String(id)), {...data, id});
      if(store === 'matches') _summaryNoteMatchWrite(id, {...data, id});
    });
    await batch.commit();
  }
  return ids;
}

/* Borra N registros de una vez (mismo criterio de lote que dbAddMany). */
async function dbDeleteMany(store, ids){
  _assertWritable('dbDeleteMany', store);
  if(!Array.isArray(ids) || !ids.length) return;
  ids.forEach(id=>_archGuard('dbDeleteMany', store, null, id));
  for(let i=0;i<ids.length;i+=450){
    const batch = db.batch();
    ids.slice(i, i+450).forEach(id=>batch.delete(db.collection(store).doc(String(id))));
    await batch.commit();
  }
  if(store === 'matches') ids.forEach(id=>_summaryNoteMatchWrite(id, null));
}

/* Varias escrituras, de una o más colecciones, como UNA operación atómica:
   o se aplican todas o ninguna (H-53). Antes, guardar una fecha escribía
   partido por partido y un corte a mitad dejaba la fecha a medias.
   ops: { type:'set', store, data }   (data.id obligatorio; reemplaza el doc)
        { type:'add', store, data }   (id nuevo; se devuelve en orden)
        { type:'delete', store, id }
   Los ids de las altas se reservan antes (una transacción por colección;
   si el lote falla, esos números quedan sin usar, como con dbAddMany) y
   todo va en un solo writeBatch, que admite hasta 500 operaciones: un lote
   más grande se rechaza en vez de partirlo, porque partido ya no sería
   atómico. */
const DB_BATCH_MAX = 500;

/* Reserva n ids nuevos de `store` sin escribir nada, para armar un lote con
   `set` cuando hace falta conocer el id antes del commit (p. ej. el
   matchHistory de un partido nuevo apunta a su id: MS-5.7). */
async function dbNewIds(store, n){
  if(!(n > 0)) return [];
  return _fsReserveIds(store, n);
}
async function dbWriteBatch(ops){
  if(!Array.isArray(ops) || !ops.length) return [];
  ops.forEach(o => _assertWritable('dbWriteBatch', o.store));
  ops.forEach(o => _archGuard('dbWriteBatch', o.store, o.type==='delete' ? null : o.data, o.type==='delete' ? o.id : null));
  if(ops.length > DB_BATCH_MAX) throw new Error(`Lote de ${ops.length} escrituras: el máximo atómico es ${DB_BATCH_MAX}`);
  const addsByStore = {};
  ops.forEach(o => { if(o.type==='add') addsByStore[o.store] = (addsByStore[o.store]||0) + 1; });
  const reserved = {};
  for(const [store, n] of Object.entries(addsByStore)) reserved[store] = await _fsReserveIds(store, n);
  const batch = db.batch();
  const newIds = [];
  for(const o of ops){
    if(o.type==='delete'){
      batch.delete(db.collection(o.store).doc(String(o.id)));
      if(o.store === 'matches') _summaryNoteMatchWrite(o.id, null);
      continue;
    }
    let id;
    if(o.type==='add') { id = reserved[o.store].shift(); newIds.push(id); }
    else if(o.type==='set') {
      id = o.data?.id;
      if(id == null) throw new Error(`dbWriteBatch: set en ${o.store} sin id`);
    } else throw new Error(`dbWriteBatch: tipo desconocido ${o.type}`);
    batch.set(db.collection(o.store).doc(String(id)), { ...o.data, id });
    if(o.store === 'matches') _summaryNoteMatchWrite(id, { ...o.data, id });
  }
  await batch.commit();
  return newIds;
}

async function dbPut(store, data){
  _assertWritable('dbPut', store);
  _archGuard('dbPut', store, data);
  let id = data.id;
  if (id == null) id = await _fsNextId(store); // por si llaman put sin id
  await db.collection(store).doc(String(id)).set({ ...data, id });
  if(store === 'matches') _summaryNoteMatchWrite(id, { ...data, id });
  return id;
}

function dbDelete(store, id){
  _assertWritable('dbDelete', store);
  _archGuard('dbDelete', store, null, id);
  return db.collection(store).doc(String(id)).delete().then(()=>{
    if(store === 'matches') _summaryNoteMatchWrite(id, null);
  });
}

/* Suscripción en tiempo real (Fase 6A).
   Usa onSnapshot → llama cb(result) ante cada cambio. SIEMPRE devuelve
   una función para cancelar la suscripción (unsubscribe). */
function dbSubscribe(store, filter, cb){
  if(store === 'matches') return _matchesSubscribe(filter, cb);
  // Dedupe por snapshot: si el canal "Listen" está bloqueado/inestable (p.ej.
  // un bloqueador de contenido devolviendo net::ERR_BLOCKED_BY_CLIENT), el SDK
  // reintenta la conexión en segundo plano y cada reintento puede entregar un
  // snapshot desde caché AUNQUE los datos no cambiaron — sin este chequeo, cada
  // reintento dispara un re-render completo (reinicia animaciones de conteo,
  // remonta el chibi del Sorteo) sin que el usuario haya hecho nada ni haya un
  // cambio real. Comparar el JSON contra el snapshot anterior evita eso: solo
  // se llama a `cb` cuando el contenido realmente difiere.
  let prevJSON = null;
  const deliver = snap => {
    let result = _archMergeRows(store, snap.docs.map(d=>d.data()));
    if(filter) result = result.filter(filter);
    const json = JSON.stringify(result);
    if(json === prevJSON) return;
    prevJSON = json;
    cb(result);
  };
  if (!_fsMirrorEnabled()) {
    return db.collection(store).onSnapshot(deliver,
      err => console.warn('[db] onSnapshot '+store+':', err.code||err.message));
  }
  // Comparte el listener del espejo: antes abría uno propio y la colección
  // se leía entera DOS veces por visita (teams, palmares, settings,
  // sorteo…; MS-2.5). Si el espejo ya tiene datos, entrega el estado
  // actual como primer snapshot, igual que un onSnapshot nuevo.
  const m = _fsMirror(store);
  m.subs.add(deliver);
  if (m.snap) Promise.resolve().then(() => { if (m.subs.has(deliver)) deliver(m.snap); });
  return () => { m.subs.delete(deliver); m.lastUse = Date.now(); };
}

/* Helpers con filtro por temporada */
/* `teams` es un plantel global (todas las altas guardan season:1 fijo): si se
   filtrara por temporada, desde la T2 en adelante el dashboard, el calendario,
   el bracket y la asignación a grupos verían 0 equipos. */
function getForSeason(store){
  if(store==='teams') return dbGetAll(store);
  return dbGetAll(store, r=>r.season===STATE.season||!r.season);
}

/* Texto corto para un toast a partir de un error de escritura/lectura. El
   mensaje crudo de un rechazo de reglas repite «evaluation error…» una vez
   por documento del lote (cientos de líneas en un borrado en cascada). */
function dbErrorMsg(err){
  const code = err?.code || '';
  if(code==='archived') return 'Temporada archivada: es de solo lectura (sus datos viven en un archivo fijo).';
  if(code==='permission-denied' || /PERMISSION_DENIED/.test(err?.message||''))
    return 'Sin permiso: solo un administrador puede hacer esto.';
  if(code==='unavailable' || code==='offline') return 'Sin conexión con el servidor. Inténtalo de nuevo.';
  const msg = String(err?.message || err || 'Error desconocido');
  return msg.length > 160 ? msg.slice(0,160)+'…' : msg;
}

/* Helper para obtener el nombre de la temporada (custom name o T{número}) */
function getSeasonName(seasonObj){
  return seasonObj?.name || `T${seasonObj?.number}`;
}
