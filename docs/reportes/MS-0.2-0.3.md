# MS-0.2 + MS-0.3 · Exclusión en builds y email del admin · 2026-10-10

Hallazgos que cierra: H-02, H-15 (0.2) y H-03 (0.3). Un solo PR.

## Cambios

- `scripts/build-exclude.mjs` (nuevo): `isExcluded()` y `EXCLUDE_NAMES`. Excluye por nombre, en cualquier nivel: `*.md`, `docs`, `trophies-svg`, `graphify-out`, `trophies-upload`, `_cmp`, `node_modules` y dotfiles.
- `build-web.mjs`: usa el módulo compartido en lugar de su `SKIP` local.
- `build-www.mjs`: mantiene su whitelist y además aplica el mismo filtro al copiar.
- `docs/FIREBASE_MIGRATION_PLAN.md` borrado (traía el email del admin, H-03, y también era de H-11) y quitado su enlace en el árbol de `README.md`.

## Verificación

- `node scripts/build-web.mjs` antes/después: `dist/` pasa de 148 a 117 archivos. Salen exactamente 4 `.md` de la raíz, `docs/migration/SLICE_A.md` y `SLICE_B.md`, y los 25 de `trophies-svg/`. Nada más cambia. Cero `.md`, `docs/` o `trophies-svg/` en `dist/`.
- `node scripts/build-www.mjs` antes/después: lista de 105 archivos **idéntica**.
- `git grep` de emails y del handle en el árbol actual: no queda ningún email real. Quedan solo `test@example.com`/placeholders y la URL pública `github.com/theperfectory-blip/tsc-web` (el handle del repo, público por diseño).
- Ninguna referencia en runtime a `trophies-svg` (grep en `js/`, `index.html`, `css/`, `firebase.json`).
- Sin cambios de UI: no hace falta prueba en navegador. Sin cambios de código en `tsc-src`: no se corrió `graphify update`.

## Pendientes

- **M-2** (con el deploy a `main`): tras publicar, confirmar que las URLs de `.md`, `docs/` y `trophies-svg/` responden 404.
- No se reescribe el historial (ver "Descartado"): el email sigue en commits anteriores.
