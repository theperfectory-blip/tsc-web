@AGENTS.md

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
  comunidad (si cambian los módulos, ajustar `NAMES` en ese script).

### Íconos

Regla de `AGENTS.md` → UI: nunca emojis, siempre SVG inline estilo Lucide.
Vale también para cualquier texto visible que Claude genere en la app.
