'use strict';
/* ============================================================
   CAPA DE DATOS — IndexedDB (local) o Firestore (nube)
   ------------------------------------------------------------
   El backend se elige según USE_FIRESTORE (definido en
   firebase-config.js). Las 6 funciones (dbGetAll/dbGet/dbAdd/
   dbPut/dbDelete + getForSeason) tienen FIRMAS IDÉNTICAS en
   ambos backends, así que el resto de la app no cambia.

   IDs: en Firestore se preservan los enteros autoincrementales
   (mismo contrato que IndexedDB) usando un documento contador
   por colección en _counters/{store}.
   ============================================================ */

/* `db` ya está declarado en state.js (IDBDatabase local | Firestore nube) */

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

function initDB(){
  if (_isFS()) {
    db = firebase.firestore();
    console.log('[db] backend: Firestore (nube) ·', FIREBASE_CONFIG.projectId);
    // Abre YA, en paralelo, los espejos de las colecciones que lee cualquier
    // visita pública (panel/palmarés/equipos/calendario). Sin esto el arranque
    // las pedía una tras otra: un viaje completo al servidor por cada una.
    if (_fsMirrorEnabled()) {
      ['seasons','settings','teams','competitions','phases','matches','palmares','palmares-comps']
        .forEach(store => { try { _fsMirror(store); } catch(_){} });
    }
    return Promise.resolve();
  }
  // ---------- IndexedDB (local) ----------
  return new Promise((res,rej)=>{
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onerror = ()=>rej(req.error);
    req.onsuccess = ()=>{ db=req.result; res(); };
    req.onupgradeneeded = (e)=>{
      const idb = e.target.result;
      STORES.forEach(s=>{
        if(!idb.objectStoreNames.contains(s))
          idb.createObjectStore(s,{keyPath:'id',autoIncrement:true});
      });
    };
  });
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

/* Mantiene el contador Firestore por encima de IDs restaurados explícitamente.
   IndexedDB ajusta su key generator automáticamente al hacer put(id). */
function dbEnsureCounterAtLeast(store, value){
  _assertWritable('dbEnsureCounterAtLeast', store);
  if (!_isFS()) return Promise.resolve();
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
   ESPEJO EN MEMORIA (solo Firestore)
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

function dbGetAll(store, filter){
  if (_isFS()) {
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
  return new Promise((res,rej)=>{
    const tx  = db.transaction(store,'readonly');
    const req = tx.objectStore(store).getAll();
    req.onsuccess = ()=>{
      let result = req.result;
      if(filter) result = result.filter(filter);
      res(result);
    };
    req.onerror = ()=>rej(req.error);
  });
}

function dbGet(store, id){
  if (_isFS()) {
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
  return new Promise((res,rej)=>{
    const tx  = db.transaction(store,'readonly');
    const req = tx.objectStore(store).get(id);
    req.onsuccess = ()=>res(req.result);
    req.onerror = ()=>rej(req.error);
  });
}

async function dbAdd(store, data){
  _assertWritable('dbAdd', store);
  if (_isFS()) {
    const id = await _fsNextId(store);
    await db.collection(store).doc(String(id)).set({ ...data, id });
    return id;
  }
  return new Promise((res,rej)=>{
    const tx  = db.transaction(store,'readwrite');
    const req = tx.objectStore(store).add({...data});
    req.onsuccess = ()=>res(req.result);
    req.onerror = ()=>rej(req.error);
  });
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
   - Firestore: 1 transacción reserva el bloque de IDs + writeBatch (límite 500 ops).
   - IndexedDB: una sola transacción readwrite.
   Devuelve los IDs asignados en el mismo orden que `items`. */
async function dbAddMany(store, items){
  _assertWritable('dbAddMany', store);
  if(!Array.isArray(items) || !items.length) return [];
  if (_isFS()) {
    const ids = await _fsReserveIds(store, items.length);
    for(let i=0;i<items.length;i+=450){
      const chunk = items.slice(i, i+450);
      const batch = db.batch();
      chunk.forEach((data,j)=>{
        const id = ids[i+j];
        batch.set(db.collection(store).doc(String(id)), {...data, id});
      });
      await batch.commit();
    }
    return ids;
  }
  return new Promise((res,rej)=>{
    const tx  = db.transaction(store,'readwrite');
    const os  = tx.objectStore(store);
    const ids = [];
    items.forEach(data=>{
      const req = os.add({...data});
      req.onsuccess = ()=>ids.push(req.result);
    });
    tx.oncomplete = ()=>res(ids);
    tx.onerror    = ()=>rej(tx.error);
    tx.onabort    = ()=>rej(new Error('Transaction aborted'));
  });
}

/* Borra N registros de una vez (mismo criterio de lote que dbAddMany). */
async function dbDeleteMany(store, ids){
  _assertWritable('dbDeleteMany', store);
  if(!Array.isArray(ids) || !ids.length) return;
  if (_isFS()) {
    for(let i=0;i<ids.length;i+=450){
      const batch = db.batch();
      ids.slice(i, i+450).forEach(id=>batch.delete(db.collection(store).doc(String(id))));
      await batch.commit();
    }
    return;
  }
  return new Promise((res,rej)=>{
    const tx = db.transaction(store,'readwrite');
    const os = tx.objectStore(store);
    ids.forEach(id=>os.delete(id));
    tx.oncomplete = ()=>res();
    tx.onerror    = ()=>rej(tx.error);
    tx.onabort    = ()=>rej(new Error('Transaction aborted'));
  });
}

async function dbPut(store, data){
  _assertWritable('dbPut', store);
  if (_isFS()) {
    let id = data.id;
    if (id == null) id = await _fsNextId(store); // por si llaman put sin id
    await db.collection(store).doc(String(id)).set({ ...data, id });
    return id;
  }
  return new Promise((res,rej)=>{
    const tx  = db.transaction(store,'readwrite');
    const req = tx.objectStore(store).put({...data});
    req.onsuccess = ()=>res(req.result);
    req.onerror = ()=>rej(req.error);
  });
}

function dbDelete(store, id){
  _assertWritable('dbDelete', store);
  if (_isFS()) {
    return db.collection(store).doc(String(id)).delete();
  }
  return new Promise((res,rej)=>{
    const tx = db.transaction(store,'readwrite');
    tx.objectStore(store).delete(id);
    tx.oncomplete = ()=>res();
    tx.onerror    = ()=>rej(tx.error);
    tx.onabort    = ()=>rej(new Error('Transaction aborted'));
  });
}

/* Suscripción en tiempo real (Fase 6A).
   En Firestore usa onSnapshot → llama cb(result) ante cada cambio.
   En IndexedDB no hay reactividad → no-op. SIEMPRE devuelve una
   función para cancelar la suscripción (unsubscribe). */
function dbSubscribe(store, filter, cb){
  if (_isFS()) {
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
      let result = snap.docs.map(d=>d.data());
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
  return ()=>{}; // IndexedDB local: sin tiempo real
}

/* Helpers con filtro por temporada */
function getForSeason(store){ return dbGetAll(store, r=>r.season===STATE.season||!r.season); }

/* Helper para obtener el nombre de la temporada (custom name o T{número}) */
function getSeasonName(seasonObj){
  return seasonObj?.name || `T${seasonObj?.number}`;
}
