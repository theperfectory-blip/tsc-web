// Funciones de alto nivel para leer/escribir un option file de PES5 ya
// descifrado (Uint8Array), usando pes5-map.json como fuente de verdad de
// offsets. Puerto a browser de la logica validada en
// tsc-src/prototipo_yunas/pes5/tools/write-test-full.js y write-team-test.js.

const PES5_EDITOR = (() => {
  const BASE = 36872, STRIDE = 124; // tabla de jugadores (bloque 4)
  const TEAM_BASE = 803608, TEAM_STRIDE = 140, TOTAL_TEAMS = 138; // bloque 6
  const ROSTER_BASE = 667458, ROSTER_STRIDE = 64, SLOTS = 32; // bloque 5

  let MAPA = null;
  async function cargarMapa(baseUrl = '') {
    if (MAPA) return MAPA;
    const res = await fetch(baseUrl + 'pes5-map.json');
    MAPA = await res.json();
    return MAPA;
  }

  // nombres de los 138 clubes (datos estaticos del juego, no cambian entre
  // saves) — para poblar selectores sin necesitar subir un option file.
  let NOMBRES_EQUIPOS = null;
  async function cargarNombresEquipos(baseUrl = '') {
    if (NOMBRES_EQUIPOS) return NOMBRES_EQUIPOS;
    const res = await fetch(baseUrl + 'pes5-teams.json');
    NOMBRES_EQUIPOS = await res.json();
    return NOMBRES_EQUIPOS;
  }

  // ---------- lectura/escritura de bits (LSB-first, igual que las calibraciones) ----------
  function bitsOf(bytes, off, len) {
    const bits = new Uint8Array(len * 8);
    for (let b = 0; b < len; b++) {
      const v = bytes[off + b];
      for (let k = 0; k < 8; k++) bits[b * 8 + k] = (v >> k) & 1;
    }
    return bits;
  }
  function writeBits(bytes, off, bits) {
    for (let b = 0; b < bits.length / 8; b++) {
      let v = 0;
      for (let k = 0; k < 8; k++) v |= bits[b * 8 + k] << k;
      bytes[off + b] = v;
    }
  }
  function getField(bytes, registro, bitStart, width) {
    const off = BASE + registro * STRIDE;
    const bits = bitsOf(bytes, off, STRIDE);
    let v = 0;
    for (let i = 0; i < width; i++) v |= bits[bitStart + i] << i;
    return v;
  }
  function setField(bytes, registro, bitStart, width, valor) {
    const off = BASE + registro * STRIDE;
    const bits = bitsOf(bytes, off, STRIDE);
    for (let i = 0; i < width; i++) bits[bitStart + i] = (valor >> i) & 1;
    writeBits(bytes, off, bits);
  }

  // ---------- jugadores: nombre <-> registro ----------
  function nombreDeRegistro(bytes, registro) {
    const off = BASE + registro * STRIDE;
    let s = '';
    for (let i = 0; i < 30; i += 2) {
      const code = bytes[off + i] | (bytes[off + i + 1] << 8);
      if (code === 0) break;
      s += String.fromCharCode(code);
    }
    return s.trim();
  }
  function buscarJugadorPorNombre(bytes, nombre) {
    for (let i = 0; i < 5000; i++) if (nombreDeRegistro(bytes, i) === nombre) return i;
    return -1;
  }

  // ---------- campos de jugador (busca el campo en cualquier categoria del mapa) ----------
  function _buscarDefCampo(mapa, nombreCampo) {
    const categorias = [
      ['atributos_0_99', mapa.atributos_0_99, 7, 'directo'],
      ['atributos_1_8', mapa.atributos_1_8, 3, 'menos1'],
      ['habilidades', mapa.habilidades, 1, 'directo'],
      ['posiciones', mapa.posiciones, 1, 'directo'],
    ];
    for (const [, obj, ancho, enc] of categorias) {
      if (obj && obj[nombreCampo]) return { bit: obj[nombreCampo].bit, ancho, enc, offset: 0 };
    }
    if (mapa.ajustes_basicos && mapa.ajustes_basicos[nombreCampo]) {
      const c = mapa.ajustes_basicos[nombreCampo];
      const offsetNum = nombreCampo === 'Edad' ? 15 : nombreCampo === 'Altura' ? 148 : 0;
      return { bit: c.bit, ancho: c.ancho_bits, enc: offsetNum ? 'suma' : 'directo', offset: offsetNum };
    }
    if (nombreCampo === 'Posicion registrada' && mapa.posicion_registrada) {
      return { bit: mapa.posicion_registrada.bit, ancho: mapa.posicion_registrada.ancho_bits, enc: 'directo', offset: 0 };
    }
    return null;
  }
  function leerCampoJugador(bytes, registro, nombreCampo) {
    const def = _buscarDefCampo(MAPA, nombreCampo);
    if (!def) throw new Error('campo no encontrado en el mapa: ' + nombreCampo);
    const crudo = getField(bytes, registro, def.bit, def.ancho);
    if (def.enc === 'menos1') return crudo + 1;
    if (def.enc === 'suma') return crudo + def.offset;
    return crudo;
  }
  function escribirCampoJugador(bytes, registro, nombreCampo, valor) {
    const def = _buscarDefCampo(MAPA, nombreCampo);
    if (!def) throw new Error('campo no encontrado en el mapa: ' + nombreCampo);
    let crudo = valor;
    if (def.enc === 'menos1') crudo = valor - 1;
    if (def.enc === 'suma') crudo = valor - def.offset;
    setField(bytes, registro, def.bit, def.ancho, crudo);
  }

  // ---------- posiciones de un jugador ----------
  // Devuelve los nombres de las posiciones marcadas (estrella), en el mismo
  // orden que la pantalla (de arriba/DC hacia abajo/Portero).
  function posicionesMarcadas(bytes, registro) {
    const marcadas = [];
    for (const [nombre, campo] of Object.entries(MAPA.posiciones)) {
      if (nombre.startsWith('_')) continue;
      if (getField(bytes, registro, campo.bit, 1)) marcadas.push({ nombre, bit: campo.bit });
    }
    marcadas.sort((a, b) => a.bit - b.bit); // ascendente = de abajo hacia arriba en pantalla
    return marcadas.map(m => m.nombre);
  }
  // Resuelve el nombre de la posicion registrada (circulo O) — ver
  // pes5-map.json > posicion_registrada: es el rango 0-based de esa
  // posicion entre las marcadas, ordenando por bit ascendente.
  function posicionRegistrada(bytes, registro) {
    const marcadas = posicionesMarcadas(bytes, registro); // ya ordenadas por bit asc
    const idx = getField(bytes, registro, MAPA.posicion_registrada.bit, MAPA.posicion_registrada.ancho_bits);
    return marcadas[idx] || marcadas[0] || null;
  }

  // ---------- equipos (bloque 6 nombres + bloque 5 plantillas) ----------
  function nombreEquipo(bytes, indice) {
    const off = TEAM_BASE + indice * TEAM_STRIDE;
    let fin = off;
    while (fin < off + 24 && bytes[fin] !== 0) fin++;
    return new TextDecoder('utf-8').decode(bytes.slice(off, fin)).trim();
  }
  function buscarEquipoPorNombre(bytes, nombre) {
    for (let i = 0; i < TOTAL_TEAMS; i++) if (nombreEquipo(bytes, i) === nombre) return i;
    return -1;
  }
  function _rosterOffset(indiceEquipo) { return ROSTER_BASE + indiceEquipo * ROSTER_STRIDE; }
  function leerPlantillaEquipo(bytes, indiceEquipo) {
    const off = _rosterOffset(indiceEquipo);
    const ids = [];
    for (let s = 0; s < SLOTS; s++) {
      const id = bytes[off + s * 2] | (bytes[off + s * 2 + 1] << 8);
      if (id) ids.push(id);
    }
    return ids;
  }
  function _leerSlots(bytes, indiceEquipo) {
    const off = _rosterOffset(indiceEquipo);
    const slots = [];
    for (let s = 0; s < SLOTS; s++) slots.push(bytes[off + s * 2] | (bytes[off + s * 2 + 1] << 8));
    return slots;
  }
  function _escribirSlots(bytes, indiceEquipo, slots) {
    const off = _rosterOffset(indiceEquipo);
    for (let s = 0; s < SLOTS; s++) {
      const v = slots[s] || 0;
      bytes[off + s * 2] = v & 0xFF;
      bytes[off + s * 2 + 1] = (v >> 8) & 0xFF;
    }
  }
  function darDeBajaJugador(bytes, indiceEquipo, idJugador) {
    const slots = _leerSlots(bytes, indiceEquipo);
    const idx = slots.indexOf(idJugador);
    if (idx < 0) throw new Error('jugador ' + idJugador + ' no esta en el equipo ' + indiceEquipo);
    let ultimoActivo = -1;
    for (let s = 0; s < SLOTS; s++) if (slots[s] !== 0) ultimoActivo = s;
    if (idx !== ultimoActivo) slots[idx] = slots[ultimoActivo];
    slots[ultimoActivo] = 0;
    _escribirSlots(bytes, indiceEquipo, slots);
  }
  function darDeAltaJugador(bytes, indiceEquipo, idJugador) {
    const slots = _leerSlots(bytes, indiceEquipo);
    const libre = slots.indexOf(0);
    if (libre < 0) throw new Error('equipo ' + indiceEquipo + ' sin cupo (32/32)');
    slots[libre] = idJugador;
    _escribirSlots(bytes, indiceEquipo, slots);
  }
  function transferirJugador(bytes, indiceEquipoOrigen, indiceEquipoDestino, idJugador) {
    darDeBajaJugador(bytes, indiceEquipoOrigen, idJugador);
    darDeAltaJugador(bytes, indiceEquipoDestino, idJugador);
  }

  return {
    cargarMapa, cargarNombresEquipos,
    buscarJugadorPorNombre, nombreDeRegistro,
    leerCampoJugador, escribirCampoJugador,
    posicionesMarcadas, posicionRegistrada,
    buscarEquipoPorNombre, nombreEquipo, leerPlantillaEquipo,
    darDeBajaJugador, darDeAltaJugador, transferirJugador,
  };
})();
