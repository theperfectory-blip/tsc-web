'use strict';
/* ============================================================
   POPUP PROMOCIONAL DE LA APK — apk-promo.js
   ------------------------------------------------------------
   Popup + ítem fijo de menú que ofrecen descargar la APK Android.
   Las dos imágenes (tsc-src/assets/TSC-apk.webp desktop/ancho,
   TSC-apk2.webp móvil/vertical) son diseño final: la X de cerrar y
   el botón "DESCARGAR APP APK" son píxeles pintados adentro, no UI
   real. Los hitboxes de abajo son anchors invisibles superpuestos
   en % del contenedor (medidos y verificados dibujándolos encima,
   ver NEXT_SESSION.md §2 — no re-medir sin motivo).
   ============================================================ */

const TSC_APK_URL = 'https://github.com/theperfectory-blip/tsc-web/releases/latest/download/TEAM-SUBS-CUP.apk'; // GitHub Releases — URL fija, apunta siempre al último release

const APK_DOWNLOADED_KEY = 'tsc_apk_downloaded';
const APK_CLOSED_AT_KEY = 'tsc_apk_closed_at';
const APK_CLOSE_REAPPEAR_DAYS = 1;

/* Mismo idiom que push.js:34-36, sin la restricción a Android — este
   popup se ofrece en todas las plataformas, solo se oculta dentro del
   propio empaquetado nativo (mostrar "descargá la app" adentro de la
   app ya instalada no tiene sentido). */
function _apkIsNativeApp() {
  try {
    return !!(
      window.Capacitor &&
      typeof window.Capacitor.isNativePlatform === 'function' &&
      window.Capacitor.isNativePlatform()
    );
  } catch (_) { return false; }
}

function _apkShouldOffer() {
  return !!TSC_APK_URL && !_apkIsNativeApp();
}

function _apkAlreadyDownloaded() {
  try { return localStorage.getItem(APK_DOWNLOADED_KEY) === '1'; } catch (_) { return false; }
}

function _apkClosedRecently() {
  try {
    const closedAt = Number(localStorage.getItem(APK_CLOSED_AT_KEY));
    if (!Number.isFinite(closedAt) || closedAt <= 0) return false;
    const reappearMs = APK_CLOSE_REAPPEAR_DAYS * 24 * 60 * 60 * 1000;
    return (Date.now() - closedAt) < reappearMs;
  } catch (_) { return false; }
}

function openApkPromo() {
  document.getElementById('apk-promo-overlay')?.classList.add('open');
}

function _apkHideOverlay() {
  document.getElementById('apk-promo-overlay')?.classList.remove('open');
}

/* Cierra con la X sin descargar: reaparece recién al día siguiente. */
function closeApkPromo() {
  _apkHideOverlay();
  try { localStorage.setItem(APK_CLOSED_AT_KEY, String(Date.now())); } catch (_) {}
}

/* Compartida por el botón del popup Y el ítem del menú — mismo click,
   mismo flag. Marca "descargado" para siempre en este dispositivo; no
   se previene la navegación real del <a href> (descarga normal). */
function tscApkDownloadClick() {
  try { localStorage.setItem(APK_DOWNLOADED_KEY, '1'); } catch (_) {}
  _apkHideOverlay();
}

function _apkInit() {
  const navItem = document.getElementById('pub-nav-apk-download');
  const overlay = document.getElementById('apk-promo-overlay');
  const dlLink = overlay?.querySelector('.apk-hit-dl');

  if (!_apkShouldOffer()) return; // TSC_APK_URL vacía o dentro de la app nativa: nada se muestra

  if (navItem) {
    navItem.href = TSC_APK_URL;
    navItem.style.display = '';
  }

  if (dlLink) dlLink.href = TSC_APK_URL;

  if (!_apkAlreadyDownloaded() && !_apkClosedRecently()) {
    openApkPromo();
  }
}

document.addEventListener('tsc:boot-ready', _apkInit, { once: true });
