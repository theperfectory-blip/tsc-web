# Contexto para proxima sesion - Macro Slices TSC Web

## Rol de Codex

Codex actua como supervisor/director. Claude Opus/UltraCode ejecuta los cambios, pero antes de cada bloque debe presentar plan, archivos, riesgos y gates. Codex revisa, corrige contradicciones y solo despues se da OK.

No asumir que hay que implementar directamente en este chat nuevo salvo que el usuario lo pida. El protocolo actual es: Claude escribe; Codex supervisa, revisa diffs/reportes, pide evidencias y protege el scope.

## Estado del proyecto

- Repo local: `C:\Users\Administrator\Downloads\tsc.web`
- App local: `cd tsc-src && npx serve .` y abrir `http://localhost:3000`
- Produccion: `https://teamsubscup.web.app/`
- Rama de trabajo: `redesign/migration`
- La migracion consiste en llevar el UI del prototipo al main real, usando datos reales del main, no mocks.
- IndexedDB/browser es la fuente de datos. No hay backend propio.
- `main` no debe tocarse durante estos macro slices.

## Reglas criticas del repo

- Antes de buscar funciones/archivos/dependencias, leer `tsc-src/graphify-out/GRAPH_REPORT.md`.
- Si se modifica codigo, correr `graphify update .` dentro de `tsc-src/` al final.
- Nunca tocar/stagear `tsc-src/js/firebase-config.js` ni `tsc-src/js/cloudinary.js`.
- No usar emojis nuevos en UI. Iconos nuevos deben ser SVG inline estilo Lucide.
- Todo `innerHTML` con datos externos debe escapar con helper seguro.
- No llamar `initRedesignPublic()`: trae mocks/prototipo y puede contaminar el main.
- No depender de `body.redesign`: existe CSS, pero no hay JS que active esa clase.
- No portar `.metro` al calendario main: el main usa `cal-pub-*` / `cal-tl-*`.
- Admin logueado debe poder entrar a vista publica. No bloquear publico por rol.
- No usar `git reset` / `git checkout` destructivo.

## Estado previo de slices 1-3

Los slices anteriores fueron infraestructura, no migracion completa:

- Slice 1: carga de `redesign.css`, `motion.js`, perfil real y scaffolding de `redesign-public.js` gated/IIFE, sin autoboot.
- Slice 2: ticker con datos reales + fix de race async/sequence token + clearance.
- Slice 3: topnav publica sincronizada con `goPublicPage`, oculta en admin.

Todavia falta migrar la mayoria de vistas publicas reales.

## Worktree y cautelas

Hay cambios y archivos ajenos/WIP que no deben stagearse automaticamente:

- `tsc-src/prototype.html` modificado: WIP ajeno/prototipo.
- Untracked conocidos: `.codex/`, `AGENTS.md`, `PRODUCT.md`, `scripts/`, `tsc-src/_hover-lab.html`, assets nuevos, `glb-editor-standalone.html`.
- Staging quirurgico: solo archivos tocados por el slice y, si corresponde, graph regenerado aprobado.

## Macro Slice A - Migracion Publica Core

Objetivo: cerrar la brecha principal del rediseño publico sobre modulos reales del main, sin tocar sala fullscreen ni admin-media.

North-star visual: `renderPubPalmares` real del repo, no el prototipo. El prototipo es referencia visual secundaria; el main es fuente de verdad.

### Vistas y alcance

- Palmarés:
  - Entry: `renderPubPalmares` en `tsc-src/js/palmares.js`.
  - Ya esta rediseñado real con `tr-room`, SVG, fullscreen `renderTrophy3D` + GLB.
  - Solo QA/CSS minimo. Preservar 3D.

- Equipos:
  - Entry: `renderPubTeams` / `renderPubTeamsGrid` en `tsc-src/js/teams.js`.
  - Estado: inline viejo.
  - Accion: re-skin con datos reales.

- Historial:
  - Entry: `renderPubHistory` -> `_renderHistoryFull` y `_renderHistoryStandingsInto` en `tsc-src/js/history.js`.
  - Renderers compartidos publico/admin via `isAdmin`.
  - Accion: re-skin con QA obligatoria en publico/admin y en ambas rutas: partidos + tabla historica.

- Calendario:
  - Entry: `renderPubCalendar` en `tsc-src/js/calendar.js`.
  - Estado: ya usa clases propias `cal-pub-*` / `cal-tl-*`.
  - Accion: QA/baseline. Ajustes menores solo si se ve inconsistente. No portar `.metro`.

- Comps-grid:
  - Entry: `renderPubComps` en `tsc-src/js/phases.js`.
  - Estado: ruta secundaria/orphan. Ningun nav publico real va a `competiciones`; topnav/sidebar usan `panel`.
  - Accion: hardening minimo. No rutear, no borrar, no convertir en nav sin OK.
  - Evitar `COMP_TYPES.icon` global; si hay icono publico, hacerlo local SVG/texto.

- Panel/Competiciones:
  - Entry: `renderPubPanel` en `tsc-src/js/public.js`.
  - Superficie principal del topnav para competiciones.
  - Accion: re-skin ultimo por riesgo. Contiene standings/brackets/matches compartidos.

### Orden aprobado

1. CP0: recibir `/usage`; no arrancar si `five_hour > 10%`.
2. Levantar preview.
3. Equipos.
4. Historial, con QA publico/admin y ambas rutas.
5. Calendario QA/baseline.
6. Comps-grid hardening.
7. Gate intermedio: resumen + capturas + pedir OK para commit #1.
8. Panel, ultimo.
9. Palmarés QA.
10. QA final + capturas.
11. `graphify update .` si hubo cambios de codigo.
12. Reporte final y commit #2 solo con aprobacion.

### Gates de uso

- CP0: `five_hour <= 10%`.
- Freeze de features a `five_hour` 65%.
- Cierre estable a 75%: no mas edicion, solo estabilizar/reportar.

### Subagentes permitidos

Maximo 3, solo lectura/QA. Un solo escritor.

- Auditor lectura: historial compartido, panel/brackets/standings, frontera admin/publico.
- QA/Security lectura: consola, overflow, escapes, no mocks, no initRedesignPublic, admin/public.

### Correcciones tecnicas ya exigidas a Opus

- `public.js`: no agregar `function _esc()` top-level. En classic scripts seria global y podria solaparse. Usar `const esc = ...` function-scoped o helper unico no conflictivo.
- `nav.js`: aprobado borrar stubs muertos `renderPubPanel(){}` / `renderPubHistory(){}` si se toca la zona, con `node --check` + QA real de Panel e Historial.
- `matches.js` si tiene `function _esc(v)` al inicio. Riesgo residual: `renderMatchesList()` no lo usa en todos los nombres/libres que mete en HTML.
- `standings.js` si tiene `_escTxt`. Riesgo residual: `renderGroupTable()` aun inserta algunas ramas raw como `displayName`, `displayIni`, `z.name`.
- `matches.js` y `standings.js` quedan fuera de Macro A salvo decision explicita. Si se tocan, scope se expande y exige QA admin/public porque son compartidos.
- QA debe decir: navegacion publica real Palmarés / Panel / Calendario / Equipos / Historial. `renderPubComps` / `page-competiciones` se prueba manual/directo para hardening, sin agregar nav.

### QA esperada para Macro A

- `node --check` en modulos tocados.
- Navegacion publica real sin errores.
- Admin logueado puede volver a publico.
- Ticker no aparece en admin.
- `window._rdpBooted !== true` y `initRedesignPublic()` no llamado.
- Sin mocks del prototipo.
- Sin dependencia de `body.redesign`.
- Sin emojis nuevos.
- Escape aplicado donde se toque `innerHTML`.
- Palmarés admin y fullscreen/GLB intactos: abrir/cerrar al menos una vez.
- Capturas desktop + mobile de Palmarés, Panel, Equipos, Historial y Calendario. Para Palmarés, capturar estado base/SVG; no capturar con `renderTrophy3D` activo si cuelga capturador.
- Reportar riesgos residuales, especialmente `renderMatchesList` y `renderGroupTable`.

## Macro Slice B - Sala Fullscreen + Admin Media de Campeones

Objetivo: completar la experiencia de sala fullscreen de palmarés y crear el modulo/admin necesario para subir imagenes de campeones por copa/temporada/equipo, conectandolo al carrusel real.

Este slice debe arrancar solo despues de que Macro Slice A este estable o explicitamente congelado.

### Alcance funcional

- Admin palmarés/media:
  - Crear o extender el modulo admin para asociar imagenes de campeon/momentos a records de palmarés, copas, temporadas o equipos segun el modelo real existente.
  - Usar la infraestructura actual de assets/cloudinary si ya existe, sin tocar credenciales ni configs ignoradas.
  - Persistir referencias en IndexedDB con migracion compatible.
  - Permitir cargar/editar/eliminar imagenes sin romper records existentes.

- Sala fullscreen:
  - Usar `palmares.png` como fondo sin focos si aplica.
  - Usar `focos`/PNG separados desde `tsc-src/assets` para controlar capas reales.
  - Las tarjetas/fotos del carrusel deben pasar por detras de los focos reales, no simularlo con efectos sobre el fondo.
  - Mostrar 3 o 4 fotos a la vez.
  - Cada imagen se mueve por separado, no en bloque.
  - Cada tarjeta tiene velocidad propia y rotacion lenta hacia izquierda/derecha.
  - Tarjetas 50% mas grandes que la ultima version mencionada por el usuario.
  - Añadir dos imagenes abajo de otras; solape permitido y deseado.
  - Hacer el carrusel 50% mas rapido que la version previa.

- Atmosfera:
  - Humo visible en sala, con movimiento.
  - Humo reacciona al color/luz del equipo correspondiente.
  - Particulas brillantes mas notorias que la version previa.
  - Particulas flotantes alrededor de la habitacion, aparecen/desaparecen natural y reaccionan a focos/colores.

- Placa campeon:
  - Centrar exactamente la placa dentro del podio.
  - Nada debe sobresalir por fuera del marco de madera.

### Cautelas Macro B

- Palmarés ya tiene GLB/copas ligados al admin "palmares"; no tratarlos como decoracion suelta.
- Hay varias copas GLB en el main. Respetar el vinculo entre admin palmarés y copa seleccionada.
- No degradar `renderTrophy3D`.
- No hardcodear imagenes: carrusel debe alimentarse de datos/admin real.
- No usar mocks permanentes.
- Verificar desktop/mobile/fullscreen.
- Para visuales complejos, usar browser/Playwright/screenshots y checks de no-blank/capas/interaccion.
- Si se usa canvas/WebGL/video para humo/particulas, asegurar rendimiento y fallback.

### Riesgos Macro B

- Romper modelo de palmarés o records existentes.
- Mezclar assets prototipo con datos reales.
- Romper subida Cloudinary/config por tocar archivos ignorados.
- Z-index/capas: fotos deben ir detras de focos y delante/fondo segun corresponda.
- Performance: humo + particulas + GLB + carrusel puede saturar.
- Capturadores pueden colgar con fullscreen 3D; planear QA incremental.

### QA Macro B

- Admin: crear/editar/eliminar imagen asociada y recargar pagina.
- Publico: sala fullscreen muestra fotos reales asociadas.
- Capas: fotos detras de focos PNG.
- Carrusel: 3-4 fotos visibles simultaneamente, movimiento independiente, velocidades distintas, rotaciones lentas.
- Humo visible y coloreado.
- Particulas visibles/notorias y naturales.
- Placa centrada en podio, dentro del marco.
- GLB/copa correcta segun admin palmarés.
- Consola sin errores.
- Mobile y desktop.
- Persistencia tras reload.

## Prompt recomendado para iniciar nuevo chat

Pegar este archivo como contexto y decir:

```md
Actua como Codex supervisor/director del proyecto TSC Web. Estamos en `C:\Users\Administrator\Downloads\tsc.web`, rama `redesign/migration`. Lee primero `tsc-src/graphify-out/GRAPH_REPORT.md`, respeta AGENTS.md, y no implementes sin que yo pida ejecutar. Estamos coordinando a Claude Opus/UltraCode.

Primero revisa el estado actual del repo y confirma si Macro Slice A sigue listo para CP0. Si te paso reporte de Claude, revisalo contra este contexto y responde con instrucciones pegables para Opus. El objetivo inmediato es Macro Slice A; Macro Slice B queda como continuacion para sala fullscreen y admin media de campeones.
```

## Estado mental final

Macro Slice A esta listo para lanzar con Opus/UltraCode al renovar sesion, siempre que `/usage five_hour <= 10%` y el usuario de OK. Macro Slice B no debe mezclarse con A salvo decision explicita. La prioridad es no contaminar el main con prototipo/mocks y preservar los modulos reales ya funcionales.
