# MS-7.1 · Un solo helper de escape · 2026-10-20

Estado: **CERRADO** (2026-10-20, Sonnet). Cierra H-22. Sin hallazgos de seguridad nuevos.

## Cambios

Se borraron 21 copias locales del escape HTML y todos sus usos pasan por `escHtml` / `escAttr` de `js/sanitize.js` (que ya carga justo después de `state.js`, antes que cualquier otro módulo; las copias solo se llamaban en tiempo de ejecución, así que el orden no cambia).

- `_esc` (calendar, coins, competitions, history, matches, palmares, phases, teams), `_authEsc`, `_bkEsc`, `_escOpt`, `_dataEsc`, `_lmEsc`, `_pbEsc`, `_pfEsc`, `_tkEsc`, `_escTxt`, `escTxt`, `_presEsc`, `_updEsc`, `_uaEsc`, el `esc` local de `renderPubPanel` y `escapeHtml` de `sorteo.js`: eran idénticas a `escHtml`.
- Tres escapes parciales (`&`, `<`, `>` sin comillas) pasan al completo: `tEsc` en `matches.js` (2), `nm` en `bracket.js`, el mensaje de error de `history.js` y el `String(p).replace(...)` en línea de `coins.js`. El resultado es un superconjunto del anterior; la salida visible no cambia.
- `palmares.js` tenía `_escAttr` = `_esc` + acento grave (`&#96;`). Para preservarlo, `escAttr` de `sanitize.js` ahora también escapa el acento grave (inocuo en cualquier atributo, y lo decodifica el navegador antes de que corra un handler inline).

Diferencias de semántica revisadas:

- `escapeHtml` de `sorteo.js` hacía `String(s)` sin tratar `null`: mostraba «null». Todos sus usos pasan nombres de bombo, equipo, fase o presidente; con `escHtml` un valor ausente queda vacío. Es el único cambio visible posible y solo con datos faltantes.
- `_dataEsc` usaba `??` (también cubre `undefined`); `escHtml` cubre `null` y `undefined` por igual.

## Verificación

- `node --check` de todos los `js/`; no quedan `.replace(/[&<>` fuera de `sanitize.js`.
- `node scripts/smoke-parity.mjs` → PARIDAD: OK. `node scripts/audit-wiring.mjs` → 0 rotos (reporte restaurado). `node scripts/csp.mjs --check` OK. `build-web.mjs` y `build-www.mjs` sin error.
- Sandbox (emuladores, base recargada con `emu-seed --clean`), panel del navegador visible:
  - `dist` (`tsc-emu-dist`): 6 páginas públicas como anónimo, 14 páginas admin con sesión admin y 5 públicas con presidente, todas con contenido.
  - `tsc-src` (`tsc-emu`): 6 públicas y 14 admin.
  - Cero errores no capturados ni promesas rechazadas; en consola solo el 400 del arranque sin sesión que ya existía. `escAttr('a`<"')` → ``a&#96;&lt;&quot;``.
- Sin cambios de reglas ni de functions.

## Pendientes / hallazgos nuevos

- H-22 **cerrado**. Sin hallazgos nuevos.

Acción del dueño requerida: ninguna.
