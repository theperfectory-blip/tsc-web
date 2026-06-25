# Pre-slice — Macro Slice B · Palmarés Visual
> Orden maestro: **C → A → B → D**. B arranca con C y A estables (no rediseñar sobre shell viejo).
> B = visual/render/performance. **B NO crea backend ni admin de fotos** (eso es D).

## Objetivo
Reemplazar el Palmarés público actual por la experiencia visual del prototipo, usando datos reales existentes, **sin** crear todavía administración ni persistencia de fotos.

## Alcance (entra)
- Reemplazar la vista inline `tr-room` por la **vitrina `.mv-*`** del prototipo (datos reales).
- Sala fullscreen **`#sala`**: podio, luces, humo, placa, navegación entre copas/campeones y trofeo 3D.
- **Three.js + Draco self-hosted** (sin CDN); libs vendoreadas en el proyecto, cargadas sin build step.
- Reusar los **GLB de copas existentes**; no tocar administración de copas.
- Desmontar `tr-room`/`initTrophyRoom` (evitar rAF duplicados).
- `prefers-reduced-motion` en humo/luces/partículas/cards.

## Datos reales (sin cambios de modelo)
`palmares`, `palmares-comps`, `teams`, campeón vigente/overrides. Sin nuevo store, sin nuevo admin, sin cambios de schema.

## Contrato con Slice C (consume)
- Renderiza dentro del container estable **`page-palmares`**.
- Pausa la animación inline con el evento **`tsc:public-section-visible`** de C.
- La sala fullscreen es overlay → se pausa/desmonta **al cerrar** (independiente del scroll).

## Contrato que EXPONE para Slice D
- Provider interno tipo **`setSalaCollage(items)`** / **`getPalmaresMedia(ownerKey)`** (firma a fijar en B).
- En B el collage se renderiza **vacío** (ambiente/luces/humo) si no hay items.
- **Sin placeholders mock** ("MOMENTO DEL CAMPEÓN N") en producción.
- D llenará este contrato sin modificar el render principal de la sala.

## Fuera de alcance (NO entra)
- Backend/persistencia/admin de fotos (Slice D).
- Cloudinary, Firestore media, `palmares-media`.
- Gestión/admin de copas.
- Internals de otras secciones, admin, `live.js`.

## Archivos a tocar / a NO tocar
- **Tocar:** `palmares.js` (vitrina `.mv-*` + sala `#sala` + desmontar `tr-room`), `palmares.css`/`redesign.css` (`.mv-*`, `.sala-*`), `index.html` (carga de libs self-hosted + estructura `page-palmares`), `assets/vendor/` (Three.js + decoder Draco wasm/js vendoreados).
- **NO tocar:** `cloudinary.js`, `firebase-config.js`, admin de copas, `live.js`, otras secciones, renderers compartidos.

## Presupuesto de performance (riesgo principal)
- **Desktop:** interacción fluida sin jank en fullscreen.
- **Mobile:** si Three.js/Draco no rinde, **fallback obligatorio** a sala simplificada / poster estático con placa real.
- QA mide: apertura/cierre de la sala, navegación entre copas, pausa offscreen, rAF/CPU.

## Riesgos + mitigaciones
- Three.js/Draco en mobile → fallback definido arriba.
- rAF duplicado (tr-room vs sala) → desmontar `initTrophyRoom`.
- Anclaje geométrico de la copa con el motor nuevo → verificar contra GLB reales.
- Carga de libs sin build → vendoreo + paths del decoder Draco correctos.

## Pasos de ejecución
CP0 (usage ≤10%) → vendorear Three.js+Draco self-hosted → vitrina `.mv-*` con datos reales (reemplaza `tr-room`) → sala `#sala` (podio/luces/humo/placa/nav/trofeo) → desmontar `tr-room`/`initTrophyRoom` → integrar con C (`page-palmares` + `tsc:public-section-visible`) → exponer contrato `setSalaCollage`/`getPalmaresMedia` (vacío) → fallback mobile → QA performance.

## Gates de uso
CP0 `five_hour ≤ 10%` · freeze 65% · cierre estable 75%. Máx 3 subagentes solo-lectura · 1 escritor.

## Criterios de aceptación
- Palmarés carga primero y **no cuelga** browser/capturador.
- Vitrina inline usa **datos reales** y reemplaza visualmente a `tr-room`.
- Sala fullscreen abre/cierra **limpio** en desktop/mobile.
- Three.js/Draco **self-hosted** funciona.
- **Sin mocks** de fotos en producción.
- Sin errores de consola · `node --check` en JS tocado.
- QA responsive + reduced-motion + **pausa offscreen** y al cerrar fullscreen.
- Contrato para D expuesto y documentado.
