'use strict';

/* Fecha de partido 'YYYY-MM-DD' (scheduledDate). */
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/* Orden compartido de "cuál es el 1º / 2º / siguiente partido del día".
   El arranque del stream (Parte 4a) y el trigger de "puesto en vivo"
   (Parte 4b) usan ESTA MISMA función — no puede haber dos criterios
   distintos de "próximo partido". Orden: scheduledTime ascendente,
   desempate por id ascendente. */
function sortMatchesByKickoff(matches) {
  return [...matches].sort((a, b) => {
    const ta = a.scheduledTime || '';
    const tb = b.scheduledTime || '';
    if (ta !== tb) return ta < tb ? -1 : 1;
    return (Number(a.id) || 0) - (Number(b.id) || 0);
  });
}

/* ¿El partido sigue por jugarse? Un partido con marcador y fuera de vivo ya
   terminó: no tiene sentido avisar «tu equipo juega hoy» ni «a continuación»
   por él (MS-5.8). Uno en vivo cuenta: es el que dispara el aviso del
   siguiente. */
function isPendingOrLive(m) {
  return !!m.live || m.goalsA == null || m.goalsB == null;
}

/* Partidos de `season` programados para `dateStr` ('YYYY-MM-DD'), ya
   ordenados por sortMatchesByKickoff. Lee la colección `matches` completa y
   filtra en memoria en vez de hacer una query compuesta de Firestore:
   mismo patrón que dbGetAll/getForSeason en el cliente (tsc-src/js/db.js),
   y firebase/firestore.indexes.json está vacío — no hay índice compuesto
   (season, scheduledDate) desplegado, así que una query real fallaría en
   producción sin desplegarlo primero. Colección chica (una liga amateur),
   el costo de leerla entera es despreciable. */
async function getOrderedMatchesForDate(db, season, dateStr) {
  const snap = await db.collection('matches').get();
  const matches = snap.docs
    .map(d => d.data())
    .filter(m => m.season === season && m.scheduledDate === dateStr && isPendingOrLive(m));
  return sortMatchesByKickoff(matches);
}

module.exports = { DATE_RE, isPendingOrLive, sortMatchesByKickoff, getOrderedMatchesForDate };
