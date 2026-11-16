# INTEG-T1 · Integración de la tanda (B, C, F, D+E, A)

Rama de integración: `integ/tanda-t1`, desde `origin/main` 1f24ae6.
Orden de merge (todos `--no-ff`, sin squash): B, C, F, E (que trae D), A.

| Slice | Rama | Commit de cabeza | Reporte |
|---|---|---|---|
| B · lecturas del historial | `fix/lecturas-historial` | dcbe487 | `docs/reportes/HIST-1.md` |
| C · aviso de email sin verificar | `fix/usuarios-club-sin-verificar` | 58eccee | `docs/reportes/USR-CLUB-1.md` |
| F · temporada actual = activa | `fix/temporada-actual-activa` | 3b6437c | `docs/reportes/TEMP-ACTUAL-1.md` |
| D · tope de atributos (base de E) | `feat/tope-atributo-temporada` | 2f2bb4b | `docs/reportes/PES5-TOPE-1.md` |
| E · temporada de cobro | `fix/temporada-de-cobro` | 59a1869 | `docs/reportes/COBRO-1.md` |
| A · archivo de la T3 | `chore/archivo-t3` | f0b6c73 | `docs/reportes/M-13.md` |

## Conflictos y cómo se resolvieron

1. **`tsc-src/graphify-out/GRAPH_REPORT.md`** (en los merges de C, F y E). Conflicto
   esperado: es un artefacto generado. Se tomó la versión de la rama receptora en
   cada paso para cerrar el merge, y al final se **regeneró** con `graphify update .`
   dentro de `tsc-src/` y `scripts/graphify-label.py` (commit `e6746f8`), no a mano.
2. **`tsc-src/js/pes5-tool.js`** (merge de E, que trae D, sobre F). Auto-merge sin
   conflicto de texto. Se verificó a mano que están las dos intenciones:
   - F: el título del tope extra dice «temporada activa» (y el caso sin temporada dice
     «No hay temporada activa…»).
   - E: `_temporadaCobro()` en cobro, GASTO y topes extra; la guardia
     `_validarCobroAntesDeEscribir`; la línea «Cobro en: …» en el confirm.
   Nada se eliminó ni se duplicó.
3. **Texto del bloque de topes (cambio de integración, commit `b8a5d23`).** El
   bloque de Reglas mostraba «(actual)» junto a la temporada (contradice F) y no
   tenía el resumen pedido. Se cambió a «(activa)» y se agregó la línea
   «PES5 · 1.ª temporada = T1 · tope 90». Sin cambio de lógica.

Sin conflictos en `data/temporadas/` (A) ni en `ui-utils.js`, `nav.js`, `seasons.js`,
`coins.js`, `mejoras-page.js`, `pes5-yunacoins.js`, `history.js` ni `users-admin.js`.

## Checks

- `node --check` a todos los `tsc-src/js/*.js` y `scripts/*.mjs`: OK.
- `node tools/test-*.js` (todos, incluido `test-yunacoins-rules.js`): OK.
- `node scripts/smoke-parity.mjs`: PARIDAD OK.
- `node scripts/audit-wiring.mjs`: rotos 0, fuera de gramática 0, duplicados 0, IDs 1,
  muertas 3 (ya estaban en main).
- `node scripts/csp.mjs --check`: OK.

## Prueba rápida en el sandbox (tsc-emu :3001, y tsc-emu-dist)

Escenario: T3 archivada, T1 activa, `tsc_season = 1`.

| Punto | tsc-emu (fuente) | tsc-emu-dist |
|---|---|---|
| Arranca en T1 | sí (STATE 2) | sí (STATE 2) |
| Reglas: «PES5 · 1.ª temporada = T1 · tope 90» | sí | sí |
| + en un atributo en 90 bloqueado, con motivo | sí (`Tope de temporada 90: este atributo ya está en 90 y no puede subir.`) | — |
| Coins a T1 | sí (`season: 2`) | — |
| Historial con T3 desde el archivo | 2.826 registros, 636 de T3, 432 de T1 | 2.826, 636, 432 |

Consola: sin errores de la corrida de integración (los errores que aparecen son de
intentos previos con mock de carpeta en la misma pestaña).

## Pendientes conocidos (anotados en sus reportes, no tocados)

- Cobro parcial de la Tool si `dbAdd` falla a mitad (E).
- Un solo `tsc_season`: el público y el admin comparten la temporada seleccionada (F).
- Dos temporadas activas a la vez: no cubierto por ningún slice.
- Voseo de `pes5-tool.js:522` («elegí la carpeta de nuevo»), ya estaba en main.
