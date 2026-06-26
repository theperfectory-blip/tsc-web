# Pre-slice — Macro Slice B · Palmarés Visual
> **v2 (2026-06-25) tras auditoría de código.** Corrige el alcance: el esfuerzo real NO es vendorear Three.js (build global 0.147.0, trivial), sino **portar los 4 PNG de la sala + la matemática `salaLayout` + el sistema `Smoke` + partículas/haces bicolor**. Enumera los efectos como ítems de fidelidad (no "etc."), corrige el contrato para D (lleva campeón+colores, identifica por `recordId`), y declara la regresión visual intermedia (collage vacío) hasta que D aterrice.
> Orden maestro: **C → A → B → D**. B arranca con C y A estables.

## Brújula (2026-06-25)
La lógica gana solo en datos/permisos/persistencia; en **layout/estética/motion gana el prototipo**. La sala es estética pura → fidelidad alta exigida (efectos completos, no simplificados).

## Objetivo
Reemplazar el Palmarés público actual (`tr-room` + `<model-viewer>`) por la experiencia visual del prototipo (vitrina `.mv-*` + sala fullscreen `#sala`), con datos reales, **sin** crear admin ni persistencia de fotos (eso es D).

## Estado real verificado
- Render actual: `tr-room` (palmares.js:811), `initTrophyRoom` (1194), `renderTrophy3D` (441) con **`<model-viewer>`** + GLB desde **Firebase Storage** (`_TROPHY_STORAGE_BASE`, 416; tag 450-464); móvil/sin-GLB cae a SVG (445-447). El `tr-room` corre un **rAF perpetuo** (1273) cancelado por MutationObserver al salir del DOM (1485-1496).
- Prototipo: **Three.js 0.147.0 build global** (no ESM/importmap) vía unpkg (prototype.html:3858-3860) + GLTFLoader + DRACOLoader + decoder Draco (3875). La sala corre `renderer.setAnimationLoop` (3981) + canvas de humo (4082) + timers de collage (3684).

## Alcance (entra)
- Reemplazar la vista inline `tr-room` por la **vitrina `.mv-*`** del prototipo (datos reales).
- Sala fullscreen **`#sala`** completa (ver "Capas de la sala").
- **Three.js + Draco self-hosted** (sin CDN). **Self-host = trivial:** copiar `three.min.js` + `GLTFLoader.js` + `DRACOLoader.js` + carpeta `draco/` (decoder wasm/js) a `assets/vendor/`. Build legacy global, sin build step.
- Reusar los **GLB de copas existentes** (Firebase Storage); no tocar admin de copas.
- Desmontar `tr-room`/`initTrophyRoom` (evitar rAF duplicado) — **necesario** (hay rAF perpetuo en 1273).
- `prefers-reduced-motion` en humo/luces/partículas/cards (el prototipo: `.sala-particles{animation:none}`, `.sala-smoke-canvas{display:none}`, prototype.html:356-357).

## Capas de la sala (TODAS son fidelidad, no "etc.")
La sala del prototipo (prototype.html:1379-1417, CSS 103-367) tiene, por z:
1. `.sala-room` — pared gradiente.
2. `.sala-collage` — **collage de momentos** (en B se renderiza VACÍO; lo llena D). Recolorea por club.
3. `.sala-wall-vignette` — viñeta sobre las fotos.
4. `.sala-foreground` — **piso+podio = PNG con alfa** (`sin_fondo.png`), anclado vía `salaLayout`.
5. `.sala-beam left/right` + `.sala-beam-glow` — **2 haces de luz coloreados por los 2 colores del club** (`_renderChamp`, 3633-3641).
6. `.sala-smoke-canvas` — **humo volumétrico canvas 2D** (clase `Smoke`, 3998-4092): focos de emisión móviles, viento global, gusts. **Sistema complejo, no blur estático.**
7. `.sala-focos` — **focos PNG** (`foco_izquierdo.png`/`foco_derecho.png`), anclados.
8. `.sala-particles` — **24 partículas/sparks** posicionadas a mano (248-271), bicolor por club.
9. `.sala-cup` — copa Three.js.
10. `.sala-plate` — **placa dorada PNG** (`placa_dorada.png`) + texto campeón.
11. `.sala-nav` — `.sala-dots` (stories) + `.sala-comp` + mute + cerrar.
12. **Navegación 4-direcciones:** ↑/↓ campeón, ←/→ competición (teclado 4117-4124 + swipe). Recarga GLB al cambiar comp (`salaPickComp`→`CUP.setCup`, 3660).
13. **Audio:** `AUDIO.enterSala()` al abrir + botón mute (el real ya tiene `playPalmZoom`/`playPalmDing`, palmares.js:664/687).

## Assets a portar (FALTABA en v1 — crítico) · RUTAS FINALES FIJADAS
PNG de la sala → **`tsc-src/assets/sala/`**:
- `tsc-src/assets/sala/sin_fondo.png` (piso+podio, alfa real). **Ya existe `tsc-src/assets/tsc_sin_fondo.png` sin commitear** → mover/renombrar a esta ruta final y commitear.
- `tsc-src/assets/sala/foco_izquierdo.png`
- `tsc-src/assets/sala/foco_derecho.png`
- `tsc-src/assets/sala/placa_dorada.png`

Libs self-hosted → **`tsc-src/assets/vendor/three/`**: `three.min.js` (0.147.0), `GLTFLoader.js`, `DRACOLoader.js`, y `tsc-src/assets/vendor/three/draco/` (decoder wasm/js). Setear el `DRACOLoader.setDecoderPath('assets/vendor/three/draco/')`.

Más la **matemática `salaLayout`/`SALA_IMG`** (prototype.html:3761-3789): proyecta la copa Three.js sobre el PNG de piso/podio con métricas medidas a mano (`ped:{cx:744,contact:568...}`). **Este anclaje 2.5D es el verdadero esfuerzo de B**, no las libs. **Verificar/recalibrar las métricas si los PNG finales difieren en tamaño de los del prototipo.**

## Datos reales (sin cambios de modelo)
`palmares`, `palmares-comps`, `teams`, campeón vigente/overrides. Sin nuevo store, sin nuevo admin, sin cambios de schema.

## Contrato con Slice C (consume)
- Renderiza dentro de **`page-palmares`** (estable).
- La vitrina inline pausa con **`tsc:public-section-visible`** de C.
- La sala fullscreen es overlay → se pausa/desmonta **al cerrar** (independiente del scroll). `closeSala` debe parar **`CUP.stop()` + `_stopSalaSmoke()` + `_stopCollage()`** (prototype.html:4105-4114).

## Contrato que EXPONE para Slice D (CORREGIDO)
- Provider interno **`setSalaCollage({ recordId, items, colors })`** / **`getPalmaresMedia(recordId)`**.
  - **Identifica por `recordId`** (el `id` del registro `palmares`), NO por la tripleta `comp|season|teamId` (`season` es opcional → frágil; ver D).
  - **Lleva también los colores del club** (`c1`/`c2`): el collage **recolorea cada shot por club** (`g.addColorStop(1, lightenForLight(c.c1))`, prototype.html:3692) → el contrato no es "array plano".
- En B el collage se renderiza **vacío** (ambiente/luces/humo) si no hay items. **Sin placeholders mock** ("MOMENTO DEL CAMPEÓN N").
- B debe **derivar el `recordId` del campeón activo** (la sala navega por índices `_compIdx`/`_champIdx`, 3647-3665 → mapear a `recordId`).

## Regresión visual intermedia (declarar al usuario)
El prototipo muestra hoy **mock canvas** ("MOMENTO DEL CAMPEON · N", prototype.html:3700). B entrega el collage **VACÍO** (sin placeholders) hasta que D aterrice → la sala se verá **más pobre que el prototipo** en el interín. **El usuario debe aceptar este gap temporal** (B→D).

## Fuera de alcance (NO entra)
Backend/persistencia/admin de fotos (D) · Cloudinary/Firestore media/`palmares-media` · admin de copas · internals de otras secciones/admin/`live.js`.

## Archivos a tocar / NO tocar
**Tocar:** `palmares.js` (vitrina `.mv-*` + sala `#sala` + `salaLayout`/`Smoke`/partículas/haces + desmontar `tr-room`), `palmares.css`/`redesign.css` (`.mv-*`, `.sala-*`), `index.html` (`<script>` de libs self-hosted + estructura `page-palmares`), **`assets/vendor/three/`** (Three.js 0.147.0 + GLTFLoader + DRACOLoader + `draco/`), **`assets/sala/`** (4 PNG: `sin_fondo`/`foco_izquierdo`/`foco_derecho`/`placa_dorada`).
**NO tocar:** `cloudinary.js`, `firebase-config.js`, admin de copas, `live.js`, otras secciones, renderers compartidos.

## Presupuesto de performance (riesgo principal)
- **Desktop:** interacción fluida sin jank en fullscreen (prototipo capa pixelRatio a 2, 3916).
- **Mobile:** B **aumenta** el coste vs el actual (model-viewer ya cae a SVG en móvil) → **fallback OBLIGATORIO** a sala simplificada / poster estático con placa real.
- QA mide: apertura/cierre, navegación 4-dir, recarga GLB al cambiar comp, pausa offscreen, rAF/CPU, teardown completo (`CUP.stop`/`_stopSalaSmoke`/`_stopCollage`).

## Riesgos + mitigaciones
- Anclaje geométrico (copa sobre PNG) → portar los 4 PNG + `salaLayout` exacto; verificar contra GLB reales (la copa "flota" si falla).
- `Smoke` complejo → portarlo completo (no simplificar a blur) o aplicar reduced-motion.
- rAF múltiples (tr-room 1273 + setAnimationLoop 3981 + smoke 4082 + collage 3684) → desmontar `tr-room` + teardown en `closeSala`.
- Mobile → fallback definido.
- Libs sin build → vendoreo + paths del decoder Draco correctos.

## Pasos de ejecución
CP0 (≤10%) → vendorear Three.js+Draco (`assets/vendor/`) → portar 4 PNG (`assets/`) → vitrina `.mv-*` con datos reales (reemplaza `tr-room`) → sala `#sala` (capas 1-13: collage vacío, viñeta, foreground PNG+`salaLayout`, haces bicolor, `Smoke`, focos PNG, 24 partículas, copa Three.js, placa PNG, nav 4-dir, audio) → desmontar `tr-room`/`initTrophyRoom` → integrar con C (`page-palmares`+evento) → exponer contrato `setSalaCollage({recordId,items,colors})`/`getPalmaresMedia(recordId)` (vacío) → fallback mobile → QA performance + teardown.

## Gates de uso
CP0 `five_hour ≤ 10%` · freeze 65% · cierre 75%. Máx 3 subagentes solo-lectura · 1 escritor.

## Criterios de aceptación
- [ ] Palmarés carga primero y **no cuelga** browser/capturador.
- [ ] Vitrina `.mv-*` con **datos reales** reemplaza `tr-room`.
- [ ] Sala fullscreen abre/cierra **limpio** desktop/mobile, con **todas las capas** (foreground PNG, haces bicolor, `Smoke`, 24 partículas, focos PNG, placa PNG, nav 4-dir, audio).
- [ ] Three.js/Draco **self-hosted** (sin CDN). 4 PNG portados.
- [ ] `salaLayout` ancla la copa sobre el podio sin flotar.
- [ ] **Collage VACÍO sin mocks** (gap intermedio aceptado hasta D).
- [ ] Contrato para D expuesto: `setSalaCollage({recordId,items,colors})`/`getPalmaresMedia(recordId)`.
- [ ] Teardown: `CUP.stop`+`_stopSalaSmoke`+`_stopCollage` al cerrar; sin rAF huérfano (`tr-room` desmontado).
- [ ] Sin errores de consola · `node --check` · reduced-motion + pausa offscreen.
