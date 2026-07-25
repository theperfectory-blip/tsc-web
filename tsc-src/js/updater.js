'use strict';
/* ============================================================
   AUTO-ACTUALIZADOR DE LA APK — updater.js
   ------------------------------------------------------------
   Mismo idiom que push.js: solo tiene sentido dentro de la APK
   Android empaquetada (window.Capacitor solo existe en ese WebView).
   Fuera de ahí (navegador de escritorio, PWA) este módulo queda
   inerte y window.UPDATER.isSupported() === false — la UI en
   ui-utils.js usa eso para ocultar la sección entera de
   Configuración, igual que hace con #settings-push-group.

   Separación a propósito: check() es puro dato (sin tocar el DOM),
   para poder reusarlo más adelante en un chequeo automático al
   arrancar la app sin enterrar esa lógica en código de UI. El
   render de los distintos estados vive en ui-utils.js
   (checkForUpdates/installUpdate), como el toggle "Notificaciones"
   vive ahí y no acá.

   Backend: GitHub Releases (Slice B del macro, ver
   tsc-src/MACRO_SLICE_UPDATER.md) — NO Firebase Storage. El asset
   update.json todavía no existe en el release actual mientras el
   Slice B no se publique: la URL de abajo devuelve 404 hoy. Eso es
   un estado real que check() reporta como 'network-error' (con
   status:404), no un bug de este módulo.

   check() usa Capacitor.Plugins.CapacitorHttp.request() en vez de
   fetch() — los release assets de GitHub (a diferencia de
   raw.githubusercontent.com y api.github.com) no mandan
   Access-Control-Allow-Origin, así que un fetch() normal desde el
   WebView (que sirve la app en https://localhost) muere por CORS
   antes de ver la respuesta ("Failed to fetch", verificado en
   emulador). CapacitorHttp corre fuera del motor de CORS del WebView
   (la request nativa la hace el lado Java/Kotlin) y no lo necesita.
   No hace falta activar `CapacitorHttp: {enabled:true}` en
   capacitor.config.json ni tocar nada nativo — el plugin ya está
   registrado por @capacitor/core y se puede invocar directo vía
   Capacitor.Plugins.CapacitorHttp.

   Dos diferencias de comportamiento respecto a fetch(), verificadas
   a mano contra la app instalada, que hay que respetar en check():
     - NO rechaza en 4xx/5xx — resuelve igual que un 200, solo con
       status distinto. No existe el equivalente de res.ok: hay que
       comparar status >= 200 && status < 300 a mano.
     - response.data puede llegar como STRING o como objeto ya
       parseado, según el Content-Type que mande el server (contra
       raw.githubusercontent.com/.../package.json llegó como string).
       Los release assets de GitHub se sirven como binario, así que lo
       esperable es que update.json también llegue como string — hay
       que soportar los dos casos.
   Los redirects (releases/latest/download/… son dos saltos) los sigue
   solo, no hace falta nada especial ahí.

   Plugin nativo consumido (Slice A, ya cerrado):
     Capacitor.Plugins.AppUpdater.canInstall() -> {granted}
     Capacitor.Plugins.AppUpdater.openInstallPermissionSettings()
     Capacitor.Plugins.AppUpdater.downloadAndInstall({url}) — puede
       tardar minutos (~85MB) y rechaza con un mensaje de texto si
       falla (incl. "Ya hay una descarga en curso" si se llama dos
       veces mientras la primera sigue viva — el flag _downloading
       de abajo es lo que la UI usa para no dejar hacer eso).
     Capacitor.Plugins.App.getInfo() (@capacitor/app, ya instalado)
       -> { build: "8", version: "1.5.0", ... } — OJO: build llega
       como STRING, hay que parseInt() antes de comparar.
   ============================================================ */
(function () {
  const UPDATE_MANIFEST_URL = 'https://github.com/theperfectory-blip/tsc-web/releases/latest/download/update.json';

  function _isNativeAndroid() {
    try {
      return !!(
        window.Capacitor &&
        typeof window.Capacitor.isNativePlatform === 'function' &&
        window.Capacitor.isNativePlatform() &&
        window.Capacitor.getPlatform &&
        window.Capacitor.getPlatform() === 'android'
      );
    } catch (_) { return false; }
  }
  const IS_NATIVE_ANDROID = _isNativeAndroid();

  function _appPlugin() {
    try { return (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App) || null; }
    catch (_) { return null; }
  }
  function _updaterPlugin() {
    try { return (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.AppUpdater) || null; }
    catch (_) { return null; }
  }
  function _httpPlugin() {
    try { return (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.CapacitorHttp) || null; }
    catch (_) { return null; }
  }

  let _downloading = false;

  /* Puro dato — no toca el DOM. Compara SIEMPRE por versionCode (numérico),
     nunca por versionName ("1.10.0" vs "1.9.0" como texto da el resultado
     equivocado). App.getInfo().build es STRING ("8") — parseInt() explícito
     antes de comparar, si no se compara string contra number. */
  async function check() {
    if (!IS_NATIVE_ANDROID) return { ok: false, reason: 'not-native-android' };

    const app = _appPlugin();
    if (!app) return { ok: false, reason: 'plugin-unavailable' };

    let info;
    try {
      info = await app.getInfo();
    } catch (e) {
      return { ok: false, reason: 'app-info-error', error: e };
    }

    const currentCode = parseInt(info && info.build, 10);
    if (!Number.isFinite(currentCode)) {
      return { ok: false, reason: 'app-info-error' };
    }

    const http = _httpPlugin();
    if (!http) {
      // No debería pasar (CapacitorHttp viene con @capacitor/core), pero
      // si el bridge todavía no está listo o el plugin no está expuesto,
      // reportar un reason claro en vez de romper en http.request(...).
      return { ok: false, reason: 'http-plugin-unavailable', currentCode, currentName: info.version || null };
    }

    let res;
    try {
      // CapacitorHttp corre fuera del WebView (nativo), así que no pega
      // contra CORS como fetch() — los release assets de GitHub no mandan
      // Access-Control-Allow-Origin. Sigue redirects solo.
      res = await http.request({ url: UPDATE_MANIFEST_URL, method: 'GET' });
    } catch (e) {
      // Sin conexión, DNS, TLS, etc. — a diferencia de un 4xx/5xx (que
      // CapacitorHttp resuelve normalmente con status, ver abajo), esto es
      // una falla real de red.
      return { ok: false, reason: 'network-error', error: e, currentCode, currentName: info.version || null };
    }

    const status = res && res.status;
    if (!(typeof status === 'number' && status >= 200 && status < 300)) {
      // 404 es el estado real de hoy: update.json todavía no se publicó
      // (Slice B pendiente) — se reporta igual como network-error (con el
      // status real adentro para poder diagnosticarlo), la UI lo muestra
      // como "no se pudo comprobar", no como un crash. CapacitorHttp NO
      // rechaza la promesa en 4xx/5xx, así que hay que chequear el status
      // a mano — no existe el equivalente de fetch()'s res.ok.
      return { ok: false, reason: 'network-error', status, currentCode, currentName: info.version || null };
    }

    // response.data puede llegar como string o como objeto ya parseado
    // según el Content-Type que mande el server (verificado a mano: contra
    // raw.githubusercontent.com llegó como string). Soportar los dos casos.
    let manifest = res.data;
    if (typeof manifest === 'string') {
      try { manifest = JSON.parse(manifest); }
      catch (e) { return { ok: false, reason: 'bad-manifest', error: e, currentCode, currentName: info.version || null }; }
    }
    if (!manifest || typeof manifest !== 'object') {
      return { ok: false, reason: 'bad-manifest', currentCode, currentName: info.version || null };
    }

    const remoteCode = parseInt(manifest && manifest.versionCode, 10);
    if (!Number.isFinite(remoteCode)) {
      return { ok: false, reason: 'bad-manifest', currentCode, currentName: info.version || null };
    }

    return {
      ok: true,
      currentCode,
      currentName: info.version || null,
      remoteCode,
      remoteName: (manifest && manifest.versionName) || null,
      apkUrl: (manifest && manifest.apkUrl) || null,
      notes: (manifest && manifest.notes) || '',
      hasUpdate: remoteCode > currentCode,
    };
  }

  async function canInstall() {
    const plugin = _updaterPlugin();
    if (!plugin) return { granted: false };
    try { return await plugin.canInstall(); }
    catch (_) { return { granted: false }; }
  }

  function openInstallPermissionSettings() {
    const plugin = _updaterPlugin();
    if (!plugin) return Promise.resolve();
    return plugin.openInstallPermissionSettings();
  }

  function isDownloading() { return _downloading; }

  /* El plugin nativo ya rechaza una segunda descarga concurrente ("Ya hay
     una descarga en curso") — este flag es la primera línea de defensa del
     lado JS para que la UI deshabilite el botón mientras hay una en curso,
     así el usuario nunca llega a ver ese rechazo (sería un error del plugin
     por una falla de la UI, no al revés). */
  async function downloadAndInstall(url) {
    const plugin = _updaterPlugin();
    if (!plugin) return { ok: false, reason: 'plugin-unavailable' };
    if (_downloading) return { ok: false, reason: 'already-downloading' };
    if (!url) return { ok: false, reason: 'missing-url' };

    _downloading = true;
    try {
      await plugin.downloadAndInstall({ url });
      return { ok: true };
    } catch (e) {
      return { ok: false, reason: 'download-error', error: e };
    } finally {
      _downloading = false;
    }
  }

  window.UPDATER = {
    isSupported: () => IS_NATIVE_ANDROID,
    check,
    canInstall,
    openInstallPermissionSettings,
    downloadAndInstall,
    isDownloading,
  };
})();
