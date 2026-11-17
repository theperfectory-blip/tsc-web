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
  const SDK_STORAGE = 'https://www.gstatic.com/firebasejs/12.14.0/firebase-storage-compat.js';
  const EMU_STORAGE_PORT = 9199;        // emulador de Storage (sandbox / tests); no toca 8080 ni 9099

  let _storage = null;                  // promesa del SDK de Storage (una sola carga)
  let _emuListo = false;
  let _suscripcion = null;              // onSnapshot de la barra de Mejoras
  let _metaBarra = null;                // metadatos que muestra la barra (para el click)

  const _docRef = () => firebase.firestore().collection('pes5_config').doc('save');

  function _normalizar(d){
    return {
      subidoPor: d.subidoPor || '',
      subidoEn: d.subidoEn && typeof d.subidoEn.toDate === 'function' ? d.subidoEn.toDate() : null,
      tamano: Number(d.tamano) || 0,
      nombreArchivo: d.nombreArchivo || NOMBRE_JUEGO,
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
    await st.ref(RUTA).put(blob, { contentType: 'application/octet-stream' });
    await _docRef().set({
      subidoPor: String(datos.subidoPor || 'Admin').slice(0, 64),
      subidoEn: firebase.firestore.FieldValue.serverTimestamp(),
      tamano: blob.size,
      nombreArchivo: String(datos.nombreArchivo || NOMBRE_JUEGO).slice(0, 128),
    });
    return leerMeta();
  }

  // Nombre de la descarga: TSC-save-AAAA-MM-DD_HHMM (el juego espera KONAMI-WIN32PES5OPT, sin extension).
  function nombreDescarga(fecha){
    const d = fecha instanceof Date && !isNaN(fecha) ? fecha : new Date();
    const p = n => String(n).padStart(2, '0');
    return `TSC-save-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`;
  }

  function fechaCorta(d){
    return d ? d.toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' }) : '—';
  }

  // Descarga el save publicado: URL firmada, luego el archivo como Blob con nombre con fecha.
  async function descargar(meta){
    const st = await asegurarStorage();
    const url = await st.ref(RUTA).getDownloadURL();
    const resp = await fetch(url);
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const blob = await resp.blob();
    const obj = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = obj;
    a.download = nombreDescarga(meta && meta.subidoEn);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(obj), 1000);
  }

  /* ---------- barra de Mejoras (presidente) ---------- */
  const ICN_DESCARGA = '<svg class="icn" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';

  function _pintarBarra(el, meta){
    _metaBarra = meta;
    if (!meta){
      el.innerHTML = `<button type="button" class="btn btn-sm" disabled>Aún no hay save publicado</button>`;
      return;
    }
    el.innerHTML = `<span class="msp-txt">Último save publicado: <b>${escHtml(fechaCorta(meta.subidoEn))}</b>
        · por ${escHtml(meta.subidoPor || '—')}
        <small>Para usarlo, ponlo en la carpeta del juego con el nombre ${NOMBRE_JUEGO}.</small></span>
      <button type="button" class="btn btn-sm btn-primary" data-onclick="saveDescargarClick()">${ICN_DESCARGA} Descargar save</button>`;
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

  // Handler de data-onclick de la barra (events.js llama funciones globales).
  window.saveDescargarClick = async function(){
    try {
      await descargar(_metaBarra);
    } catch (e) {
      if (typeof showToast === 'function') showToast('No se pudo descargar el save: ' + (e.message || e), 'error');
      else console.error('[save-publicado] descarga', e);
    }
  };

  return {
    RUTA, TAMANO_MAX, NOMBRE_JUEGO,
    asegurarStorage, leerMeta, suscribir, subirBlob, descargar, nombreDescarga, fechaCorta, montarBarra,
  };
})();
