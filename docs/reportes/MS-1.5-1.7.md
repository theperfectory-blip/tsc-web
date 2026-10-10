# MS-1.5 / 1.6 / 1.7 · 2026-10-10

## 1.5 Grafo útil
- `tsc-src/.graphifyignore` excluye `assets/vendor`, `trophies-svg`, `graphify-out`.
- Grafo: 2749 → 996 nodos; god nodes ahora `dbGetAll`, `dbGet`, `showToast`, `dbPut`, `dbAdd`.
- `scripts/graphify-label.py` nombra las 22 comunidades por dominio (`graphify update` las resetea; correrlo después).
- Borrado `tsc-src/js/graphify-out/` (checkout principal). Regla GRAPH FIRST restaurada en `CLAUDE.md`.

## 1.6 Git local
- Ramas `perf/carga-latam` y `recovery/yunacoins-pre-reset` borradas (`-d`; tips f3b5039 y 35f9565).
- `git worktree repair` hecho: `D:/Desktop/tsc.web-yunacoins` en `feat/yunacoins-pes5`, limpio. Ruido CRLF de `android/*.gradle` descartado (sin diferencias reales) en ambos checkouts.
- D4: `hosting-dist` ya está en `launch.json` de esta rama. `tsc-yunacoins` NO se commiteó (iría a la rama de yunacoins). El `launch.json` modificado en el checkout principal se pisará al mergear: descartarlo antes.

## 1.7 Disco local (M-7 aprobada: regenerables + APKs v1.4.0–v1.5.3)
- APKs v1.4.0, v1.5.0, v1.5.2, v1.5.3: SHA-256 idéntico al asset de GitHub Release (repo `tsc-web`). Borradas.
- Borrados: `android/app/build`, `dist/`, `www/`, `tsc-src/graphify-out/cache`, `firebase-debug.log`, `functions/firestore-debug.log`.
- v1.3.1 (D2): subida como release histórica (`--latest=false`, SHA-256 verificado) y APK local borrada.
- **Pendiente:** respaldo de `assets-src/trophies-hi` (D3), mover `NEXT_SESSION.md` al worktree de yunacoins.
