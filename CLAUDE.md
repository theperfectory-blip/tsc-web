@AGENTS.md

## Rama 2.0 — LEER PRIMERO si estás en `tsc.web-yunacoins`

Esta carpeta es el worktree de la rama `feat/yunacoins-pes5` (Web 2.0: editor de jugadores, PES5, YunaCoins). La web en producción vive en la otra carpeta, `tsc.web`, fija en `main`.

- El flujo completo (cuándo mergear `main`, cuándo hacer el PR, hotfixes, checklist de "2.0 lista") está en **[`WORKFLOW_2.0.md`](WORKFLOW_2.0.md)**. Seguirlo antes de cualquier operación de git que no sea commit/push a esta rama.
- **Nunca** `git checkout` a otra rama dentro de esta carpeta. Nunca mergear esta rama en `main` fuera del PR final.
- Push a esta rama no despliega nada. Las reglas de Firestore sí son globales: solo agregar, no cambiar las existentes.

## Específico de Claude

### graphify

El grafo de conocimiento del proyecto está en `tsc-src/graphify-out/`.

- **GRAPH FIRST:** antes de buscar en el código, consultar
  `tsc-src/graphify-out/GRAPH_REPORT.md` (god nodes y comunidades con nombre
  de dominio). `assets/vendor` está excluido vía `tsc-src/.graphifyignore`.
- Si existe `tsc-src/graphify-out/wiki/index.md`, navegarlo en vez de leer
  archivos crudos.
- Después de modificar código en la sesión, correr `graphify update .`
  dentro de `tsc-src/` (solo AST, sin costo de API) y luego
  `python ../scripts/graphify-label.py` para restaurar los nombres de
  comunidad (los toma del archivo dominante de cada una: si se agrega un
  módulo, sumarlo a `FILE_NAMES` en ese script).

### Íconos

Regla de `AGENTS.md` → UI: nunca emojis, siempre SVG inline estilo Lucide.
Vale también para cualquier texto visible que Claude genere en la app.
