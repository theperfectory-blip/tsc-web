# MS-1.1 · Documentos de trabajo cerrado · 2026-10-10

Hallazgo que cierra: H-11 (los documentos de H-11 que quedaban; `FIREBASE_MIGRATION_PLAN.md` ya se borró en 0.3).

## Cambios

- Borrados: `tsc-src/docs/migration/` (SLICE_A.md, SLICE_B.md), `tsc-src/REPORTE_SORTEO_TADA.md`, `tsc-src/REPORTE_TABLA_SCROLL_MOVIL.md` y `docs/firebase-setup-steps.md` (lo cubre `DEPLOY.md`).
- `README.md`: quitado el enlace a `firebase-setup-steps.md` del árbol de `docs/`.
- Siguen en el historial de git.

## Verificación

- `git grep` de los nombres borrados: sin referencias restantes fuera del plan y los reportes.
- `node scripts/build-web.mjs` y `build-www.mjs` corren sin errores.
- Sin cambios de código ni de UI: no hace falta prueba en navegador ni `graphify update`.

## Pendientes

Ninguna acción manual.
