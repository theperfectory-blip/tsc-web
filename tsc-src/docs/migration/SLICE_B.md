# Macro Slice B · Palmarés Visual
> **Estado: COMPLETADO · 2026-07-02.** Implementación, hardening y QA cerrados en `redesign/migration`.
> **Commit de cierre:** `df28209` (`Cierra Slice A y Palmarés`).
> Documento conservado como registro de alcance, decisiones técnicas y criterios de aceptación.

> **v4 (2026-06-30) tras corrección de fidelidad.** La implementación pública usa la vitrina `.mv-*` y la sala `#sala` del prototipo con datos reales. Three.js/Draco cargan perezosamente desde `assets/vendor/three/`; `model-viewer` y `tr-room` fueron retirados; la sala conserva lifecycle `start/stop/dispose`, token anti-race, fullscreen accesible, 24 partículas y fallback SVG sin WebGL ni `Smoke` en mobile.
> Orden maestro: **C → A → B → D**. B arranca con C y A estables.

## Brújula (2026-06-25)
La lógica gana solo en datos/permisos/persistencia; en **layout/estética/motion gana el prototipo**. La sala es estética pura → fidelidad alta exigida (efectos completos, no simplificados).

## Objetivo
Reemplazar el Palmarés público actual (`tr-room` + `<model-viewer>`) por la experiencia visual del prototipo (vitrina `.mv-*` + sala fullscreen `#sala`), con datos reales, **sin** crear admin ni persistencia de fotos (eso es D).

## Estado real verificado
- Render actual: vitrina `.mv-*` fiel al prototipo y sala fullscreen `#sala`. No quedan consumidores de `<model-viewer>`, `tr-room` ni una segunda implementación pública. Los GLB siguen viniendo de Firebase Storage y caen a SVG ante fallo de carga.
- Prototipo: **Three.js 0.147.0 build global** (no ESM/importmap) vía unpkg (prototype.html:3858-3860) + GLTFLoader + DRACOLoader + decoder Draco (3875). La implementación real de B conserva esa base, pero la carga será **lazy y self-hosted**. La sala corre `renderer.setAnimationLoop` (3981) + canvas de humo (4082) + timers de collage (3684).

## Alcance (entra)
- Reemplazar la vista inline `tr-room` por la **vitrina `.mv-*`** del prototipo (datos reales).
- Sala fullscreen **`#sala`** completa (ver "Capas de la sala").
- **Three.js + Draco self-hosted** (sin CDN) y **carga perezosa**. Copiar `three.min.js` + `GLTFLoader.js` + `DRACOLoader.js` + carpeta `draco/` (decoder wasm/js) a `assets/vendor/`. Build legacy global, sin build step, sin scripts globales al arranque.
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
PNG de la sala → **`tsc-src/assets/`** (canónicos, sin duplicar):
- `tsc-src/assets/sin_fondo.png` = piso+podio real
- `tsc-src/assets/foco_izquierdo.png`
- `tsc-src/assets/foco_derecho.png`
- `tsc-src/assets/placa_dorada.png`
- `tsc-src/assets/tsc_sin_fondo.png` = logo del topbar, no foreground de sala

Libs self-hosted → **`tsc-src/assets/vendor/three/`**: `three.min.js` (0.147.0), `GLTFLoader.js`, `DRACOLoader.js`, y `tsc-src/assets/vendor/three/draco/` (decoder wasm/js). Setear el `DRACOLoader.setDecoderPath('assets/vendor/three/draco/')`.

Más la **matemática `salaLayout`/`SALA_IMG`** (prototype.html:3761-3789): proyecta la copa Three.js sobre el PNG de piso/podio con métricas medidas a mano (`ped:{cx:744,contact:568...}`). **Este anclaje 2.5D es el verdadero esfuerzo de B**, no las libs. **Verificar/recalibrar las métricas si los PNG finales difieren en tamaño de los del prototipo.**

## Datos reales (sin cambios de modelo)
`palmares`, `palmares-comps`, `teams`, campeón vigente/overrides. Sin nuevo store, sin nuevo admin, sin cambios de schema.

## Contrato con Slice C (consume)
- Renderiza dentro de **`page-palmares`** (estable).
- La vitrina inline pausa con **`tsc:public-section-visible`** de C.
- La sala fullscreen es overlay accesible (`role="dialog"`, `aria-modal`, foco inicial, trap de foco, Escape y devolución al disparador).
- Lifecycle obligatorio: `start/stop/dispose` para copa/canvas/audio/listeners. `closeSala` debe parar **`CUP.stop()` + `_stopSalaSmoke()` + `_stopCollage()`** y evitar contexts/canvas duplicados.

## Contrato que EXPONE para Slice D (CORREGIDO)
- Provider interno **`setSalaCollage({ recordId, items, colors })`** / **`getPalmaresMedia(recordId)`**, que devuelve `{ items, colors }`.
  - **Identifica por `recordId`** (el `id` del registro `palmares`), NO por la tripleta `comp|season|teamId` (`season` es opcional → frágil; ver D).
  - **Lleva también los colores del club** (`c1`/`c2`): el collage **recolorea cada shot por club** (`g.addColorStop(1, lightenForLight(c.c1))`, prototype.html:3692) → el contrato no es "array plano".
- En B el collage se renderiza **vacío** (ambiente/luces/humo) si no hay items. **Sin placeholders mock** ("MOMENTO DEL CAMPEÓN N").
- B debe **derivar el `recordId` del campeón activo** (la sala navega por índices `_compIdx`/`_champIdx`, 3647-3665 → mapear a `recordId`).

## Regresión visual intermedia (declarar al usuario)
El prototipo muestra hoy **mock canvas** ("MOMENTO DEL CAMPEON · N", prototype.html:3700). B entrega el collage **VACÍO** (sin placeholders) hasta que D aterrice → la sala se verá **más pobre que el prototipo** en el interín. **El usuario debe aceptar este gap temporal** (B→D).

## Fuera de alcance (NO entra)
Backend/persistencia/admin de fotos (D) · Cloudinary/Firestore media/`palmares-media` · admin de copas · internals de otras secciones/admin/`live.js`.

## Archivos a tocar / NO tocar
**Tocar:** `palmares.js` (vitrina `.mv-*` + sala `#sala` + `salaLayout`/`Smoke`/partículas/haces + desmontar `tr-room`), `palmares.css` (**`.mv-*` nuevo**), `redesign.css` (**reusar `.sala-*` existente, no portarlo de nuevo**), `index.html` (logo conservado + retiro de consumidores CDN), **`assets/vendor/three/`** (Three.js 0.147.0 + GLTFLoader + DRACOLoader + `draco/`).
**NO tocar:** `cloudinary.js`, `firebase-config.js`, admin de copas, `live.js`, otras secciones, renderers compartidos.

## Presupuesto de performance (riesgo principal)
- **Desktop:** interacción fluida sin jank en fullscreen (prototipo capa pixelRatio a 2, 3916).
- **Mobile:** `<=760px` o `pointer:coarse` → **fallback OBLIGATORIO** a SVG, sin WebGL ni `Smoke`.
- QA mide: apertura/cierre, navegación 4-dir, recarga GLB al cambiar comp, pausa offscreen, rAF/CPU, teardown completo (`CUP.stop`/`_stopSalaSmoke`/`_stopCollage`).

## Riesgos + mitigaciones
- Anclaje geométrico (copa sobre PNG) → portar los 4 PNG + `salaLayout` exacto; verificar contra GLB reales (la copa "flota" si falla).
- `Smoke` complejo → portarlo completo (no simplificar a blur) o aplicar reduced-motion.
- rAF múltiples (tr-room 1273 + setAnimationLoop 3981 + smoke 4082 + collage 3684) → desmontar `tr-room` + lifecycle `start/stop/dispose`.
- Carga GLB asíncrona vieja mostrando la copa equivocada → proteger con token anti-race por request.
- Mobile → fallback definido.
- Libs sin build → vendoreo + paths del decoder Draco correctos.

## Pasos de ejecución
CP0 (≤10%) → corregir logo roto en `index.html` → vendorear Three.js+Draco (`assets/vendor/`) → vitrina `.mv-*` con datos reales (reemplaza `tr-room`) → sala `#sala` (capas 1-13: collage vacío, viñeta, foreground PNG+`salaLayout`, haces bicolor, `Smoke`, focos PNG, **24 partículas**, copa Three.js, placa PNG, nav 4-dir, audio) → desmontar `tr-room`/`initTrophyRoom` → integrar con C (`page-palmares`+evento) → exponer contrato `setSalaCollage({recordId,items,colors})`/`getPalmaresMedia(recordId)` (vacío) → fallback mobile SVG → QA performance + teardown.

## Gates de uso
CP0 `five_hour ≤ 10%` · freeze 65% · cierre 75%. Máx 3 subagentes solo-lectura · 1 escritor.

## Criterios de aceptación
- [x] Palmarés carga primero y **no cuelga** browser/capturador.
- [x] Vitrina `.mv-*` con **datos reales** reemplaza `tr-room`.
- [x] Sala fullscreen abre/cierra **limpio** desktop/mobile, con **todas las capas** (foreground PNG, haces bicolor, `Smoke`, 24 partículas, focos PNG, placa PNG, nav 4-dir, audio).
- [x] Three.js/Draco **self-hosted** (sin CDN). 4 PNG canónicos reutilizados.
- [x] Three.js/Draco **self-hosted y lazy** (sin CDN ni carga global inicial).
- [x] `salaLayout` ancla la copa sobre el podio.
- [x] **Collage VACÍO sin mocks** cuando no hay medios.
- [x] Contrato para D expuesto: `setSalaCollage({recordId,items,colors})`/`getPalmaresMedia(recordId)`.
- [x] Teardown: copa + `Smoke` + collage + listeners al cerrar; sin rAF huérfano (`tr-room` desmontado).
- [x] Token anti-race en GLB.
- [x] Fullscreen accesible.
- [ ] Sin errores propios de consola y `node --check`; reduced-motion y pausa offscreen tienen ramas explícitas, pero reduced-motion requiere validación dinámica en un navegador/OS configurado para reducir movimiento.

## Cierre de fidelidad y medios — 2026-07-01

- `.mv-stage` ocupa toda la cuadrícula y el cálculo 2.5D usa su rectángulo completo; al salir se neutraliza y reduced-motion no registra seguimiento.
- La placa muestra `CAMPEÓN ·` seguido únicamente por temporada, juego y año existentes. La administración marca temporada/juego faltantes.
- Cada título expone `Editar | Imágenes (N) | Quitar`. La galería persiste como `record.gallery[{url,alt}]`, conserva campos desconocidos, limita a siete HTTPS y no guarda `File` ni base64.
- El administrador admite subida múltiple con `uploadImageToCloud`, estados por archivo, retry, orden drag/botones, alt, quitar URL y bloqueo durante guardado/subidas.
- `getPalmaresMedia(recordId)` prioriza override runtime válido, luego `record.gallery`, y finalmente vacío; collage y animaciones se desmontan antes de cambiar registro y al cerrar.
- El tema local se crea de forma lazy tras interacción, comparte el AudioContext existente, cruza ambiente/sala, respeta sonido/volumen global y pausa al salir sin duplicar source/nodos.
- Mobile `<=760px` o `pointer:coarse` usa SVG sin WebGL ni Smoke. Los doce campeones conservan navegación con scroll interno, controles reservados, labels útiles y targets 44×44.
- QA visual comparativo `/` vs `/prototype`: 1440×900, 768×900 y 390×844. Cinco copas remotas cargaron en fullscreen; diez ciclos dejaron un único canvas Smoke estructural y cero canvas WebGL/slots al cerrar.
- No había sesión admin ni registros persistidos con 1/3/7 imágenes durante QA; esos escenarios y reload de galería quedan como verificación manual pendiente con datos reales.
