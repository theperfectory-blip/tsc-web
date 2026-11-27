# YCORDEN · YuNaCoins: activos primero (alfabético) e inactivos al final (por ID)

Solo `tsc-src/js/coins.js`. Sin cambios en IDs ni en datos de Firestore.

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
