# MS-1.2 · 1.3 · Docs y releases · 2026-10-10

Hallazgos que cierra: H-12, H-13.

## Cambios

- 1.2: `PROTOCOLO_VERIFICACION.md` y `MACRO_SLICE_UPDATER.md` movidos de `tsc-src/` a `docs/` (`git mv`). El updater queda como "implementado en v1.5.0" (primer tag con `updater.js`, commit `275c62f`). Rutas actualizadas en comentarios de `updater.js` y `push.js`. `docs/reportes/` ya existía.
- 1.3: `releases/android/` borrado del repo (notas y `update.json`). `docs/android-build.md`: ejemplo de `adb install` apunta al APK de build local y se agregó el paso del SHA-256 en la nota del release. `SECURITY.md` dice que el SHA-256 va en la nota del release de GitHub. `README.md`: árbol y enlace de distribución corregidos.

## Verificación

- `git grep` de `releases/android`, `PROTOCOLO_VERIFICACION` y `MACRO_SLICE_UPDATER`: sin referencias rotas.
- Solo cambian comentarios en JS; sin cambios de UI.

## Pendientes

`CLAUDE.md`/`AGENTS.md` enlazarán el protocolo en 1.4.
