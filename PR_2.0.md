# Web 2.0: editor de jugadores, PES5 y YunaCoins

PR de `feat/yunacoins-pes5` a `main`. Cierra la 2.0 según `WORKFLOW_2.0.md` §5.
Spec: `docs/MACRO_SLICE_2.0_CIERRE.md`.

## Qué trae la 2.0

- **Slice 1 · Tool PES5 y editor dentro del panel admin, sin iframe.** La Tool se carga bajo demanda al entrar a la sección. [Reporte](docs/reportes/2.0-1.md)
- **Slice 2 · Formación táctil en `mejoras.html`.** La formación se mueve con el dedo, además de las flechas. [Reporte](docs/reportes/2.0-2.md)
- **Slice 3 · Tool en dos modos.** Móvil/APK: pedidos, rechazo, reglas y YunaCoins. PC: lectura y escritura del save. [Reporte](docs/reportes/2.0-3.md)
- **Slice 3b · Splash colgado al recargar en una sección admin.** Hotfix ya en `main`. [Reporte](docs/reportes/2.0-3b.md)
- **Slice 3c · Rediseño visual de `mejoras.html` (presidente), teléfono primero.** [Reporte](docs/reportes/2.0-3c.md)
- **Slice 3d · Formación vertical en el teléfono.** Cancha de pie, sin cruz en táctil. [Reporte](docs/reportes/2.0-3d.md)
- **Slice 4 · Núcleo YunaCoins y Plan B.** Ledger con marca de sincronizado, cobro sin sobregiro, pestaña YunaCoins para copiar y pegar con Loyalty, guardias de frescura, bono de suscriptores como tope y transporte apagable. [Reporte](docs/reportes/2.0-4.md)
- **Slice 5 · Limpieza, reglas, versión 2.0.0 y APK.** `prototipo_yunas/` fuera de `tsc-src/`, allowlist en las colecciones nuevas, plantillas desactualizadas por equipo, `versionCode 21` / `versionName "2.0.0"`. [Reporte](docs/reportes/2.0-5.md)
- **Slice 6 · Cierre y arreglos de la prueba con el save real.**
  - 6.B: aviso de carpeta de la Tool en móvil.
  - 6.G: tabla de Pedidos con estilo, botones deshabilitados visibles, contador de pedidos de Mejoras, y Publicar integrado en la pestaña Pedidos.
  - 6.H: la Tool rechaza los pedidos armados sobre una plantilla desactualizada (antes podía deshacer una mejora ya pagada); Mejoras bloquea el envío mientras haya cambios aplicados sin publicar; «Publicar» no reescribe equipos sin cambios.

## Colecciones nuevas en Firestore

Todas nuevas en esta rama. Reglas ya desplegadas a producción (ruleset `4bb7d57b`, `rules-drift` igual al repo). **Sin cambios en colecciones existentes.**

| Colección | Quién escribe | Regla |
|---|---|---|
| `pedidos_pes5` | El presidente crea (solo para su equipo, con `estado: pendiente`); el admin aplica o rechaza; el autor cancela mientras esté pendiente | Create con allowlist (pedido de mejora o de formación), límites: `lines` ≤ 150, `formacion.slots` ≤ 11, strings ≤ 100 |
| `pes5_bloqueos` | Admin o presidente de ese equipo | Allowlist del presidente: `por, uid, nombre, desde, latido` |
| `pes5_config` | Solo admin | Lectura para cualquier usuario logueado |
| `pes5_plantillas` | Solo admin | Cada presidente lee solo la de su equipo |

Las reglas se prueban con `npm run test:rules` (33 + 426 + 31 casos, en verde).

## Checklist de `WORKFLOW_2.0.md` §5

- [x] **Editor de jugadores integrado como sección de la web**, con login, equipos y coins reales. El prototipo suelto se borró en el slice 5.
- [x] **Flujo completo de punta a punta en local contra datos reales.** 2026-11-08, sandbox + save real de PES5 en Chrome: selector de clubes (rechaza repetidos), publicar, pedido de mejora y de formación desde `mejoras.html`, aplicar en la Tool con guardias 4.D, cobro en `teams.yunacoin`, backup automático en `backups-tsc/` y valores verificados leyendo el save escrito.
- [x] **YunaCoins: dirección del sync decidida.** Plan B (copiar y pegar con Loyalty) implementado; Plan A por API pospuesto a 2.1.
- [x] **Reglas de Firestore desplegadas y verificadas.** Ruleset `4bb7d57b`, `rules-drift` igual.
- [x] **`prototipo_yunas/` limpia.** La investigación está en `docs/2.0/investigacion/` con README; los scripts en `tools/pes5/`; el HTML duplicado borrado.
- [x] **Probado en la APK Android (Capacitor), además del navegador.** 2026-11-08: APK 2.0.0 instalada sobre la 1.7.0 en un vivo Y28s (misma firma, sesión conservada). Arranque, Tool PES5 en modo móvil, Mejoras (plantilla, editor, formación vertical), solo navegación contra producción.
- [x] **`versionCode`/`versionName` en 2.0.0.** `versionCode 21`, `versionName "2.0.0"` en `android/app/build.gradle`.
- [x] **`graphify update .` corrido y `GRAPH_REPORT.md` commiteado.**
- [x] **Merge de `main` hecho el mismo día del PR.** Al preparar este PR, `git rev-list --count feat/yunacoins-pes5..main` da 0. Se vuelve a verificar al mergear.

## Pospuesto a 2.1

- **Plan A de Streamlabs por API.** La pestaña YunaCoins deja el transporte `api` deshabilitado y oculta el flujo manual cuando está activo. Hoy no hay implementación detrás. Ver `docs/2.0/investigacion/MACRO_SLICE_STREAMLABS.md`.
- **Slice G (nivelación).** Espera a Luis.
- **Pedidos válidos tras una publicación nueva.** Hoy, si Luis publica cambios de un equipo, sus pedidos pendientes anteriores se rechazan y el presidente pide de nuevo. Para aceptarlos hay que guardar en cada pedido la vista del presidente, lo que requiere cambiar la regla de create.
- **Menú admin en móvil** no se cierra al elegir una sección (comportamiento de `main`).

## Gate previo a la fusión

1. APK 2.0.0 en el teléfono: **hecho** (ver checklist).
2. Tool PES5 en PC con el save real: **hecho** (ver checklist).
3. Plan B (copiar y pegar con Loyalty) con `@TheRationalUser`: **pendiente, se hace en producción después del merge** (decisión de Jimbo, 2026-11-08). Hasta entonces no se usa el Plan B con cuentas de presidentes.

Decisión de producto: la Tool cobra pedidos aunque no haya temporada activa (Jimbo, 2026-11-08).

## Riesgos y cómo verificar en producción después del merge

- **Splash:** la página carga y sale del splash en `teamsubscup.web.app`, sin quedarse colgada al recargar en el panel admin.
- **Mejoras como presidente:** la plantilla del equipo aparece, el editor abre, el saldo y el bono de suscriptores se muestran y un pedido de prueba queda `pendiente`.
- **Tool como admin:** la sección carga, el selector de clubes no permite duplicados y las plantillas desactualizadas muestran el aviso.
- **YunaCoins:** la pestaña muestra el estado de la última sincronización y el transporte `manual`.
- **Bundle:** confirmar que el JS servido es el nuevo (hash en `index.html`) antes de dar por bueno el deploy.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
