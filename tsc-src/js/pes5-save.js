// Fuente del save de PES5 PC: acceso a la carpeta del juego via File System
// Access API (showDirectoryPicker), con fallback a <input type="file"> +
// descarga en navegadores sin soporte (Firefox/Safari). No descifra nada —
// eso sigue siendo trabajo de PES5_CRYPT; este modulo solo lee/escribe bytes
// crudos del archivo KONAMI-WIN32PES5OPT y maneja los backups.
//
// Decision de implementacion (no estaba 100% especificada en el macro-slice):
// el handle de carpeta se guarda en una IndexedDB propia y chica
// ('TSC_PES5_Local', store 'pes5', key 'dirHandle'), NO en la base
// compartida de la app (TSC_v4 via state.js/db.js). Motivo: db.js enruta
// dbGet/dbPut a Firestore cuando USE_FIRESTORE esta activo (que es el caso
// en este entorno — localhost pega contra produccion real), y un
// FileSystemDirectoryHandle no tiene sentido ni es serializable ahi (es un
// objeto opaco atado al navegador/dispositivo del admin). Usar una IDB
// aparte evita ese cruce y no toca STORES/DB_VER de la app.
const PES5_SAVE = (() => {
  const SAVE_FILENAME = 'KONAMI-WIN32PES5OPT';
  const BACKUP_DIR = 'backups-tsc';
  const BACKUP_KEEP = 20;
  const IDB_NAME = 'TSC_PES5_Local', IDB_VER = 1, IDB_STORE = 'pes5', IDB_KEY = 'dirHandle';

  let CARPETA = null; // FileSystemDirectoryHandle en uso

  function tieneSoporte() {
    return typeof window !== 'undefined' && !!window.showDirectoryPicker;
  }

  // ---------- IndexedDB propia (solo persiste el handle) ----------
  function _abrirIDB() {
    return new Promise((res, rej) => {
      const req = indexedDB.open(IDB_NAME, IDB_VER);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(IDB_STORE)) req.result.createObjectStore(IDB_STORE);
      };
      req.onsuccess = () => res(req.result);
      req.onerror = () => rej(req.error);
    });
  }
  async function _guardarHandle(handle) {
    const idb = await _abrirIDB();
    return new Promise((res, rej) => {
      const tx = idb.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put(handle, IDB_KEY);
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error);
    });
  }
  async function _leerHandleGuardado() {
    const idb = await _abrirIDB();
    return new Promise((res, rej) => {
      const tx = idb.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).get(IDB_KEY);
      req.onsuccess = () => res(req.result || null);
      req.onerror = () => rej(req.error);
    });
  }

  // ---------- elegir / recuperar carpeta ----------
  async function elegirCarpeta() {
    if (!tieneSoporte()) throw new Error('este navegador no soporta File System Access API — usar fallbackDesdeInput()');
    let handle;
    try {
      handle = await window.showDirectoryPicker({ id: 'pes5-save', mode: 'readwrite' });
    } catch (e) {
      return { ok: false, nombre: null }; // el usuario cancelo el picker
    }
    CARPETA = handle;
    await _guardarHandle(handle);
    return { ok: true, nombre: handle.name };
  }

  async function recuperarCarpeta() {
    let handle;
    try { handle = await _leerHandleGuardado(); } catch (e) { return null; }
    if (!handle) return null;
    try {
      let permiso = await handle.queryPermission({ mode: 'readwrite' });
      if (permiso !== 'granted') permiso = await handle.requestPermission({ mode: 'readwrite' });
      if (permiso !== 'granted') return null;
    } catch (e) {
      return null; // handle invalido/revocado (ej. carpeta borrada, o API no disponible)
    }
    CARPETA = handle;
    return { ok: true, nombre: handle.name };
  }

  // ---------- lectura ----------
  async function _fileHandleDelSave() {
    if (!CARPETA) throw new Error('no hay carpeta elegida — llamar elegirCarpeta() o recuperarCarpeta() primero');
    try {
      return await CARPETA.getFileHandle(SAVE_FILENAME);
    } catch (e) {
      throw new Error(`no se encontro "${SAVE_FILENAME}" en la carpeta "${CARPETA.name}"`);
    }
  }

  async function leer() {
    const fileHandle = await _fileHandleDelSave();
    const file = await fileHandle.getFile();
    const bytes = new Uint8Array(await file.arrayBuffer());
    return { bytes, nombre: file.name, tamaño: file.size, lastModified: file.lastModified };
  }

  async function _statSave() {
    const fileHandle = await _fileHandleDelSave();
    const file = await fileHandle.getFile();
    return { nombre: file.name, tamaño: file.size, lastModified: file.lastModified };
  }

  // ---------- escritura (con backup + verificacion) ----------
  function _timestamp() {
    const d = new Date();
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
  }

  async function _podarBackups(backupDirHandle) {
    const nombres = [];
    for await (const [nombre, handle] of backupDirHandle.entries()) {
      if (handle.kind === 'file' && nombre.startsWith(SAVE_FILENAME + '.') && nombre.endsWith('.bak')) nombres.push(nombre);
    }
    nombres.sort(); // el timestamp YYYYMMDD-HHMMSS ordena cronologicamente como string
    const sobran = nombres.length - BACKUP_KEEP;
    for (let i = 0; i < sobran; i++) await backupDirHandle.removeEntry(nombres[i]);
  }

  async function escribir(bytesCifrados) {
    const fileHandle = await _fileHandleDelSave();

    // 1) backup del estado ACTUAL (antes de pisarlo)
    const actual = await fileHandle.getFile();
    const actualBytes = new Uint8Array(await actual.arrayBuffer());
    const backupDirHandle = await CARPETA.getDirectoryHandle(BACKUP_DIR, { create: true });
    const backupName = `${SAVE_FILENAME}.${_timestamp()}.bak`;
    const backupFileHandle = await backupDirHandle.getFileHandle(backupName, { create: true });
    const bw = await backupFileHandle.createWritable();
    await bw.write(actualBytes);
    await bw.close();
    await _podarBackups(backupDirHandle);

    // 2) escribir el save nuevo
    const w = await fileHandle.createWritable();
    await w.write(bytesCifrados);
    await w.close();

    // 3) releer y comparar byte a byte contra lo que se pidio escribir
    const releido = await fileHandle.getFile();
    const releidoBytes = new Uint8Array(await releido.arrayBuffer());
    if (releidoBytes.length !== bytesCifrados.length) {
      throw new Error(`verificacion fallo: tamaño distinto tras escribir (esperado ${bytesCifrados.length}, leido ${releidoBytes.length}); backup en ${BACKUP_DIR}/${backupName}`);
    }
    for (let i = 0; i < releidoBytes.length; i++) {
      if (releidoBytes[i] !== bytesCifrados[i]) {
        throw new Error(`verificacion fallo: byte distinto en offset ${i} tras escribir; backup en ${BACKUP_DIR}/${backupName}`);
      }
    }

    return { backup: backupName, verificado: true };
  }

  // ---------- observar cambios (polling de lastModified) ----------
  function observar(cb, ms = 3000) {
    let ultimoLM = null;
    let activo = true;

    (async () => {
      try { ultimoLM = (await _statSave()).lastModified; } catch (e) { /* sin carpeta todavia */ }
    })();

    const id = setInterval(async () => {
      if (!activo) return;
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      try {
        const meta = await _statSave();
        if (ultimoLM === null) { ultimoLM = meta.lastModified; return; }
        if (meta.lastModified !== ultimoLM) {
          ultimoLM = meta.lastModified;
          cb(meta);
        }
      } catch (e) { /* error transitorio (permiso, archivo en uso) — se ignora, reintenta el proximo tick */ }
    }, ms);

    return function stop() { activo = false; clearInterval(id); };
  }

  // ---------- fallback sin File System Access API ----------
  async function fallbackDesdeInput(file) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    return { bytes, nombre: file.name, tamaño: file.size, lastModified: file.lastModified };
  }

  function descargar(bytes, nombre = SAVE_FILENAME) {
    const blob = new Blob([bytes], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = nombre;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return {
    tieneSoporte, elegirCarpeta, recuperarCarpeta,
    leer, escribir, observar,
    fallbackDesdeInput, descargar,
    get carpetaActual() { return CARPETA ? CARPETA.name : null; },
  };
})();
