'use strict';

/* ============================================================
   TOOL PES5 — carga bajo demanda de la seccion "Tool PES5" del panel admin
   (slice 2.0-1). Los modulos NO van como <script> en index.html: entrarian al
   bundle que baja todo visitante. Se piden la primera vez que se entra a la
   seccion, en orden y una sola vez (guard). Volver a entrar solo re-renderiza
   (PES5_TOOL.montar), no vuelve a cargar nada.
   nav.js llama a entrar() al abrir la seccion y a salir() al dejarla.
   ============================================================ */
// window.PES5_ADMIN (no const): nav.js lo llama como window.PES5_ADMIN?.entrar()
window.PES5_ADMIN = (() => {
  const CSS = ['css/pes5-tool.css', 'css/mejoras-editor.css'];
  const JS = [
    'js/pes5-crypt.js',
    'js/pes5-editor.js',
    'js/pes5-save.js',
    'js/yunacoins-rules.js',
    'js/pes5-plantilla.js',
    'js/pes5-bloqueo.js',
    'js/mejoras-page.js',   // editor de mejoras (MEJORAS_EDITOR), se monta en el modal del jugador
    'js/pes5-tool.js',
  ];
  let _cargando = null;   // promesa de la carga; si falla se reintenta al volver a entrar

  function _cargarCss(href){
    return new Promise((res, rej) => {
      const l = document.createElement('link');
      l.rel = 'stylesheet';
      l.href = href;
      l.onload = () => res();
      l.onerror = () => rej(new Error('no se pudo cargar ' + href));
      document.head.appendChild(l);
    });
  }

  function _cargarJs(src){
    return new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = src;
      s.async = false;   // dinamico: se ejecuta en orden
      s.onload = () => res();
      s.onerror = () => rej(new Error('no se pudo cargar ' + src));
      document.head.appendChild(s);
    });
  }

  function _cargar(){
    if (!_cargando){
      _cargando = (async () => {
        for (const href of CSS) await _cargarCss(href);
        for (const src of JS) await _cargarJs(src);   // secuencial: cada modulo ve al anterior
      })().catch(e => { _cargando = null; throw e; });
    }
    return _cargando;
  }

  // Mientras la seccion esta abierta no debe sonar la pagina principal (palmares,
  // sorteo, cuadro). Usa el corte de runtime de sounds.js: no toca la preferencia
  // de sonido. _audioPausado marca que lo pausamos, para reanudar solo en ese caso
  // (salir() corre tambien al pasar a publico sin haber entrado a la seccion).
  let _audioPausado = false;

  async function entrar(){
    const cont = document.getElementById('pes5-admin-content');
    if (!cont) return;
    if (typeof window.pauseAllAppAudio === 'function'){
      window.pauseAllAppAudio('pes5');
      _audioPausado = true;
    }
    try {
      await _cargar();
    } catch (e) {
      console.error('[pes5-admin]', e);
      cont.textContent = 'No se pudo abrir la Tool PES5 (' + e.message + '). Recargá la página para reintentar.';
      showToast('No se pudo abrir la Tool PES5', 'error');
      return;
    }
    window.PES5_TOOL?.montar(cont);
  }

  function salir(){
    window.PES5_TOOL?.salir();
    if (_audioPausado){
      _audioPausado = false;
      if (typeof window.resumeAudioOnForeground === 'function') window.resumeAudioOnForeground();
    }
  }

  return { entrar: entrar, salir: salir };
})();
