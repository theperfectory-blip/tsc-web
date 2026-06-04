/* Stub navigation — el proyecto real ya tiene la suya. */
function setMode(m) {
  document.body.classList.toggle('public-mode', m === 'public');
  document.getElementById('btn-pub').classList.toggle('active', m === 'public');
  document.getElementById('btn-adm').classList.toggle('active', m === 'admin');
}
function goAdminPage(id, el) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const target = document.getElementById('page-' + id);
  if (target) target.classList.add('active');
  document.querySelectorAll('#sidebar .nav-item').forEach(n => n.classList.remove('active'));
  if (el) el.classList.add('active');
  // Lazy mount: sorteo
  if (id === 'sorteo-admin' && window.SORTEO && !window.__sorteoMounted) {
    window.SORTEO.init('#sorteo-content');
    window.__sorteoMounted = true;
  }
}
function goPublicPage(id, el) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const target = document.getElementById('page-' + id);
  if (target) target.classList.add('active');
  document.querySelectorAll('#pubnav .pub-tab').forEach(n => n.classList.remove('active'));
  if (el) el.classList.add('active');
}
function onSeasonChange(){}
function openSettings(){ document.getElementById('settings-modal').classList.add('active'); }
function closeModal(id){ document.getElementById(id).classList.remove('active'); }
function setTheme(){}
function saveSettings(){ closeModal('settings-modal'); }
function closeConfirm(){ document.getElementById('confirm-overlay').classList.remove('active'); }
function runConfirm(){ closeConfirm(); }

// Default to admin mode + open Sorteo so the demo lands on the new feature.
document.addEventListener('DOMContentLoaded', () => {
  setMode('admin');
  const sorteoNav = document.querySelector('[data-nav="sorteo-admin"]');
  if (sorteoNav) sorteoNav.click();
});
