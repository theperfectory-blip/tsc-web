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
- [ ] **Flujo completo de punta a punta en local contra datos reales.** Verificado en el sandbox: el presidente crea un pedido de mejora desde `mejoras.html` y queda `pendiente` con todos los campos permitidos. Falta la prueba con el save real de PES5: aplicar en la Tool y ver el resultado en el juego. Es el gate previo 2.
- [x] **YunaCoins: dirección del sync decidida.** Plan B (copiar y pegar con Loyalty) implementado; Plan A por API pospuesto a 2.1.
- [x] **Reglas de Firestore desplegadas y verificadas.** Ruleset `4bb7d57b`, `rules-drift` igual.
- [x] **`prototipo_yunas/` limpia.** La investigación está en `docs/2.0/investigacion/` con README; los scripts en `tools/pes5/`; el HTML duplicado borrado.
- [ ] **Probado en la APK Android (Capacitor), además del navegador.** La APK 2.0.0 está compilada y firmada; falta instalarla en el teléfono y repetir la prueba. Es el gate previo 1.
- [x] **`versionCode`/`versionName` en 2.0.0.** `versionCode 21`, `versionName "2.0.0"` en `android/app/build.gradle`.
- [x] **`graphify update .` corrido y `GRAPH_REPORT.md` commiteado.**
- [x] **Merge de `main` hecho el mismo día del PR.** Al preparar este PR, `git rev-list --count feat/yunacoins-pes5..main` da 0. Se vuelve a verificar al mergear.

## Pospuesto a 2.1

- **Plan A de Streamlabs por API.** La pestaña YunaCoins deja el transporte `api` deshabilitado y oculta el flujo manual cuando está activo. Hoy no hay implementación detrás. Ver `docs/2.0/investigacion/MACRO_SLICE_STREAMLABS.md`.
- **Slice G (nivelación).** Espera a Luis.

## Gate previo a la fusión

Estas pruebas las hacen Jimbo o el supervisor antes del merge:

1. APK 2.0.0 en el teléfono (`adb install -r`): arranque y splash, Mejoras (plantilla, editor, formación vertical), Tool PES5 en modo móvil (pedidos, rechazo, YunaCoins). La APK lee producción: solo navegación; escrituras únicamente con Jimbo presente.
2. Tool PES5 en PC con el save real: aplicar un pedido de mejora y uno de formación; guardias 4.D; selector de clubes.
3. Plan B con una cuenta de prueba (nunca la de un presidente).

## Riesgos y cómo verificar en producción después del merge

- **Splash:** la página carga y sale del splash en `teamsubscup.web.app`, sin quedarse colgada al recargar en el panel admin.
- **Mejoras como presidente:** la plantilla del equipo aparece, el editor abre, el saldo y el bono de suscriptores se muestran y un pedido de prueba queda `pendiente`.
- **Tool como admin:** la sección carga, el selector de clubes no permite duplicados y las plantillas desactualizadas muestran el aviso.
- **YunaCoins:** la pestaña muestra el estado de la última sincronización y el transporte `manual`.
- **Bundle:** confirmar que el JS servido es el nuevo (hash en `index.html`) antes de dar por bueno el deploy.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
