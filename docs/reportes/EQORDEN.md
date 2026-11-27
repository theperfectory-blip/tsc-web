# EQORDEN · Equipos (panel admin): activos alfabéticos, inactivos ocultos y al final

`tsc-src/js/teams.js`, `tsc-src/js/coins.js` y `tsc-src/js/ui-utils.js`. Sin
cambios en IDs ni en datos de Firestore.

## Dónde quedó la función de orden

`ordenarEquiposActivosPrimero(teams)` (y sus ayudantes `_equipoOrdenActivo`,
`_equipoOrdenNombre`, `_equipoOrdenId`) se **movió** de `coins.js` a
`ui-utils.js`, que entra en `index.html` antes de `coins.js` y de `teams.js`
(y en otro tramo de bundle, pero siempre antes en orden de ejecución). No hay
lógica duplicada: `coins.js` la sigue llamando igual que antes (solo quedó un
comentario que apunta al archivo nuevo), y `teams.js` la usa ahora también.
Mismo criterio: activos (`status === 'ACTIVO'`; sin `status` cuenta como
activo) alfabético con `localeCompare('es', {sensitivity:'base', numeric:true})`
—sin mayúsculas ni tildes, empate por ID—, inactivos al final por ID.

## Tabla `#teams-tbl`

- **Filtro por defecto «Activos»**: los inactivos no se ven al entrar. La
  elección se conserva entre repintados (variable `_teamsStatusFilter`) para
  que activar o desactivar un equipo lo deje en su sitio sin volver a
  «Activos» si estabas en «Todos».
- **«Activos»**: solo activos, alfabético.
- **«Todos»**: activos alfabético y, debajo de una fila separadora
  «Inactivos» (mismo estilo que la de YuNaCoins: `var(--card2)`, `var(--brd)`,
  `var(--brd2)`, `var(--txt3)`, sirve en tema claro y oscuro), los inactivos
  por ID. La columna «#» numera las filas visibles de corrido (el separador no
  cuenta).
- **«Inactivos»**: solo inactivos, por ID, sin separador.
- **Búsqueda** (`#team-search`): filtra nombre o iniciales dentro del filtro
  elegido y conserva el mismo orden; si el filtro es «Todos» y la búsqueda
  deja inactivos, el separador sigue apareciendo.
- **Mensajes vacíos** según el filtro: «No hay equipos activos», «No hay
  equipos inactivos», «Ningún equipo activo coincide con la búsqueda», etc.
- **Activar / desactivar**: `saveTeam` ya repinta con `renderAdmTeams()`; el
  orden se calcula al pintar, así que el equipo reaparece en su lugar
  alfabético (activado) o baja al bloque de inactivos por ID (desactivado).
  El buscador se limpia en ese repintado (comportamiento previo).
- Un detalle detectado en la prueba: la opción «Activos» del `<select>` se
  marcaba `selected` también con «Todos» elegido (dos opciones seleccionadas →
  el navegador tomaba la última). Quedó condicionada a un valor distinto de
  `''` e `'INACTIVO'`.

## Vista pública

`renderPubTeams` (vitrina de clubes) ya listaba solo `status === 'ACTIVO'` y
**baraja** las tarjetas a propósito: no se tocó. Solo se anota, como pedía la
tarea.

## Comprobaciones

- `node --check` de `teams.js`, `coins.js` y `ui-utils.js` → sin errores.
- `node scripts/audit-wiring.mjs` → `rotos 0 (no definidas 0 · sin window 0)`.
  Regeneró `docs/reportes/MS-2.3-cableado.md` (fecha, líneas y duplicados de
  otros archivos); se restauró a la versión del repo.
- `node scripts/build-web.mjs` → `dist/` generado (7 CSS → 1 · 40 JS → 11
  bundles).
- `node scripts/smoke-parity.mjs` → `PARIDAD: OK` (0 globales y 0 listeners de
  diferencia).
- Prueba del orden sin navegador: script en Node (directorio temporal, `vm`
  sobre los bloques reales de `ui-utils.js`/`teams.js` con un DOM simulado; no
  quedó en el repo). 19 comprobaciones OK: alfabético con tildes/mayúsculas,
  inactivos por ID, separador una sola vez y en su sitio, numeración, búsqueda
  con cada filtro, mensajes vacíos, activar/desactivar y `selected` del
  `<select>`.
- No se usó el sandbox (está en uso por otra sesión): el cambio es de orden y
  pintado, sin escrituras.
