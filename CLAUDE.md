@AGENTS.md

## Específico de Claude

### graphify

El grafo de conocimiento del proyecto está en `tsc-src/graphify-out/`.

- **GRAPH FIRST — SUSPENDIDA hasta cerrar el slice 1.5** de
  `docs/MACRO_SLICE_DEBUGGING.md`: el grafo actual está contaminado por
  `assets/vendor` (three.js/draco) y sus comunidades no tienen nombre, así
  que leerlo en cada tarea gasta tokens sin orientar. Mientras tanto:
  `grep` dirigido y lectura por rangos. Al cerrar 1.5, restaurar esta regla.
- Si existe `tsc-src/graphify-out/wiki/index.md`, navegarlo en vez de leer
  archivos crudos.
- Después de modificar código en la sesión, correr `graphify update .`
  dentro de `tsc-src/` (solo AST, sin costo de API).

### Íconos

Regla de `AGENTS.md` → UI: nunca emojis, siempre SVG inline estilo Lucide.
Vale también para cualquier texto visible que Claude genere en la app.
