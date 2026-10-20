# MS-5.9 · YuNaCoins · 2026-10-19

Estado: **CERRADO** (2026-10-19). Cierra H-48. Sin hallazgos de seguridad nuevos.

Cómo se verificó (todo en el sandbox, nunca producción):

- Emuladores de Firestore y Auth, base recargada con `node scripts/emu-seed.mjs sandbox/backup.json --clean`. Primero con la T3 (finalizada) seleccionada, después con una T4 de prueba creada con «Crear» desde `temporadas-admin`.
- `dist` (`tsc-emu-dist`) para el recorrido completo; `tsc-src` (`tsc-emu`) para escritura con fallo a mitad, doble clic y el modal de equipo.
- Estado leído del servidor con `where(...)` + `get({source:'server'})`. Panel del navegador visible.
- `node scripts/smoke-parity.mjs` → `PARIDAD: OK`. `node scripts/audit-wiring.mjs` → 0 handlers rotos (reporte restaurado). No se tocaron reglas ni `functions/`.

## Decisión de H-48

Opciones: (a) que el campo «YuNaCoins actuales» del modal de equipo deje un movimiento por la diferencia, o (b) que el modal no edite el saldo y remita a YuNaCoins. Se eligió **(b)**:

- La sección YuNaCoins ya tiene todo lo necesario (sumar, restar, motivo, nota, historial) y ahora valida el saldo. Con (a) habría una segunda ruta que calcula movimientos, con motivos y validaciones propias, en `teams.js`.
- El modal de equipo guarda con `{...existing, ...data}` a partir de una lectura hecha antes de subir el logo: un saldo editado ahí podía pisar un movimiento hecho entretanto. Sin el campo, el guardado ya no toca `yunacoin`.
- Un ajuste manual se sigue pudiendo hacer: «Agregar» o «Restar» con motivo «Otro» y una nota.
- Un equipo nuevo parte en 0 (antes el modal permitía un saldo inicial sin movimiento); su saldo inicial se carga desde YuNaCoins.

## Cambios

`js/teams.js`
- **H-48 (cerrado):** el modal de equipo muestra el saldo en solo lectura con la indicación de dónde cambiarlo (al crear no hay campo). `_saveTeam` ya no escribe `yunacoin` al editar y crea el equipo con 0.

`js/coins.js`
- **Movimiento y saldo en un lote (H-53):** el registro de `coins` y el saldo del equipo se escriben juntos (`dbWriteBatch`). Antes eran dos escrituras y un corte entre ambas dejaba el movimiento sin saldo (o el saldo sin movimiento).
- **Masivo en un lote:** antes era un bucle de 2 escrituras por equipo (72 para 36 equipos): un corte dejaba a unos equipos con el aumento y a otros sin él. Ahora es un solo lote (máximo 250 equipos; si hubiera más, se niega con aviso).
- **Confirmación del masivo** (no tenía): dice cuántos equipos, cuánto en total y el motivo.
- **Cantidad:** entero de 1 a 1.000.000. `parseInt` aceptaba «12abc» (como 12) y «1.5» (como 1).
- **Restar más de lo que hay:** antes se guardaba el movimiento con el monto pedido y saldo 0 (`before 100, amount 500, after 0`: el historial no cuadraba). Ahora se rechaza en el individual («X tiene 100 coins: no se pueden restar 500») y la vista previa avisa «Saldo insuficiente». En el masivo se resta a cada equipo hasta lo que tiene, el movimiento registra lo restado de verdad y se avisa cuántos quedan en 0.
- **Temporada finalizada:** los movimientos llevan la temporada seleccionada; con una finalizada el código se niega («T3 está finalizada: elige la temporada activa…»). Evita movimientos nuevos dentro de una temporada que 5.14 a 5.16 van a archivar.
- **Doble clic** y errores de red o reglas como aviso con `dbErrorMsg` (antes promesas sin capturar).
- Con 0 equipos, «Mayor saldo» mostraba `-∞`; el buscador se rompía con un equipo sin nombre; el modal de movimiento se rompía si el equipo ya no existía.
- Motivo del masivo limitado a 60 caracteres y nota a 200.

## Verificado (`dist`)

- **Temporada finalizada (T3 seleccionada):** «Agregar 100» → «T3 está finalizada…», 0 movimientos, saldo igual.
- **Doble clic en «Agregar»:** 1 movimiento (`add 100, before 0, after 100, season 2`), saldo 100.
- **Cantidades inválidas** `12abc`, `1.5`, `0`, `-5`, `2000000`, vacío y `1e3`: todas «La cantidad debe ser un número entero entre 1 y 1.000.000»; sin movimientos nuevos.
- **Restar:** 500 con saldo 100 → rechazado (sin cambios); la vista previa muestra «Saldo insuficiente: el equipo tiene 0 coins»; restar 100 → saldo 0.
- **Fallo a mitad (individual):** con una escritura prohibida agregada al lote → «Sin permiso…»; saldo y movimientos sin cambios.
- **Masivo agregar 50:** confirmación «Se agregan 50 coins a cada uno de los 36 equipos activos (1.800 en total)…»; con el fallo inyectado, 0 movimientos y saldos sin cambios; sin fallo, 36 movimientos y 36 saldos (`before 0, after 50`). El motivo `<b>stream</b>` se ve como texto en la confirmación y en el historial (0 elementos `<b>`).
- **Masivo restar 120:** confirmación «Se restan hasta 120 coins a 36 equipos activos (1.870 en total); 35 tienen menos saldo y quedan en 0»; 36 movimientos con monto 50 o 120, todos con `before - amount = after`, saldo mínimo 0.
- **H-48:** el modal de edición no tiene el campo `tf-coins` y muestra el saldo; guardar un cambio de iniciales deja el saldo en 384.730; un equipo nuevo se crea con `yunacoin: 0`.
- **C9 (presidente):** movimiento individual y masivo → «Sin permiso: solo un administrador…»; 0 movimientos nuevos, saldo igual.
- **`tsc-src`:** fallo a mitad → 0 movimientos y saldo sin cambios; doble clic → 1 movimiento, saldo +25; modal de equipo sin campo de saldo.
- **Consola:** solo errores provocados (rechazos de reglas) y los del arranque sin sesión ya conocidos del sandbox.

## Pendientes / hallazgos nuevos

- **H-48** (**cerrado**).
- Límite conocido, sin hallazgo: el saldo se calcula con la lectura del momento de guardar. Dos administradores moviendo coins del mismo equipo a la vez podrían pisarse; con un solo administrador (hoy) no ocurre.
- Para M7: `_esc` local de `coins.js` y el escape en línea de la columna Presidente siguen siendo copias del helper de `sanitize.js` (C7).

Acción del dueño requerida: ninguna (sin cambios de reglas ni de functions). Sale con el merge a `main`.
