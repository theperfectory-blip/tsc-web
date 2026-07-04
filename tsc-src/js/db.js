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

function initDB(){
  if (_isFS()) {
    db = firebase.firestore();
    console.log('[db] backend: Firestore (nube) ·', FIREBASE_CONFIG.projectId);
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

function dbGetAll(store, filter){
  if (_isFS()) {
    return db.collection(store).get().then(snap=>{
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

async function dbPut(store, data){
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
    return db.collection(store).onSnapshot(
      snap => {
        let result = snap.docs.map(d=>d.data());
        if(filter) result = result.filter(filter);
        const json = JSON.stringify(result);
        if(json === prevJSON) return;
        prevJSON = json;
        cb(result);
      },
      err => console.warn('[db] onSnapshot '+store+':', err.code||err.message)
    );
  }
  return ()=>{}; // IndexedDB local: sin tiempo real
}

/* Helpers con filtro por temporada */
function getForSeason(store){ return dbGetAll(store, r=>r.season===STATE.season||!r.season); }

/* Helper para obtener el nombre de la temporada (custom name o T{número}) */
function getSeasonName(seasonObj){
  return seasonObj?.name || `T${seasonObj?.number}`;
}
