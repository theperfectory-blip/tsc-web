'use strict';
/* ============================================================
   Club PES5 repetido (slice 2.0-4) — funciones PURAS para la pestaña Equipos de la Tool.
   ------------------------------------------------------------
   Un club PES5 (indice en la lista de clubes) solo puede estar vinculado a UN equipo activo.
   Estas funciones dicen quien lo tiene, que opciones del selector se deshabilitan y si una
   escritura chocaria con otro equipo. Sin DOM ni Firestore: se testean en node
   (tools/test-pes5-clubes.js). Lo usan renderEquiposTab y vincularEquipo de js/pes5-tool.js.

   Modulo UMD: en el navegador define window.PES5_CLUBES; en node, module.exports.
   Se carga con la Tool (js/pes5-admin.js), antes de js/pes5-tool.js.
   ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.PES5_CLUBES = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {

  // Equipos activos: slice C1.1, si falta el campo status cuenta como activo.
  function activos(equipos) {
    return (equipos || []).filter(t => t && t.status !== 'INACTIVO');
  }
  function vinculado(t) {
    return !!t && t.pes5ClubIdx != null;
  }

  // Club (indice) -> equipos activos que lo tienen vinculado.
  function duenosDeClub(equipos) {
    const m = new Map();
    for (const t of activos(equipos)) {
      if (!vinculado(t)) continue;
      if (!m.has(t.pes5ClubIdx)) m.set(t.pes5ClubIdx, []);
      m.get(t.pes5ClubIdx).push(t);
    }
    return m;
  }

  // Otro equipo activo (distinto de equipoId) que ya tiene el club idx. null si no hay.
  // `equipos` debe venir de una lectura fresca cuando se va a escribir (no de la cache).
  function otroEquipoConClub(equipos, idx, equipoId) {
    if (idx == null) return null;
    return activos(equipos).find(t =>
      t.id !== equipoId && vinculado(t) && Number(t.pes5ClubIdx) === Number(idx)) || null;
  }

  // Club repetido de un equipo ya guardado: el otro equipo activo con el mismo club, o null.
  function repetidoDe(equipo, equipos) {
    if (!equipo || equipo.status === 'INACTIVO' || !vinculado(equipo)) return null;
    return otroEquipoConClub(equipos, equipo.pes5ClubIdx, equipo.id);
  }

  // Opciones del selector de UN equipo, en orden: «sin asignar» y luego los clubes.
  // Un club de OTRO equipo activo sale deshabilitado con su dueño: «Arsenal (Malvinas Jr)».
  // El club propio del equipo sigue elegible (aunque haya un duplicado que lo comparta).
  function opcionesClub(nombres, equipos, equipo) {
    const duenos = duenosDeClub(equipos);
    const valorSel = vinculado(equipo) ? String(equipo.pes5ClubIdx) : '';
    const out = [{ value: '', label: '— sin asignar —', disabled: false, selected: valorSel === '' }];
    (nombres || []).forEach((n, i) => {
      const otros = (duenos.get(i) || []).filter(o => o.id !== equipo.id);
      const ocupado = otros.length > 0 && String(i) !== valorSel;
      out.push({
        value: String(i),
        label: ocupado ? `${n} (${otros[0].name})` : n,
        disabled: ocupado,
        selected: String(i) === valorSel,
      });
    });
    return out;
  }

  return {
    activos: activos,
    duenosDeClub: duenosDeClub,
    otroEquipoConClub: otroEquipoConClub,
    repetidoDe: repetidoDe,
    opcionesClub: opcionesClub,
  };
});
