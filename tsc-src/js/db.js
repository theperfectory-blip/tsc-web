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

/* Helpers con filtro por temporada */
function getForSeason(store){ return dbGetAll(store, r=>r.season===STATE.season||!r.season); }

/* Helper para obtener el nombre de la temporada (custom name o T{número}) */
function getSeasonName(seasonObj){
  return seasonObj?.name || `T${seasonObj?.number}`;
}
