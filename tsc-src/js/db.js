
function initDB(){
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

function dbGetAll(store, filter){
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
  return new Promise((res,rej)=>{
    const tx  = db.transaction(store,'readonly');
    const req = tx.objectStore(store).get(id);
    req.onsuccess = ()=>res(req.result);
    req.onerror = ()=>rej(req.error);
  });
}

function dbAdd(store, data){
  return new Promise((res,rej)=>{
    const tx  = db.transaction(store,'readwrite');
    const req = tx.objectStore(store).add({...data});
    req.onsuccess = ()=>res(req.result);
    req.onerror = ()=>rej(req.error);
  });
}

function dbPut(store, data){
  return new Promise((res,rej)=>{
    const tx  = db.transaction(store,'readwrite');
    const req = tx.objectStore(store).put({...data});
    req.onsuccess = ()=>res(req.result);
    req.onerror = ()=>rej(req.error);
  });
}

function dbDelete(store, id){
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
