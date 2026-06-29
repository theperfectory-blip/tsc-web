'use strict';
/* ============================================================
   TIEMPO REAL — Fase 6A
   ------------------------------------------------------------
   Una sola suscripción activa a la vez. Cuando los datos cambian
   en la nube, re-renderiza la vista suscrita (reutiliza los
   renders existentes; no reescribe el modelo de la app).

   Degradación elegante: en IndexedDB `dbSubscribe` es no-op, así
   que `liveSubscribe` simplemente no hace nada (modo local).
   ============================================================ */

let _liveUnsubs = [];    // funciones para cancelar las suscripciones activas
let _liveTimer = null;   // debounce de re-render
let _liveKey   = null;   // identifica la suscripción activa (evita remontar igual)

/* Cancela TODAS las suscripciones activas (si las hay). Idempotente. */
function liveStop(){
  if (_liveUnsubs.length){
    _liveUnsubs.forEach(u=>{ try { u(); } catch(_){} });
    _liveUnsubs = [];
  }
  if (_liveTimer){ clearTimeout(_liveTimer); _liveTimer = null; }
  _liveKey = null;
}

/* Suscribe una o varias colecciones (filtradas por temporada actual) y llama
   a `onChange` con debounce ante CUALQUIER cambio remoto o local.
   - `key`: identidad de la vista; si ya estás suscrito a la misma key, no hace
     nada (evita remontar en re-renders internos).
   - `stores`: nombre de colección (string) o lista de colecciones (array).
   - El PRIMER snapshot de cada colección se ignora: la vista ya se pintó con un
     fetch normal justo antes, así no hay doble render redundante.

   onSnapshot es la fuente autoritativa del servidor → datos SIEMPRE frescos,
   sin caché stale. Cubre cambios propios y de otros dispositivos. */
function liveSubscribe(key, stores, onChange){
  if (typeof USE_FIRESTORE === 'undefined' || !USE_FIRESTORE) return; // sin tiempo real (IndexedDB)
  if (_liveKey === key) return;                                       // ya suscrito a esto
  liveStop();
  _liveKey = key;
  const list = Array.isArray(stores) ? stores : [stores];
  list.forEach(store=>{
    let first = true;
    const unsub = dbSubscribe(store, r => r.season===STATE.season || !r.season, () => {
      if (first){ first = false; return; }     // ignora el primer snapshot por colección
      if (_liveTimer) clearTimeout(_liveTimer);
      _liveTimer = setTimeout(onChange, 200);
    });
    _liveUnsubs.push(unsub);
  });
}

/* True si el tiempo real está disponible (backend Firestore). */
function liveAvailable(){
  return typeof USE_FIRESTORE !== 'undefined' && USE_FIRESTORE;
}

/* ---- Radar/sonar mientras hay un partido EN VIVO en el Calendario.
   Suena cada 1.4s (al ritmo del punto rojo). El bus de SFX aplica fade-in al
   arrancar, fade-out al parar y el tratamiento lejano↔cercano según el hover
   del hero (liveRadarProximity). Respeta el on/off de sonido. ---- */
let _radarTimer = null;
function liveRadarStart(){
  if (_radarTimer) return;                 // ya activo
  if (typeof window.SFX === 'undefined') return;
  if (window.SFX.enabled === false) return;
  if (typeof window.SFX.radarStart === 'function') window.SFX.radarStart();   // fade-in del bus
  const tick = ()=>{ if (window.SFX && window.SFX.enabled !== false) window.SFX.radarPing(); };
  tick();                                   // primer ping inmediato
  _radarTimer = setInterval(tick, 1400);    // mismo período que livePulseRed
}
function liveRadarStop(){
  if (_radarTimer){ clearInterval(_radarTimer); _radarTimer = null; }
  if (window.SFX && typeof window.SFX.radarStop === 'function') window.SFX.radarStop();   // fade-out del bus
}
/* Acerca (limpio+alto) o aleja (lejano+eco) el radar según el hover del hero. */
function liveRadarProximity(near){
  if (window.SFX && typeof window.SFX.radarProximity === 'function') window.SFX.radarProximity(!!near);
}
