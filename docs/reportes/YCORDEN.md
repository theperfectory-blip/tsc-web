# YCORDEN · YuNaCoins: activos primero (alfabético) e inactivos al final (por ID)

Solo `tsc-src/js/coins.js`. Sin cambios en IDs ni en datos de Firestore.

> **Nota (YCACTIVOS):** la fila separadora «Inactivos» y el bloque de equipos
> inactivos que describe este reporte se quitaron después. Ver la sección
> «YCACTIVOS» al final, que es el comportamiento vigente.

## Función de orden (una sola)

`ordenarEquiposActivosPrimero(teams)` (global, en `coins.js`):

- **Activos** (`status === 'ACTIVO'`; sin `status` cuenta como activo, igual que
  `teams.js`) ordenados por nombre con `localeCompare('es', {sensitivity:'base',
  numeric:true})`, o sea sin distinguir mayúsculas ni tildes; empate por ID.
- **Inactivos** al final, por ID ascendente.
- Devuelve `{ activos, inactivos, todos }` (los dos grupos ya ordenados y la
  lista plana). No muta el arreglo recibido y tolera `null` o equipos vacíos.

## Listas cambiadas

1. **Tabla «Saldos por equipo»** (`renderCoinsTable`, usada por `renderAdmCoins`
   y por el buscador `filterCoinsTable`): activos primero y, debajo de una fila
   separadora «Inactivos», los inactivos. **Excepción del punto 4:** la tabla se
   sigue ordenando por saldo (de mayor a menor) dentro de cada grupo; los
   inactivos siguen al final aunque tengan más coins. La fila separadora usa
   `var(--card2)`, `var(--brd)`, `var(--brd2)` y `var(--txt3)` (sirve en tema
   claro y oscuro; su fondo inline anula el hover de `.tbl`).
   Si no hay equipos (por ejemplo, una búsqueda sin resultados) se muestra
   «No hay equipos.» en vez de una tabla vacía.

## Lo que no aplica en esta sección

- **No hay `<select>` de equipos en YuNaCoins.** La carga individual se abre
  con los botones «+ Coins» / «- Coins» de cada fila (`openCoinsModal(teamId)`),
  no con un selector; el historial también es por fila. Por eso no hay
  `<optgroup>` que separar. Si más adelante se agrega un select, se arma con
  `ordenarEquiposActivosPrimero(teams).activos` e `.inactivos` (optgroups
  «Activos» e «Inactivos»).
- **Asignación masiva** (`openBulkCoinsModal` / `saveBulkCoins`): no lista
  equipos, solo cuenta y aplica a los activos (comportamiento previo, no es un
  selector); queda igual para no cambiar a quién se le escriben coins.

## Al activar un equipo

El orden se calcula al pintar. Al volver a la sección, `renderAdmCoins` vuelve a
leer `dbGetAll('teams')` (el espejo de `db.js` recibe el cambio por su
`onSnapshot`), así que el equipo reaparece en su lugar alfabético. No hizo falta
listener nuevo.

## Comprobaciones

- `node --check tsc-src/js/coins.js` → sin errores.
- `node scripts/audit-wiring.mjs` → `rotos 0 (no definidas 0 · sin window 0)`.
- `node scripts/build-web.mjs` → `dist/` generado (11 bundles).
- `node scripts/smoke-parity.mjs` → `PARIDAD: OK` (0 diferencias).
- Prueba de la función y del render con un script de Node en un directorio
  temporal (`vm` sobre `coins.js`, DOM simulado; no quedó en el repo):
  grupos correctos, alfabético con tildes/mayúsculas, inactivos por ID,
  separador «Inactivos» una sola vez y ranking por saldo dentro de cada grupo.
- No se usó el sandbox: no hacía falta para un cambio de orden y pintado, y los
  puertos 3001/8080/9099 podían estar en uso por otra sesión (lecturas).

## YCACTIVOS

Cambio posterior, solo en `tsc-src/js/coins.js`: en la sección **YuNaCoins** del
panel admin los equipos inactivos **no aparecen en ninguna parte**. Sigue la
definición de activo de `teams.js`: `status === 'ACTIVO'` o sin `status`. El
historial de un equipo hoy inactivo puede seguir existiendo en `coins`; solo no
se lista ni se abre desde YuNaCoins.

No se duplicó lógica: todo sale de
`ordenarEquiposActivosPrimero(teams)` (`ui-utils.js`, EQORDEN), usando
`.activos`.

### Listas y números cambiados

1. **Estadísticas de arriba** (`renderAdmCoins`): «Total circulación»,
   «Promedio por equipo», «Equipos» y «Mayor saldo» se calculan solo con los
   activos. Si no hay activos, cantidad y mayor saldo quedan en 0 y el promedio
   en 0 (sin división por cero).
2. **Tabla «Saldos por equipo»** (`renderCoinsTable`): solo activos, ordenados
   por saldo de mayor a menor (el orden alfabético del helper queda como
   desempate estable). Se quitó la fila separadora «Inactivos» y el bloque de
   abajo. Sin activos muestra «No hay equipos activos.» (o «Ningún equipo activo
   coincide con la búsqueda.» si hay texto en el buscador). La función vuelve a
   filtrar con el helper, así que ninguna llamada puede pintar un inactivo.
3. **Búsqueda** (`filterCoinsTable`): parte solo de los activos y busca por
   nombre o presidente; un inactivo que coincida con el texto no aparece.
4. **Carga individual e historial** (`openCoinsModal` / `openCoinsHistory`):
   se agregó una guarda con `_equipoOrdenActivo(team)`. Si se invocan para un
   equipo que ya está inactivo, avisan «Ese equipo está inactivo: no aparece en
   YuNaCoins» y no abren el modal. Las filas y sus botones ya no existen para
   inactivos, así que en el uso normal no se llega a esa guarda.
5. **Asignación masiva** (`openBulkCoinsModal` / `saveBulkCoins`): el filtro
   inline `t=>t.status==='ACTIVO'` se reemplazó por el helper `.activos`, para
   que la definición de activo sea una sola en el archivo. El conteo y los
   equipos que reciben coins son los mismos que antes mientras todos los
   equipos tengan `status` (el alta de equipos siempre lo escribe); la
   diferencia es que un equipo sin `status` ahora cuenta como activo, igual que
   en la tabla y en Equipos.

### Comprobaciones de YCACTIVOS

- `node --check tsc-src/js/coins.js` → sin errores.
- `node scripts/audit-wiring.mjs` → `rotos 0 (no definidas 0 · sin window 0)`.
  Regeneró `docs/reportes/MS-2.3-cableado.md`; se restauró a la versión del
  repo.
- `node scripts/build-web.mjs` → `dist/` generado (7 CSS → 1 · 40 JS → 11
  bundles).
- `node scripts/smoke-parity.mjs` → `PARIDAD: OK` (0 diferencias).
- Prueba en Node con `vm` sobre las funciones reales de `ui-utils.js` y
  `coins.js`, con DOM simulado (archivo temporal fuera del repo): 20
  comprobaciones OK. Cubre activos con y sin `status`, inactivos fuera de
  tabla/stats/búsqueda/masivo, orden por saldo, mensajes de vacío, guardas de
  carga e historial y el caso de cero activos.
- No se usó el sandbox ni se escribió en Firestore.
