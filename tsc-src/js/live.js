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

let _liveUnsub = null;   // función para cancelar la suscripción de Firestore
let _liveTimer = null;   // debounce de re-render
let _liveKey   = null;   // identifica la suscripción activa (evita remontar igual)

/* Cancela la suscripción activa (si la hay). Idempotente. */
function liveStop(){
  if (_liveUnsub){ try { _liveUnsub(); } catch(_){} _liveUnsub = null; }
  if (_liveTimer){ clearTimeout(_liveTimer); _liveTimer = null; }
  _liveKey = null;
}

/* Suscribe `store` (filtrado por temporada actual) y llama a
   `onChange` con debounce ante cada cambio remoto.
   - `key`: identidad de la vista; si ya estás suscrito a la misma
     key, no hace nada (evita remontar en re-renders internos).
   - El PRIMER snapshot se ignora: la vista ya se pintó con un
     fetch normal justo antes, así no hay doble render redundante. */
function liveSubscribe(key, store, onChange){
  if (typeof USE_FIRESTORE === 'undefined' || !USE_FIRESTORE) return; // sin tiempo real (IndexedDB)
  if (_liveKey === key) return;                                       // ya suscrito a esto
  liveStop();
  _liveKey = key;
  let first = true;
  _liveUnsub = dbSubscribe(store, r => r.season===STATE.season || !r.season, () => {
    if (first){ first = false; return; }
    if (_liveTimer) clearTimeout(_liveTimer);
    _liveTimer = setTimeout(onChange, 250);
  });
}

/* True si el tiempo real está disponible (backend Firestore). */
function liveAvailable(){
  return typeof USE_FIRESTORE !== 'undefined' && USE_FIRESTORE;
}

/* ---- Ping de "radar/sonar" mientras hay un partido EN VIVO en el panel.
   Suena cada 1.4s (al ritmo del punto rojo). Respeta el on/off de sonido. ---- */
let _radarTimer = null;
function liveRadarStart(){
  if (_radarTimer) return;                 // ya activo
  if (typeof window.SFX === 'undefined') return;
  const tick = ()=>{ if (window.SFX && window.SFX.enabled !== false) window.SFX.radarPing(); };
  tick();                                   // primer ping inmediato
  _radarTimer = setInterval(tick, 1400);    // mismo período que livePulseRed
}
function liveRadarStop(){
  if (_radarTimer){ clearInterval(_radarTimer); _radarTimer = null; }
}
