// Valida tools/pes5/pes5-live-map.json y lo prueba decodificando el registro de
// formacion de PES5: los clubes FKC (42) y GAF (5) del option file real y la
// captura de memoria k_l5 (FKC en partida).
//
// El option file solo se lee y se descifra en memoria con pes5-crypt.js: este
// script no escribe nada del juego.
//
// Uso:
//   node tools/test-pes5-live-map.js [--save <option file>] [--serie <carpeta>]
//   node tools/test-pes5-live-map.js --ayuda
//
//   --save   option file de PES5; si no existe, se salta con aviso.
//   --serie  carpeta con las capturas <label>.bin e index.json; si no existe o
//            no tiene k_l5.bin, se salta con aviso.
//
// Variables de entorno equivalentes: PES5_SAVE y PESMAP_SERIE.
const fs = require('fs');
const path = require('path');

const RUTA_MAPA = path.join(__dirname, 'pes5', 'pes5-live-map.json');
const SAVE_POR_DEFECTO = 'C:/Users/Administrator/Documents/KONAMI/Pro Evolution Soccer 5/save/folder1/KONAMI-WIN32PES5OPT';
const SERIE_POR_DEFECTO = 'C:/Users/Administrator/AppData/Local/Temp/claude/8f26ce61c79846ed/0c1b3a36-9c3e-47cb-ae27-fe8ca8b53107/scratchpad/pesmap/serie';

const args = process.argv.slice(2);
function argumento(nombre) {
  const i = args.indexOf(nombre);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : null;
}

if (args.includes('--ayuda') || args.includes('-h')) {
  console.log('Uso: node tools/test-pes5-live-map.js [--save <option file>] [--serie <carpeta>]');
  console.log('Valida tools/pes5/pes5-live-map.json y decodifica FKC (club 42), GAF (club 5) y la captura k_l5.');
  process.exit(0);
}

const SAVE = argumento('--save') || process.env.PES5_SAVE || SAVE_POR_DEFECTO;
const SERIE = argumento('--serie') || process.env.PESMAP_SERIE || SERIE_POR_DEFECTO;

const fallos = [];
const avisos = [];

function exigir(condicion, mensaje) {
  if (!condicion) fallos.push(mensaje);
}
function canonico(v) {
  if (Array.isArray(v)) return v.map(canonico);
  if (v && typeof v === 'object') {
    const out = {};
    for (const k of Object.keys(v).sort()) out[k] = canonico(v[k]);
    return out;
  }
  return v;
}
function mismo(a, b) {
  return JSON.stringify(canonico(a)) === JSON.stringify(canonico(b));
}
function etiquetaSegura(codigos, valor) {
  return codigos && codigos[String(valor)] != null ? codigos[String(valor)] : String(valor);
}
function casilla(v) {
  return Number.isInteger(v) && v >= 0 && v <= 10;
}

// ---------- lectura y validacion del mapa ----------
let mapa;
try {
  mapa = JSON.parse(fs.readFileSync(RUTA_MAPA, 'utf8'));
} catch (e) {
  console.error('No se pudo leer ' + RUTA_MAPA + ': ' + e.message);
  process.exit(1);
}

const campos = mapa.campos;
const cod = mapa.codificaciones || {};
const largo = mapa.registro && mapa.registro.largo;

exigir(mapa.formato === 'pes5-live-map/1', 'formato inesperado: ' + mapa.formato);
exigir(largo === 628, 'registro.largo debe ser 628');
exigir(Array.isArray(campos) && campos.length > 0, 'campos vacio');
exigir(cod.posicion && Object.keys(cod.posicion).length === 41, 'codificaciones.posicion debe tener 41 codigos');

const BLOQUES = ['cabecera', 'principal', 'A', 'B', 'orden', 'ids'];
const unidades = ['u8', 'u16le', 'bits8'];
const nombres = new Set();

for (const f of campos) {
  const id = 'campo ' + (f && f.nombre ? f.nombre : '(sin nombre)');
  exigir(f && Number.isInteger(f.offset) && f.offset >= 0, id + ': offset invalido');
  exigir(f && Number.isInteger(f.len) && f.len > 0, id + ': len invalido');
  exigir(f && Number.isInteger(f.offset) && Number.isInteger(f.len) && f.offset + f.len <= largo,
    id + ': se sale del registro (' + f.offset + '+' + f.len + ')');
  exigir(f && typeof f.nombre === 'string' && f.nombre.length > 0, id + ': nombre vacio');
  exigir(f && typeof f.porCasilla === 'boolean', id + ': porCasilla debe ser booleano');
  exigir(f && Number.isInteger(f.stride) && f.stride > 0, id + ': stride invalido');
  exigir(f && BLOQUES.includes(f.bloque), id + ': bloque invalido (' + (f && f.bloque) + ')');
  exigir(f && (f.seEscribe === 'instante' || f.seEscribe === 'confirmar'),
    id + ': seEscribe debe ser instante o confirmar');
  exigir(f && (f.valores === null || (typeof f.valores === 'object' && !Array.isArray(f.valores))),
    id + ': valores debe ser objeto o null');
  if (f && f.unidad) exigir(unidades.includes(f.unidad), id + ': unidad invalida (' + f.unidad + ')');
  if (f && f.porCasilla && Number.isInteger(f.len) && Number.isInteger(f.stride)) {
    exigir(f.len % f.stride === 0, id + ': len no es multiplo de stride');
    if (f.unidad === 'u16le') exigir(f.stride === 2, id + ': u16le necesita stride 2');
    if (f.unidad === 'bits8') exigir(f.stride === 8, id + ': bits8 necesita stride 8');
  }
  const clave = (f && f.bloque) + '/' + (f && f.nombre);
  exigir(!nombres.has(clave), id + ': nombre repetido en el bloque ' + (f && f.bloque));
  if (f) nombres.add(clave);
}

// Sin solapamientos: los campos son hojas y no comparten bytes.
const ordenados = [...campos].sort((a, b) => a.offset - b.offset);
for (let i = 1; i < ordenados.length; i++) {
  const a = ordenados[i - 1], b = ordenados[i];
  exigir(a.offset + a.len <= b.offset,
    'solapamiento: ' + a.nombre + ' [' + a.offset + '..' + (a.offset + a.len - 1) + '] y ' +
    b.nombre + ' [' + b.offset + '..' + (b.offset + b.len - 1) + ']');
}

// A y B son el bloque principal desplazado +171 y +342.
const bases = mapa.registro && mapa.registro.bloques;
exigir(bases && bases.principal === 112 && bases.A === 283 && bases.B === 454,
  'bloques.principal/A/B deben ser 112/283/454');
const principales = new Map();
for (const f of campos) if (f.bloque === 'principal') principales.set(f.nombre, f);
for (const f of campos) {
  if (f.bloque !== 'A' && f.bloque !== 'B') continue;
  const p = principales.get(f.nombre);
  exigir(!!p, f.bloque + ' sin campo principal: ' + f.nombre);
  if (!p) continue;
  const delta = (f.bloque === 'A' ? bases.A : bases.B) - bases.principal;
  exigir(f.offset === p.offset + delta,
    f.bloque + '.' + f.nombre + ' = ' + f.offset + '; se esperaba ' + (p.offset + delta));
  for (const k of ['len', 'porCasilla', 'stride', 'valores', 'menu', 'seEscribe', 'unidad', 'casillaInicial', 'etiquetas', 'rango']) {
    exigir(mismo(f[k], p[k]), f.bloque + '.' + f.nombre + ': ' + k + ' no coincide con el principal');
  }
}
for (const p of principales.values()) {
  for (const b of ['A', 'B']) {
    exigir(campos.some((f) => f.bloque === b && f.nombre === p.nombre),
      b + ' sin el campo ' + p.nombre);
  }
}

// Codificaciones completas y coherentes con los campos.
for (let i = 0; i <= 40; i++) {
  exigir(typeof cod.posicion[String(i)] === 'string' && cod.posicion[String(i)].length > 0,
    'codificaciones.posicion sin el codigo ' + i);
}
const TABLAS = [
  ['estrategia', 12], ['nivel', 3], ['sistema', 2], ['abc', 2],
  ['actitud', 2], ['marcaje', 3], ['modoEstrategia', 1],
];
for (const [nombre, max] of TABLAS) {
  exigir(cod[nombre] && Object.keys(cod[nombre]).length === max + 1,
    'codificaciones.' + nombre + ' debe tener ' + (max + 1) + ' codigos');
  for (let i = 0; i <= max; i++) {
    exigir(cod[nombre] && typeof cod[nombre][String(i)] === 'string' && cod[nombre][String(i)].length > 0,
      'codificaciones.' + nombre + ' sin el codigo ' + i);
  }
}
const FLECHAS_ESPERADAS = ['←', '↖', '↑', '↗', '→', '↘', '↓', '↙'];
exigir(mismo(cod.flechas, FLECHAS_ESPERADAS), 'codificaciones.flechas debe ser ← ↖ ↑ ↗ → ↘ ↓ ↙');

const TABLA_DE_CAMPO = {
  posicion: 'posicion',
  estrategiaBoton: 'estrategia',
  actitudDefensiva: 'actitud',
  marcaje: 'marcaje',
  sistemaDefensivo: 'sistema',
  nivelAtaqueDefensa: 'nivel',
  lineaDefensiva: 'abc',
  zonaPresion: 'abc',
  fueraDeJuego: 'abc',
  contraataque: 'abc',
  modoEstrategia: 'modoEstrategia',
  flechasAtaque: 'flechaValor',
};
for (const f of campos) {
  const tabla = TABLA_DE_CAMPO[f.nombre];
  if (tabla) exigir(mismo(f.valores, cod[tabla]), 'campo ' + f.nombre + ' no usa codificaciones.' + tabla);
}

// ---------- decodificacion ----------
// Valor crudo de un campo: numero, array de numeros o array de arrays (flechas).
function leerCrudo(rec, f) {
  if (f.unidad === 'u16le') {
    const out = [];
    for (let i = 0; i < f.len / 2; i++) out.push(rec.readUInt16LE(f.offset + i * 2));
    return out;
  }
  if (f.porCasilla) {
    const n = f.len / f.stride;
    const out = [];
    for (let i = 0; i < n; i++) {
      if (f.unidad === 'bits8') {
        const grupo = [];
        for (let k = 0; k < f.stride; k++) grupo.push(rec[f.offset + i * f.stride + k]);
        out.push(grupo);
      } else {
        out.push(rec[f.offset + i * f.stride]);
      }
    }
    return out;
  }
  const out = [];
  for (let i = 0; i < f.len; i++) out.push(rec[f.offset + i]);
  return f.len === 1 ? out[0] : out;
}

function camposDe(bloque) {
  return campos.filter((f) => f.bloque === bloque);
}
function decodificar(rec, bloque) {
  const crudo = {};
  const lista = campos.filter((f) => ['orden', 'ids', 'cabecera'].includes(f.bloque) || f.bloque === bloque);
  for (const f of lista) crudo[f.nombre] = leerCrudo(rec, f);
  return crudo;
}

function comprobarRegistro(origen, crudo, bloque) {
  exigir(casilla(crudo.capitan), origen + ': capitan ' + crudo.capitan + ' no es casilla 0..10');
  for (const nombre of ['cornerDerecho', 'cornerIzquierdo', 'tiroLibreLargo', 'tiroLibreCorto', 'penal']) {
    exigir(casilla(crudo[nombre]), origen + ': ' + nombre + ' ' + crudo[nombre] + ' no es casilla 0..10');
  }
  if (crudo.modoEstrategia != null) {
    exigir([0, 1].includes(crudo.modoEstrategia), origen + ': modoEstrategia ' + crudo.modoEstrategia + ' fuera de 0..1');
  }
  for (const v of crudo.estrategiaBoton || []) {
    exigir(v >= 0 && v <= 12, origen + ': estrategiaBoton ' + v + ' fuera de 0..12');
  }
  const o = crudo.orden;
  if (o) {
    const vistos = new Set(o);
    exigir(o.length === 32 && vistos.size === 32 && o.every((v) => v >= 0 && v <= 31),
      origen + ': el orden no es una permutacion de 0..31');
  }
  if (crudo.idsPlantel) {
    exigir(crudo.idsPlantel.length === 32, origen + ': idsPlantel no tiene 32 ids');
  }

  const d = crudo;
  exigir(d.posicion.length === 11, origen + '/' + bloque + ': posicion no tiene 11 casillas');
  d.posicion.forEach((v, i) => {
    exigir(v >= 0 && v <= 40, origen + '/' + bloque + ': posicion casilla ' + i + ' = ' + v + ' fuera de 0..40');
  });
  exigir(d.profundidad.length === 11, origen + '/' + bloque + ': profundidad no tiene 11 casillas');
  d.profundidad.forEach((v, i) => exigir(v >= 1 && v <= 47,
    origen + '/' + bloque + ': profundidad casilla ' + i + ' = ' + v + ' fuera de 1..47'));
  exigir(d.lateral.length === 10, origen + '/' + bloque + ': lateral no tiene 10 casillas');
  d.lateral.forEach((v, i) => exigir(v >= 6 && v <= 99,
    origen + '/' + bloque + ': lateral casilla ' + (i + 1) + ' = ' + v + ' fuera de 6..99'));
  exigir(d.flechasAtaque.length === 11, origen + '/' + bloque + ': flechasAtaque no tiene 11 casillas');
  d.flechasAtaque.forEach((grupo, i) => {
    exigir(grupo.length === 8, origen + '/' + bloque + ': flechas de la casilla ' + i + ' no son 8');
    grupo.forEach((v, k) => exigir(v === 0 || v === 1,
      origen + '/' + bloque + ': flecha ' + FLECHAS_ESPERADAS[k] + ' de la casilla ' + i + ' = ' + v));
  });
  exigir(d.actitudDefensiva.length === 11, origen + '/' + bloque + ': actitudDefensiva no tiene 11 casillas');
  d.actitudDefensiva.forEach((v, i) => exigir(v >= 0 && v <= 2,
    origen + '/' + bloque + ': actitud casilla ' + i + ' = ' + v + ' fuera de 0..2'));
  exigir(d.marcaje.length === 11, origen + '/' + bloque + ': marcaje no tiene 11 casillas');
  d.marcaje.forEach((v, i) => exigir(v >= 0 && v <= 3,
    origen + '/' + bloque + ': marcaje casilla ' + i + ' = ' + v + ' fuera de 0..3'));
  exigir(d.rivalMarcado.length === 11, origen + '/' + bloque + ': rivalMarcado no tiene 11 casillas');
  d.rivalMarcado.forEach((v, i) => exigir(v === 255 || v >= 0 && v <= 10,
    origen + '/' + bloque + ': rival de la casilla ' + i + ' = ' + v + ' (se esperaba 0..10 o 255)'));
  exigir(casilla(d.libero), origen + '/' + bloque + ': libero ' + d.libero + ' no es casilla 0..10');
  exigir(d.sistemaDefensivo >= 0 && d.sistemaDefensivo <= 2,
    origen + '/' + bloque + ': sistema ' + d.sistemaDefensivo + ' fuera de 0..2');
  exigir(d.nivelAtaqueDefensa >= 0 && d.nivelAtaqueDefensa <= 3,
    origen + '/' + bloque + ': nivel ' + d.nivelAtaqueDefensa + ' fuera de 0..3');
  for (const nombre of ['lineaDefensiva', 'zonaPresion', 'fueraDeJuego', 'contraataque']) {
    exigir(d[nombre] >= 0 && d[nombre] <= 2, origen + '/' + bloque + ': ' + nombre + ' ' + d[nombre] + ' fuera de 0..2');
  }
}

function imprimir(origen, crudo, conBloques) {
  console.log('--- ' + origen);
  console.log('  capitan: casilla ' + crudo.capitan);
  console.log('  lanzadores: SE D=' + crudo.cornerDerecho + ', SE I=' + crudo.cornerIzquierdo +
    ', TL L=' + crudo.tiroLibreLargo + ', TL C=' + crudo.tiroLibreCorto + ', PK=' + crudo.penal);
  const botones = ['□', '△', '○', '✕'].map((b, i) =>
    b + '=' + etiquetaSegura(cod.estrategia, crudo.estrategiaBoton[i]));
  console.log('  estrategia: ' + botones.join(', ') + ' | modo ' +
    etiquetaSegura(cod.modoEstrategia, crudo.modoEstrategia) +
    ' | nivel ' + etiquetaSegura(cod.nivel, crudo.nivelAtaqueDefensa) +
    ' | sistema ' + etiquetaSegura(cod.sistema, crudo.sistemaDefensivo) +
    ' | libero casilla ' + crudo.libero);
  console.log('  ajustes: linea ' + etiquetaSegura(cod.abc, crudo.lineaDefensiva) +
    ', presion ' + etiquetaSegura(cod.abc, crudo.zonaPresion) +
    ', fuera ' + etiquetaSegura(cod.abc, crudo.fueraDeJuego) +
    ', contra ' + etiquetaSegura(cod.abc, crudo.contraataque));
  console.log('  posiciones: ' + crudo.posicion.map((v) => etiquetaSegura(cod.posicion, v)).join(' '));
  if (conBloques) {
    console.log('  actitudes: ' + crudo.actitudDefensiva.map((v) => etiquetaSegura(cod.actitud, v)).join(' '));
    console.log('  marcaje: ' + crudo.marcaje.map((v) => etiquetaSegura(cod.marcaje, v)).join(' '));
  }
}

// ---------- save real (solo lectura) ----------
let plano = null;
if (!fs.existsSync(SAVE)) {
  avisos.push('no existe el option file ' + SAVE + '; se salta la comprobacion con el save real');
} else {
  try {
    plano = Buffer.from(require('./pes5/pes5-crypt.js').descifrar(fs.readFileSync(SAVE)));
  } catch (e) {
    fallos.push('no se pudo descifrar el option file: ' + e.message);
  }
}
if (plano) {
  for (const [clave, club] of Object.entries(mapa.registro.save.clubes)) {
    const off = mapa.registro.save.base + club * mapa.registro.save.stride;
    exigir(off + largo <= plano.length, clave + ': el registro cae fuera del option file');
    if (off + largo > plano.length) continue;
    const rec = plano.subarray(off, off + largo);
    exigir(rec.subarray(0, clave.length).toString('latin1') === clave,
      clave + ': el registro del club ' + club + ' no empieza con el codigo ' + clave);
    for (const bloque of ['principal', 'A', 'B']) {
      const crudo = decodificar(rec, bloque);
      comprobarRegistro('save ' + clave + ' (club ' + club + ')', crudo, bloque);
      if (bloque === 'principal') imprimir('save ' + clave + ' (club ' + club + ')', crudo, true);
      else console.log('  alineacion ' + bloque + ': ' + crudo.posicion.map((v) => etiquetaSegura(cod.posicion, v)).join(' '));
    }
  }
}

// ---------- captura de memoria ----------
const RUTA_CAPTURA = path.join(SERIE, 'k_l5.bin');
if (!fs.existsSync(RUTA_CAPTURA)) {
  avisos.push('no existe la captura ' + RUTA_CAPTURA + '; se salta la comprobacion en vivo');
} else {
  const base = parseInt(mapa.registro.baseCaptura, 16);
  const recVa = parseInt(mapa.registro.recs.FKC, 16);
  const off = recVa - base;
  const buf = fs.readFileSync(RUTA_CAPTURA);
  exigir(off >= 0 && off + largo <= buf.length, 'la captura k_l5 no cubre rec..rec+627');
  if (off >= 0 && off + largo <= buf.length) {
    const rec = buf.subarray(off, off + largo);
    for (const bloque of ['principal', 'A', 'B']) {
      const crudo = decodificar(rec, bloque);
      comprobarRegistro('captura k_l5 (FKC 0x3956f5e)', crudo, bloque);
      if (bloque === 'principal') imprimir('captura k_l5 (FKC 0x3956f5e, base 0x3940000)', crudo, true);
      else console.log('  alineacion ' + bloque + ': ' + crudo.posicion.map((v) => etiquetaSegura(cod.posicion, v)).join(' '));
    }
  }
}

// ---------- resumen ----------
for (const aviso of avisos) console.log('AVISO: ' + aviso);
if (fallos.length) {
  console.error('FALLOS (' + fallos.length + '):');
  for (const f of fallos) console.error('  - ' + f);
  process.exit(1);
}
console.log('Mapa valido: ' + campos.length + ' campos, ' +
  campos.filter((f) => f.bloque === 'principal').length + ' en el bloque principal (A y B a +171 y +342).');
console.log('PES5 LIVE MAP: OK');
