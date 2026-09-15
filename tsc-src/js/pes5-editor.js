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

  // ---------- nombre de camiseta (+0x20, ascii, 16 bytes) ----------
  function nombreCamisetaDeRegistro(bytes, registro) {
    const off = BASE + registro * STRIDE + 0x20;
    let fin = off;
    while (fin < off + 16 && bytes[fin] !== 0) fin++;
    return new TextDecoder('utf-8').decode(bytes.slice(off, fin)).trim();
  }

  // ---------- contador de ediciones (+0x32, uint16LE — el hueco exacto
  // entre camiseta (+0x20..+0x2f) y el primer campo de ajustes_basicos
  // (Pie dominante, +0x34.0) ----------
  function _offContador(registro) { return BASE + registro * STRIDE + 0x32; }
  function _leerContador(bytes, registro) {
    const off = _offContador(registro);
    return bytes[off] | (bytes[off + 1] << 8);
  }
  function _incrementarContador(bytes, registro) {
    const off = _offContador(registro);
    const v = (_leerContador(bytes, registro) + 1) & 0xFFFF;
    bytes[off] = v & 0xFF;
    bytes[off + 1] = (v >> 8) & 0xFF;
    return v;
  }

  const LESIONES_POR_RAW = ['C', 'B', 'A']; // ver pes5-map.json > ajustes_basicos['Resistencia lesiones']

  // ---------- jugador completo: todos los campos de un registro en un objeto ----------
  // Las claves de atributos/escala8/habilidades son EXACTAMENTE las de
  // pes5-map.json (mismo nombre, sin traducir/renombrar) — es la unica
  // fuente de verdad, para que el mapa siga sirviendo de referencia unica.
  function leerJugadorCompleto(bytes, id) {
    const atributos = {};
    for (const nombre of Object.keys(MAPA.atributos_0_99)) {
      if (nombre.startsWith('_')) continue;
      atributos[nombre] = leerCampoJugador(bytes, id, nombre);
    }
    const escala8 = {};
    for (const nombre of Object.keys(MAPA.atributos_1_8)) {
      if (nombre.startsWith('_')) continue;
      escala8[nombre] = leerCampoJugador(bytes, id, nombre);
    }
    const habilidades = {};
    for (const nombre of Object.keys(MAPA.habilidades)) {
      if (nombre.startsWith('_')) continue;
      habilidades[nombre] = !!leerCampoJugador(bytes, id, nombre);
    }
    const pieRaw = leerCampoJugador(bytes, id, 'Pie dominante');
    const lesionesRaw = leerCampoJugador(bytes, id, 'Resistencia lesiones');

    return {
      id,
      nombre: nombreDeRegistro(bytes, id),
      nombreCamiseta: nombreCamisetaDeRegistro(bytes, id),
      atributos,
      escala8,
      habilidades,
      edad: leerCampoJugador(bytes, id, 'Edad'),
      pieDominante: pieRaw === 1 ? 'izq' : 'der',
      lesiones: LESIONES_POR_RAW[lesionesRaw] || 'C',
      altura: leerCampoJugador(bytes, id, 'Altura'),
      posiciones: posicionesMarcadas(bytes, id),
      posicionRegistrada: posicionRegistrada(bytes, id),
      contadorEdiciones: _leerContador(bytes, id),
    };
  }

  // Aplica solo las claves presentes en `cambios` (parcial). Valida rangos
  // (atributos 0-99, escala8 1-8, altura 148-211cm, edad 15-46), incrementa
  // el contador de ediciones (+0x32) una sola vez si escribio algo, y
  // devuelve la lista de campos escritos.
  //
  // Decision (no estaba 100% especificada en el macro-slice): esta funcion
  // NO edita `posiciones` ni `posicionRegistrada` — ambas dependen de un
  // reindexado (el circulo O es un rango 0-based sobre las posiciones
  // marcadas, ordenadas por bit) que se presta a corromper el dato si se
  // cambia a mitad de una escritura parcial; se deja fuera de esta funcion
  // hasta tener una spec propia (posible parte del slice C/D).
  function escribirJugadorCompleto(bytes, id, cambios) {
    const escritos = [];
    if (cambios && cambios.atributos) {
      for (const [nombre, valor] of Object.entries(cambios.atributos)) {
        if (!MAPA.atributos_0_99[nombre]) throw new Error('atributo no encontrado en el mapa: ' + nombre);
        if (!Number.isInteger(valor) || valor < 0 || valor > 99) throw new Error(`${nombre}: valor fuera de rango (0-99): ${valor}`);
        escribirCampoJugador(bytes, id, nombre, valor);
        escritos.push('atributos.' + nombre);
      }
    }
    if (cambios && cambios.escala8) {
      for (const [nombre, valor] of Object.entries(cambios.escala8)) {
        if (!MAPA.atributos_1_8[nombre]) throw new Error('campo de escala 1-8 no encontrado en el mapa: ' + nombre);
        if (!Number.isInteger(valor) || valor < 1 || valor > 8) throw new Error(`${nombre}: valor fuera de rango (1-8): ${valor}`);
        escribirCampoJugador(bytes, id, nombre, valor);
        escritos.push('escala8.' + nombre);
      }
    }
    if (cambios && cambios.habilidades) {
      for (const [nombre, valor] of Object.entries(cambios.habilidades)) {
        if (!MAPA.habilidades[nombre]) throw new Error('habilidad no encontrada en el mapa: ' + nombre);
        escribirCampoJugador(bytes, id, nombre, valor ? 1 : 0);
        escritos.push('habilidades.' + nombre);
      }
    }
    if (cambios && cambios.edad !== undefined) {
      if (!Number.isInteger(cambios.edad) || cambios.edad < 15 || cambios.edad > 46) throw new Error('edad fuera de rango (15-46): ' + cambios.edad);
      escribirCampoJugador(bytes, id, 'Edad', cambios.edad);
      escritos.push('edad');
    }
    if (cambios && cambios.altura !== undefined) {
      if (!Number.isInteger(cambios.altura) || cambios.altura < 148 || cambios.altura > 211) throw new Error('altura fuera de rango (148-211): ' + cambios.altura);
      escribirCampoJugador(bytes, id, 'Altura', cambios.altura);
      escritos.push('altura');
    }
    if (cambios && cambios.pieDominante !== undefined) {
      if (cambios.pieDominante !== 'der' && cambios.pieDominante !== 'izq') throw new Error('pieDominante debe ser "der" o "izq": ' + cambios.pieDominante);
      escribirCampoJugador(bytes, id, 'Pie dominante', cambios.pieDominante === 'izq' ? 1 : 0);
      escritos.push('pieDominante');
    }
    if (cambios && cambios.lesiones !== undefined) {
      const idx = LESIONES_POR_RAW.indexOf(cambios.lesiones);
      if (idx < 0) throw new Error('lesiones debe ser "A", "B" o "C": ' + cambios.lesiones);
      escribirCampoJugador(bytes, id, 'Resistencia lesiones', idx);
      escritos.push('lesiones');
    }
    if (escritos.length) _incrementarContador(bytes, id);
    return escritos;
  }

  // Plantilla completa de un club: leerJugadorCompleto(...) para cada slot
  // ocupado, en el orden del roster (mismo orden que leerPlantillaEquipo).
  function leerPlantillaCompleta(bytes, indiceClub) {
    return leerPlantillaEquipo(bytes, indiceClub).map(id => leerJugadorCompleto(bytes, id));
  }

  // Indices de TODOS los clubes que tienen a este jugador en su roster (un
  // jugador puede estar en su club Y en su seleccion a la vez — ver gotcha
  // en pes5-map.json > equipos.seleccion_vs_club / README 1.3).
  function equiposDelJugador(bytes, id) {
    const equipos = [];
    for (let i = 0; i < TOTAL_TEAMS; i++) {
      if (leerPlantillaEquipo(bytes, i).includes(id)) equipos.push(i);
    }
    return equipos;
  }

  return {
    cargarMapa, cargarNombresEquipos,
    buscarJugadorPorNombre, nombreDeRegistro,
    leerCampoJugador, escribirCampoJugador,
    posicionesMarcadas, posicionRegistrada,
    buscarEquipoPorNombre, nombreEquipo, leerPlantillaEquipo,
    darDeBajaJugador, darDeAltaJugador, transferirJugador,
    leerJugadorCompleto, escribirJugadorCompleto,
    leerPlantillaCompleta, equiposDelJugador,
  };
})();
