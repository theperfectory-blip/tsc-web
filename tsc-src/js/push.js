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

   Token FCM → Firestore: se guarda en users/{uid}.fcmTokens (arrayUnion,
   es un array porque un mismo presidente puede tener la app en varios
   dispositivos). Solo se escribe si hay AUTH.user en ese momento — si el
   token llega mientras se navega como invitado, queda solo local y
   window.PUSH.syncUser() lo sube retroactivo cuando el usuario loguea
   (ver docs/android-push-notifications.md para el diseño completo,
   incluyendo los flujos de notificación que TODAVÍA no tienen backend).
   ============================================================ */
(function () {
  const ENABLED_KEY = 'tsc_push_enabled';
  const TOKEN_KEY = 'tsc_push_token';
  const PENDING_REMOVE_KEY = 'tsc_push_pending_remove_token';

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
  function _setPendingTokenRemoval(token) {
    if (!token) return;
    try { localStorage.setItem(PENDING_REMOVE_KEY, token); } catch (_) {}
  }
  function _clearPendingTokenRemoval(token) {
    try {
      const pending = localStorage.getItem(PENDING_REMOVE_KEY);
      if (!token || pending === token) localStorage.removeItem(PENDING_REMOVE_KEY);
    } catch (_) {}
  }

  /* users/{uid} vía AUTH.user — null si nadie está logueado (invitado en
     modo público) o si firebase/AUTH todavía no cargaron. */
  function _pushDocRef() {
    try {
      if (typeof AUTH === 'undefined' || !AUTH.user) return null;
      if (typeof firebase === 'undefined' || !firebase.firestore) return null;
      return firebase.firestore().collection('users').doc(AUTH.user.uid);
    } catch (_) { return null; }
  }

  function _currentTimezone() {
    try {
      return (typeof AUTH !== 'undefined' && AUTH.profile && AUTH.profile.timezone)
        || localStorage.getItem('tsc_timezone')
        || Intl.DateTimeFormat().resolvedOptions().timeZone
        || null;
    } catch (_) { return null; }
  }

  /* Best-effort a propósito: sin usuario logueado no escribe nada (el token
     ya quedó local, se sube con syncUser() al iniciar sesión); si Firestore
     falla (offline, permisos), solo loguea — nunca rompe la UI del toggle. */
  async function _syncTokenToFirestore(token) {
    if (!token) return;
    const ref = _pushDocRef();
    if (!ref) return;
    try {
      await ref.update({
        fcmTokens: firebase.firestore.FieldValue.arrayUnion(token),
        pushEnabled: true,
        pushPlatform: 'android',
        timezone: _currentTimezone(),
        pushUpdatedAt: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('[push] no se pudo sincronizar el token a Firestore:', e && (e.code || e.message));
    }
  }

  /* Quita SOLO el token indicado del array (arrayRemove) — no toca los
     tokens de otros dispositivos del mismo usuario. */
  async function _removeTokenFromFirestore(token) {
    const ref = _pushDocRef();
    if (!ref) return false;
    try {
      const upd = { pushEnabled: false, pushUpdatedAt: new Date().toISOString() };
      if (token) upd.fcmTokens = firebase.firestore.FieldValue.arrayRemove(token);
      await ref.update(upd);
      return true;
    } catch (e) {
      console.warn('[push] no se pudo quitar el token de Firestore:', e && (e.code || e.message));
      return false;
    }
  }

  async function _removeTokenBestEffort(token) {
    if (!token) return true;
    const ok = await _removeTokenFromFirestore(token);
    if (ok) _clearPendingTokenRemoval(token);
    else _setPendingTokenRemoval(token);
    return ok;
  }

  async function _flushPendingTokenRemoval() {
    let pending = null;
    try { pending = localStorage.getItem(PENDING_REMOVE_KEY) || null; } catch (_) {}
    if (!pending) return true;
    const ok = await _removeTokenFromFirestore(pending);
    if (ok) _clearPendingTokenRemoval(pending);
    return ok;
  }

  async function _disableLocalPushFlagAndToken() {
    const tokenToRemove = _token;
    try { localStorage.setItem(ENABLED_KEY, '0'); } catch (_) {}
    await _removeTokenBestEffort(tokenToRemove);
    _clearToken();
    return tokenToRemove;
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
      _syncTokenToFirestore(_token);
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
      await _disableLocalPushFlagAndToken();
      return { ok: false, reason: askIfNeeded ? 'permission-denied' : 'permission-revoked' };
    }

    try {
      await pn.register();
    } catch (e) {
      return { ok: false, reason: 'register-error', error: e };
    }

    try { localStorage.setItem(ENABLED_KEY, '1'); } catch (_) {}
    await _flushPendingTokenRemoval();
    // Si el token ya existía de antes (el SO no siempre re-dispara
    // 'registration' para un token ya vigente), sincronizarlo igual —
    // el listener de arriba solo cubre el caso de un token NUEVO.
    if (_token) _syncTokenToFirestore(_token);
    return { ok: true };
  }

  async function enable() {
    if (!IS_NATIVE_ANDROID) return { ok: false, reason: 'not-native-android' };
    return _requestAndRegister(true);
  }

  async function disable() {
    await _disableLocalPushFlagAndToken();
    const pn = _plugin();
    if (pn && typeof pn.removeAllDeliveredNotifications === 'function') {
      try { await pn.removeAllDeliveredNotifications(); } catch (_) {}
    }
    return { ok: true };
  }

  /* Llamada por auth.js cuando el usuario inicia sesión: si ya había un
     token local (registrado mientras navegaba como invitado, o de una
     sesión previa en este mismo dispositivo) lo asocia a la cuenta que
     acaba de loguear. No pide permiso ni toca el plugin nativo — solo
     Firestore. */
  async function syncUser() {
    if (!IS_NATIVE_ANDROID) return { ok: false, reason: 'not-native-android' };
    await _flushPendingTokenRemoval();
    if (!_token) return { ok: false, reason: 'no-local-token' };
    await _syncTokenToFirestore(_token);
    return { ok: true };
  }

  /* Llamada por auth.js ANTES de cerrar sesión (mientras AUTH.user todavía
     apunta al usuario saliente): desasocia el token de ESE usuario en
     Firestore sin tocar el estado local ni el plugin nativo. Así, si otra
     persona loguea en el mismo dispositivo compartido, no sigue recibiendo
     los avisos del usuario anterior — y si el registro FCM local sigue
     vigente, syncUser() lo re-asocia al que loguee después. */
  async function clearUserToken() {
    if (!IS_NATIVE_ANDROID) return { ok: false, reason: 'not-native-android' };
    await _removeTokenFromFirestore(_token);
    return { ok: true };
  }

  window.PUSH = {
    isSupported: () => IS_NATIVE_ANDROID,
    isEnabled,
    enable,
    disable,
    getToken,
    syncUser,
    clearUserToken,
  };

  // Si ya estaba activado en una sesión anterior, re-registrar al abrir SIN
  // pedir permiso (askIfNeeded=false): si el permiso ya no está concedido
  // (revocado a mano en Ajustes del sistema desde la última sesión), esto
  // apaga el flag en silencio en vez de sorprender al usuario con el diálogo
  // apenas abre la app.
  if (IS_NATIVE_ANDROID && isEnabled()) _requestAndRegister(false);
})();
