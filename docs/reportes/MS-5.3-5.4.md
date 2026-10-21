# MS-5.3 y 5.4 · Competiciones y fases · Equipos y usuarios · 2026-10-19

Estado: **CERRADO** (2026-10-19). Cierra H-42. Hallazgos nuevos: H-48 a H-50.

Cómo se verificó (todo en el sandbox, nunca producción):

- Emuladores de Firestore y Auth (`tsc-emu-backend`) con las reglas del repo, base cargada con `node scripts/emu-seed.mjs sandbox/backup.json --clean` (62 equipos, 422 partidos, 10 fases, T3 finalizada). Cuentas de `scripts/emu-credentials.example.json`.
- Variante `dist` (`tsc-emu-dist`) para todo el recorrido; variante `tsc-src` (`tsc-emu`) para el render de las 4 páginas admin, la cascada de competición y el bloqueo de borrado de equipos.
- Consola: trampa de `error`, `unhandledrejection` y `console.error`. **0 errores** en las dos variantes.
- Estado final leído del servidor (`get({source:'server'})`) o por REST como `owner`.
- Reglas: `npm run test:rules` → `rules-teams` 33/33 (12 casos nuevos de H-42) y `rules-suite` 379/379.
- `node scripts/smoke-parity.mjs` → `PARIDAD: OK`. `node scripts/audit-wiring.mjs` → 0 handlers rotos (se restauró su reporte, que el script sobrescribe sin la revisión manual).

## 5.3 · Competiciones y fases

Cambios (`js/competitions.js`, `js/phases.js`):
- **Cascada (integridad):** borrar una fase solo borraba la fase, aunque el aviso decía «y todos sus partidos asociados»: los partidos quedaban huérfanos (y su registro de `matchHistory`, que sigue contando en historial, tabla histórica y ficha del club). Borrar una competición borraba sus fases, pero tampoco sus partidos, y borraba la competición **antes** que los hijos. Ahora `_collectPhaseCascade` + `_deletePhaseCascade`: historial → partidos → fases (en lote, `dbDeleteMany`) y la competición al final; el aviso dice cuántos de cada uno. Se vuelve a leer al confirmar.
- **«Ver fases» abría siempre la primera competición:** el id llegaba como texto (`data-cid`) y `renderAdmFases` no lo encontraba entre los ids numéricos. `parseInt` en `openFasesForComp`.
- Guardas de doble clic en guardar competición y fase; guardar en una temporada finalizada (el `<select>` del modal la ofrecía) se rechaza con aviso; competición o fase borrada con el modal abierto, controlada.
- `try/catch` con `dbErrorMsg` en guardar, borrar, publicar/ocultar y reordenar (C9).
- Escapes: nombre y descripción en el modal (`escAttr`/`escHtml`; un `</textarea>` en la descripción rompía el modal), nombres de fase y de zona, `<select>` de competiciones y temporadas, `title` de zonas; colores con `safeCssColor`. `maxlength` en nombres.
- Temporada finalizada: sin «+ Crear primera» ni botón de publicar.
- Íconos: `★` (Superclásico), `✕`, `▲`/`▼` → SVG Lucide (star, x, eye, eye-off).

Verificado (`dist`, en una T4 de prueba):
- Doble clic en Guardar → 1 competición y 1 fase. Nombre `Copa "Prueba" <b>A</b>` y descripción con `</textarea><b>`: texto literal en tarjeta y modal, 0 `<b>` inyectados.
- Competición en T3 (finalizada) → «T3 está finalizada: no admite cambios», nada creado.
- «Ver fases» de la 2.ª competición → selector en esa competición.
- Fase que excede el total de la competición → aviso, no se guarda.
- Fase de grupos con 1 partido + 1 registro de historial, y fase de cuadro con 1 partido. Borrar la de grupos: aviso «junto con 1 partido, 1 registro del historial» → en el servidor 0 de los tres; el partido de la otra fase sigue. Borrar la competición: aviso «1 fase, 1 partido» → 0 restos; los 422 partidos originales intactos.
- `tsc-src`: misma cascada de competición → 0 restos.
- C9 con sesión de presidente: publicar y borrar fase → «Sin permiso: solo un administrador puede hacer esto.», sin escrituras (fase igual, 422 partidos).

## 5.4 · Equipos y usuarios

Cambios:
- **H-42 (cerrado):** `firebase/firestore.rules` deja al presidente escribir `previousNames` e `historyNames` solo en el mismo cambio que renombra y solo con el valor exacto `[nombre anterior] + los que ya había` (máx. 50), con `historyNames` = su `join(' → ')`. Renombrar sin tocarlos sigue valiendo (la APK 1.6.3 lo hace así). `js/profile.js` arma ese valor y parte de una copia fresca del equipo.
- **Borrar equipo** (`js/teams.js`): no se borra un equipo que aparece en partidos, palmarés, YuNaCoins, grupos o cuadros (`groups`, `slotRefs`) o el sorteo; el aviso lo dice y propone «Inactivo». Borrar en cascada destruiría historia de otros clubes. Sin referencias: confirmación, desvincula al presidente (en lote) y borra.
- **Nombre único** (admin y presidente): un equipo no puede tomar el nombre actual ni un nombre anterior de otro (el historial enlaza por nombre y los mezclaría). Solo se valida si el nombre cambia.
- **Un club, un presidente** (`js/users-admin.js`): asignar desde la tabla de usuarios un club que ya tenía cuenta dejaba a las dos vinculadas. Ahora pide confirmación y mueve el vínculo en un lote. `updatePresidentLink` (modal de equipo) también en un lote: antes desvinculaba al presidente anterior y después fallaba al vincular al nuevo (email sin verificar), y el club quedaba sin nadie.
- Guarda de doble clic y `try/catch` en guardar equipo; escapes en nombres anteriores, iniciales del preview y colores; `maxlength=40`; `✕` → SVG; rol validado; errores con `dbErrorMsg`.

Verificado (`dist`):
- Borrar equipo 1 → «No se puede eliminar "MALVINAS JR": aparece en 20 partidos, 2 fases (grupos o cuadros), el sorteo. Márcalo como Inactivo.» Sin confirmación.
- Nombre de otro equipo (en minúsculas) → bloqueado; nombre anterior de otro equipo → «… es un nombre anterior de MALVINAS JR …».
- Alta con doble clic → 1 equipo; editar sus iniciales sin cambiar el nombre → guarda; borrarlo (sin referencias) → borrado en el servidor.
- Usuarios: asignarle al admin el club 1 (del presidente) → confirmación con los nombres; cancelar → nada cambia; confirmar → admin 1, presidente sin club. Devolverlo al presidente (email sin verificar): la regla rechaza el lote y **el admin conserva el club** (antes el club quedaba sin nadie).
- Presidente: renombrar a «LA BOLSA FC» → «ya es o fue el nombre de otro club», sin escrituras. Renombrar «MALVINAS JR» → «MALVINAS UNITED»: `previousNames` `["MALVINAS JR", "MALVINAS JR."]`, `historyNames` coherente (aceptado por la regla nueva). Tabla histórica pública: «MALVINAS UNITED ⓘ» con sus 137 puntos.
- `tsc-src`: las 4 páginas admin renderizan, 0 errores.

## Pendientes / hallazgos nuevos

- **H-42** (baja, **cerrado en 5.4**). Los presidentes que renombran desde la APK 1.6.3 siguen sin guardar el nombre anterior hasta el próximo release.
- **H-48** (baja, abierto, va a 5.9): el campo «YuNaCoins actuales» del modal de equipo cambia el saldo sin dejar movimiento en `coins` (el historial de YuNaCoins no lo ve).
- **H-49** (media, abierto, va a 5.16): en una temporada finalizada solo la UI bloquea los cambios; el código y las reglas aceptan escribir (p. ej. `deleteComp` llamado desde la consola por un admin). La regla que rechaza escrituras de temporadas archivadas ya está en el alcance de 5.16.
- **H-50** (baja, abierto, va a 7.2): código muerto en `openPhaseModal` (`gpOpts` de `originPhaseId`, no se pinta) y el listener de `pf-tpg` (el input no existe).
- Observación de pruebas: en el SDK compat, `get({source:'server'})` mezcla las escrituras locales pendientes; para ver un rechazo hay que esperar el `commit` o leer por REST.

Acción del dueño: `firebase deploy --only firestore:rules` (la regla de `teams` cambió por H-42). **Hecho 2026-10-19**; `node scripts/rules-drift.mjs`: Firestore y Storage iguales al repo. El resto sale con el merge a `main`.
