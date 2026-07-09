'use strict';
/* ============================================================
   PUSH NOTIFICATIONS (FCM) — push.js
   ------------------------------------------------------------
   Solo para avisos cuando el usuario NO está mirando la app (background/
   cerrada). El realtime en foreground sigue siendo 100% Firestore
   (onSnapshot) — este módulo nunca reemplaza ni interfiere con eso.

   window.Capacitor solo existe dentro del WebView de la app empaquetada
   (el bridge lo inyecta automáticamente al arrancar) — en el navegador de
   escritorio normal (o en un móvil abriendo la URL web) este módulo entero
   queda inerte, igual que cursor-fx.js queda inerte en táctil.

   A propósito NO pide permiso apenas carga la app: expone window.PUSH.enable()
   para que la UI (toggle "Notificaciones" en Configuración) lo dispare con
   contexto. Android 13+ recién ahí dispara el permission request real.

   A propósito NO guarda el token en Firestore todavía — falta decidir
   colección/owner/reglas/borrado al logout. Por ahora el token solo vive en
   memoria + localStorage, expuesto vía window.PUSH.getToken() para debug.
   ============================================================ */
(function () {
  const ENABLED_KEY = 'tsc_push_enabled';
  const TOKEN_KEY = 'tsc_push_token';

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

  let _token = null;
  try { _token = localStorage.getItem(TOKEN_KEY) || null; } catch (_) { /* storage no disponible */ }
  let _listenersBound = false;

  function _plugin() {
    try { return (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.PushNotifications) || null; }
    catch (_) { return null; }
  }

  function isEnabled() {
    try { return localStorage.getItem(ENABLED_KEY) === '1'; } catch (_) { return false; }
  }
  function getToken() { return _token; }
  function _tokenHint(token) {
    if (!token) return 'none';
    return `${String(token).slice(0, 8)}...${String(token).slice(-6)}`;
  }
  function _clearToken() {
    _token = null;
    try { localStorage.removeItem(TOKEN_KEY); } catch (_) {}
  }

  function _bindListeners(pn) {
    if (_listenersBound) return;
    _listenersBound = true;

    pn.addListener('registration', (data) => {
      _token = (data && data.value) || null;
      try { localStorage.setItem(TOKEN_KEY, _token || ''); } catch (_) {}
      // Debug: no hay UI pública que muestre esto — solo consola + window.PUSH.getToken()
      // (una vista admin/debug puede leerlo cuando se necesite).
      console.log('[push] token FCM registrado:', _tokenHint(_token));
      document.dispatchEvent(new CustomEvent('tsc:push-token', { detail: { token: _token } }));
    });

    pn.addListener('registrationError', (err) => {
      console.warn('[push] error de registro FCM:', err && err.error);
      document.dispatchEvent(new CustomEvent('tsc:push-registration-error', { detail: err }));
    });

    pn.addListener('pushNotificationReceived', (notification) => {
      // Solo llega acá si la app está en FOREGROUND cuando llega el push.
      // El dato en vivo real (marcadores, sorteo, etc.) lo sigue resolviendo
      // Firestore onSnapshot — esto es únicamente para mostrar/loguear el aviso.
      console.log('[push] notificación recibida en foreground:', notification);
    });

    pn.addListener('pushNotificationActionPerformed', (action) => {
      console.log('[push] acción sobre notificación:', action);
      // TODO (futuro): deep-link a la sección relevante según action.notification.data
    });
  }

  /* `askIfNeeded=true` (toggle del usuario, único caller real hoy) puede
     disparar requestPermissions() — el usuario acaba de tocar el control,
     hay contexto de sobra. `askIfNeeded=false` (re-registro silencioso al
     abrir la app) NUNCA debe mostrar el diálogo del sistema: si el permiso
     ya no está 'granted' (p.ej. el usuario lo revocó a mano en Ajustes de
     Android mientras tanto), simplemente se apaga el flag en silencio —
     mostrar el diálogo sin que el usuario haya tocado nada en la app violaría
     la regla central de este módulo. */
  async function _requestAndRegister(askIfNeeded) {
    const pn = _plugin();
    if (!pn) return { ok: false, reason: 'plugin-unavailable' };

    _bindListeners(pn);

    let perm;
    try {
      perm = await pn.checkPermissions();
      if (perm.receive !== 'granted' && askIfNeeded) perm = await pn.requestPermissions();
    } catch (e) {
      return { ok: false, reason: 'permission-error', error: e };
    }

    if (perm.receive !== 'granted') {
      try { localStorage.setItem(ENABLED_KEY, '0'); } catch (_) {}
      _clearToken();
      return { ok: false, reason: askIfNeeded ? 'permission-denied' : 'permission-revoked' };
    }

    try {
      await pn.register();
    } catch (e) {
      return { ok: false, reason: 'register-error', error: e };
    }

    try { localStorage.setItem(ENABLED_KEY, '1'); } catch (_) {}
    return { ok: true };
  }

  async function enable() {
    if (!IS_NATIVE_ANDROID) return { ok: false, reason: 'not-native-android' };
    return _requestAndRegister(true);
  }

  async function disable() {
    try { localStorage.setItem(ENABLED_KEY, '0'); } catch (_) {}
    _clearToken();
    const pn = _plugin();
    if (pn && typeof pn.removeAllDeliveredNotifications === 'function') {
      try { await pn.removeAllDeliveredNotifications(); } catch (_) {}
    }
    return { ok: true };
  }

  window.PUSH = {
    isSupported: () => IS_NATIVE_ANDROID,
    isEnabled,
    enable,
    disable,
    getToken,
  };

  // Si ya estaba activado en una sesión anterior, re-registrar al abrir SIN
  // pedir permiso (askIfNeeded=false): si el permiso ya no está concedido
  // (revocado a mano en Ajustes del sistema desde la última sesión), esto
  // apaga el flag en silencio en vez de sorprender al usuario con el diálogo
  // apenas abre la app.
  if (IS_NATIVE_ANDROID && isEnabled()) _requestAndRegister(false);
})();
