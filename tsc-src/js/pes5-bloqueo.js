// Bloqueo por equipo: solo una persona a la vez puede tener abierto el editor de mejoras de un
// equipo. Lo usan la Tool PES5 (admin) y mejoras.html (presidente). Vive en Firestore,
// coleccion pes5_bloqueos, un documento por equipo (id = teamId):
//   { por: 'admin' | 'presidente', uid, nombre, desde: ISO, latido: ISO }
// El dueño renueva `latido` cada LATIDO_MS. Un bloqueo cuyo latido tiene mas de TTL_MS se considera
// muerto (navegador cerrado, bateria, etc.) y cualquiera puede tomarlo. Tomarlo es transaccional, asi
// que dos personas nunca ganan a la vez. El mismo uid nunca se bloquea a si mismo (un admin que ademas
// preside un club puede abrir las dos pantallas).
// Requiere el SDK compat de Firebase (firebase.firestore()).
const PES5_BLOQUEO = (() => {
  const TTL_MS = 180000;    // 3 minutos sin latido = bloqueo muerto
  const LATIDO_MS = 30000;  // el dueño lo renueva cada 30 s

  function _ref(teamId) {
    return firebase.firestore().collection('pes5_bloqueos').doc(String(teamId));
  }

  // ¿El documento representa un bloqueo vigente?
  function vivo(d) {
    if (!d || !d.latido) return false;
    const t = new Date(d.latido).getTime();
    return Number.isFinite(t) && (Date.now() - t) < TTL_MS;
  }

  async function leer(teamId) {
    const s = await _ref(teamId).get();
    return s.exists ? s.data() : null;
  }

  // Intenta tomar (o renovar) el bloqueo. Devuelve { ok: true } o { ok: false, de: <doc del dueño actual> }.
  async function tomar(teamId, por, uid, nombre) {
    const r = _ref(teamId);
    return firebase.firestore().runTransaction(async (tx) => {
      const s = await tx.get(r);
      const d = s.exists ? s.data() : null;
      if (vivo(d) && d.uid !== uid) return { ok: false, de: d };
      const ahora = new Date().toISOString();
      const conserva = !!(d && d.uid === uid && d.por === por && vivo(d));
      tx.set(r, { por: por, uid: uid, nombre: nombre || '', desde: conserva ? d.desde : ahora, latido: ahora });
      return { ok: true };
    });
  }

  // Renovar es lo mismo que tomar: si otro se quedo con el bloqueo, devuelve ok:false.
  function latir(teamId, por, uid, nombre) {
    return tomar(teamId, por, uid, nombre);
  }

  // Libera el bloqueo solo si es de este uid.
  async function liberar(teamId, uid) {
    const r = _ref(teamId);
    return firebase.firestore().runTransaction(async (tx) => {
      const s = await tx.get(r);
      if (s.exists && s.data().uid === uid) tx.delete(r);
    });
  }

  // Observa el bloqueo del equipo. cb(doc | null) en cada cambio. Devuelve la funcion para dejar de observar.
  function observar(teamId, cb) {
    return _ref(teamId).onSnapshot((s) => cb(s.exists ? s.data() : null), () => cb(null));
  }

  return { TTL_MS: TTL_MS, LATIDO_MS: LATIDO_MS, vivo: vivo, leer: leer, tomar: tomar, latir: latir, liberar: liberar, observar: observar };
})();
