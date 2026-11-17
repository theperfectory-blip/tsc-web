'use strict';
/* ============================================================
   SAVE-1 · save de PES5 publicado por el admin
   ------------------------------------------------------------
   Una sola copia: Storage `pes5_save/actual` (cada subida reemplaza a la anterior)
   y los metadatos en Firestore `pes5_config/save` = {subidoPor, subidoEn, tamano,
   nombreArchivo}.
   - Sube la Tool (solo admin), con el save que ya tiene abierta (PES5_SAVE.leer()).
   - Baja el presidente desde Mejoras («Descargar save»).
   Reglas: firebase/storage.rules (pes5_save/actual: escribe admin, tope 4 MiB; lee
   presidente y admin) y firebase/firestore.rules (pes5_config: lee cualquier sesion,
   escribe admin; no se cambio).
   Storage no esta en index.html: se carga la primera vez que hace falta (no pesa a todo visitante).
   ============================================================ */
const SAVE_PUBLICADO = (() => {
  const RUTA = 'pes5_save/actual';
  const TAMANO_MAX = 4 * 1024 * 1024;   // igual que storage.rules (el save real pesa 1.250.304 b)
  const NOMBRE_JUEGO = 'KONAMI-WIN32PES5OPT';
  // Cabecera que hace que la descarga se guarde con el nombre del juego (no necesita CORS).
  const DISPOSICION = `attachment; filename="${NOMBRE_JUEGO}"`;
  const SDK_STORAGE = 'https://www.gstatic.com/firebasejs/12.14.0/firebase-storage-compat.js';
  const EMU_STORAGE_PORT = 9199;        // emulador de Storage (sandbox / tests); no toca 8080 ni 9099

  let _storage = null;                  // promesa del SDK de Storage (una sola carga)
  let _emuListo = false;
  let _suscripcion = null;              // onSnapshot de la barra de Mejoras

  const _docRef = () => firebase.firestore().collection('pes5_config').doc('save');

  function _normalizar(d){
    return {
      subidoPor: d.subidoPor || '',
      subidoEn: d.subidoEn && typeof d.subidoEn.toDate === 'function' ? d.subidoEn.toDate() : null,
      tamano: Number(d.tamano) || 0,
      nombreArchivo: d.nombreArchivo || NOMBRE_JUEGO,
      // SYNC-1: fecha de modificacion del archivo que se subio (null en subidas anteriores).
      lastModified: typeof d.lastModified === 'number' ? d.lastModified : null,
    };
  }

  // Carga firebase-storage-compat una sola vez y devuelve la instancia de Storage.
  function asegurarStorage(){
    if (_storage) return _storage;
    _storage = new Promise((res, rej) => {
      if (typeof firebase === 'undefined') return rej(new Error('Firebase no esta cargado'));
      const listo = () => {
        try {
          const st = firebase.storage();
          if (window.__TSC_EMULATOR__ && !_emuListo) { st.useEmulator('localhost', EMU_STORAGE_PORT); _emuListo = true; }
          res(st);
        } catch (e) { rej(e); }
      };
      if (typeof firebase.storage === 'function') return listo();
      const s = document.createElement('script');
      s.src = SDK_STORAGE;
      s.onload = listo;
      s.onerror = () => rej(new Error('no se pudo cargar el módulo de archivos'));
      document.head.appendChild(s);
    });
    _storage.catch(() => { _storage = null; });   // si falla, el proximo intento vuelve a cargarlo
    return _storage;
  }

  // Metadatos del save publicado; null si todavia no se publico ninguno.
  async function leerMeta(){
    const s = await _docRef().get();
    return s.exists ? _normalizar(s.data()) : null;
  }

  // Escucha los metadatos en vivo: onMeta(meta|null) y onError(e) si Firestore niega el acceso.
  function suscribir(onMeta, onError){
    return _docRef().onSnapshot(
      s => onMeta(s.exists ? _normalizar(s.data()) : null),
      e => { if (onError) onError(e); });
  }

  /* Sube un Blob a la ruta fija y deja los metadatos. Aislada a proposito: se puede probar
     con un Blob de prueba desde la consola (no depende de la carpeta del juego).
     datos = {subidoPor, nombreArchivo}. Devuelve los metadatos ya escritos. */
  async function subirBlob(blob, datos){
    if (!(blob instanceof Blob) || blob.size === 0) throw new Error('el save está vacío');
    if (blob.size > TAMANO_MAX) throw new Error('el save pesa más de 4 MB');
    const st = await asegurarStorage();
    // Primero el archivo: si falla aca, los metadatos siguen apuntando al save anterior.
    // contentDisposition: al abrir la URL de descarga, el navegador la guarda ya con el nombre del juego.
    await st.ref(RUTA).put(blob, { contentType: 'application/octet-stream', contentDisposition: DISPOSICION });
    await _docRef().set({
      subidoPor: String(datos.subidoPor || 'Admin').slice(0, 64),
      subidoEn: firebase.firestore.FieldValue.serverTimestamp(),
      tamano: blob.size,
      nombreArchivo: String(datos.nombreArchivo || NOMBRE_JUEGO).slice(0, 128),
      lastModified: typeof datos.lastModified === 'number' ? datos.lastModified : null,
    });
    return leerMeta();
  }

  function fechaCorta(d){
    return d ? d.toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' }) : '—';
  }

  /* ---------- barra de Mejoras (presidente) ----------
     La descarga es un <a href> a la URL de getDownloadURL: es una navegacion, no un fetch, asi que
     no necesita CORS en el bucket. El nombre con que se guarda sale de contentDisposition (subirBlob). */
  const ICN_DESCARGA = '<svg class="icn" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';
  let _turnoBarra = 0;   // descarta respuestas viejas si la barra se repinta mientras se pide la URL

  async function _pintarBarra(el, meta){
    const turno = ++_turnoBarra;
    if (!meta){
      el.innerHTML = `<button type="button" class="btn btn-sm" disabled>Aún no hay save publicado</button>`;
      return;
    }
    const info = `<span class="msp-txt">Último save publicado: <b>${escHtml(fechaCorta(meta.subidoEn))}</b>
        · por ${escHtml(meta.subidoPor || '—')}
        <small>Se descarga como ${NOMBRE_JUEGO}: reemplaza el de la carpeta del juego (haz una copia del tuyo antes).</small></span>`;
    let url = null;
    try {
      const st = await asegurarStorage();
      url = await st.ref(RUTA).getDownloadURL();
    } catch (e) {
      console.warn('[save-publicado] URL de descarga', e);
    }
    if (turno !== _turnoBarra) return;
    if (!url){
      el.innerHTML = `${info}<button type="button" class="btn btn-sm" disabled>No se pudo preparar la descarga</button>`;
      return;
    }
    el.innerHTML = `${info}<a class="btn btn-sm btn-primary" href="${escAttr(url)}">${ICN_DESCARGA} Descargar save</a>`;
  }

  // Muestra la barra en `el` y la mantiene al día. Sin sesion (o sin permiso) la oculta.
  function montarBarra(el){
    if (!el || typeof firebase === 'undefined') return;
    if (_suscripcion) { try { _suscripcion(); } catch (e) { /* ya cerrada */ } _suscripcion = null; }
    const user = firebase.auth && firebase.auth().currentUser;
    if (!user){ el.hidden = true; return; }
    el.hidden = false;
    el.innerHTML = '<span class="msp-txt">Cargando el save publicado…</span>';
    try {
      _suscripcion = suscribir(
        meta => _pintarBarra(el, meta),
        e => { console.warn('[save-publicado] metadatos', e); el.hidden = true; });
    } catch (e) {
      console.warn('[save-publicado] metadatos', e);
      el.hidden = true;
    }
  }

  return {
    RUTA, TAMANO_MAX, NOMBRE_JUEGO,
    asegurarStorage, leerMeta, suscribir, subirBlob, fechaCorta, montarBarra,
  };
})();
