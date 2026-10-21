# MS-7.6 · Cierre documental y reporte final del macro de debugging · 2026-10-20

Estado: **CERRADO** (2026-10-20, Opus). Con este slice se cierran M7 y el plan `docs/MACRO_SLICE_DEBUGGING.md` completo (M0 a M7).

## Cambios de este slice

- **`SECURITY.md`:**
  - **XSS:** la sección se reescribió con lo que hay hoy: escape único, CSP en enforce sin `'unsafe-inline'`, `data-on*` sin eval y `emu-xss` para verificar.
  - **Reglas:** se agregaron las de las temporadas archivadas y los tests de reglas por rol (CI y `rules-drift`).
  - Se actualizaron la auditoría y la fecha de revisión.
- **`README.md`:**
  - La estructura ahora es corta y remite al mapa de `AGENTS.md`, en vez de mantener una copia vieja.
  - «Correr localmente» avisa que `localhost` usa la base real y remite al sandbox.
  - Se corrigieron el setup (las configs públicas sí están en git) y el comando de deploy de reglas.
  - Se sacó «En desarrollo», que estaba desactualizado, y se agregó el estado del plan.
  - Tests y arquitectura remiten a `AGENTS.md`. Para una feature nueva: escape y `data-onclick`.
- **`CONTRIBUTING.md`:**
  - Remite a `AGENTS.md` y al sandbox.
  - Nueva sección «Seguridad en el HTML»: escape, `data-on*` y sin emojis.
  - Ejemplos de datos con la API real (`dbGetAll`, `dbPut`, `dbWriteBatch`, `dbSubscribe`), en lugar del `db.getAll` que no existe.
  - Testing con el sandbox y los chequeos sin navegador.
- **`AGENTS.md` / `CLAUDE.md`:**
  - «Trabajo en curso» pasa a «Plan de debugging (cerrado)», con lo que queda pendiente.
  - La nota de graphify explica el nuevo etiquetado.
  - `events.js`, `boot-splash.js`, la regla de handlers y la CSP ya se habían agregado en 7.5.
- **Grafo:** `scripts/graphify-label.py` ahora nombra cada comunidad por su archivo dominante (`FILE_NAMES`), no por su número. Los números cambian en cada `graphify update`: en esta corrida, «Promo APK» había quedado sobre el generador de fechas y «Navegación» sobre el sorteo. Grafo regenerado: 24 comunidades, todas con nombre.

## Resumen del macro (2026-10-09 → 2026-10-20)

| Macro | Qué dejó |
|---|---|
| M0 Hotfix | XSS crítico vía `teams.logo` cerrado (H-01); la web deja de servir documentos internos (H-02) |
| M1 Repo | `AGENTS.md` canónico y `CLAUDE.md` que lo importa; exclusión de build compartida; grafo útil y con nombres; git y disco saneados |
| M2 Pruebas | Sandbox de emuladores con copia real (escrituras sin riesgo), paridad `tsc-src`/`dist`, auditor de cableado, arranque resistente a fallos, espejo en memoria verificado, lecturas por visita medidas |
| M3 Seguridad | Escape en todos los sinks, reglas endurecidas con tests por rol en el CI, drift de reglas, CSP (Report-Only una semana, luego enforce), API keys y preset de Cloudinary restringidos |
| M4 Público | Las 9 secciones públicas verificadas por sección |
| M5 Admin | Las secciones admin con cascadas sin huérfanos; escrituras atómicas (partidos, cruces, calendario, import con reversión); equipos y usuarios sin nombres duplicados; temporadas archivadas en archivos fijos (lecturas por visita en el sandbox: 1.102 → 114) |
| M6 Backend | Cloud Functions revisadas y desplegadas; dependencias; APK 1.6.3 con Capacitor parcheado |
| M7 Limpieza | Un solo escape (H-22), código muerto y rama IndexedDB fuera (D6, H-23), CSS y assets sin uso fuera, delegación de eventos y CSP sin `'unsafe-inline'` (H-05), docs al día |

Todos los slices se verificaron en el sandbox, en `dist` y en `tsc-src`; la producción se tocó solo para leer. Cada uno tiene su reporte en `docs/reportes/`.

## Lo que queda

**Acciones del dueño:**
- **Merge a `main`** de la rama `claude/m5-modelo-5.4`, con un PR por macro. Lleva M4, M5 y M7, publica la CSP sin `'unsafe-inline'` y el resto del código.
- **M-11:** después de ese merge, `curl -sD - -o /dev/null https://teamsubscup.web.app/` debe mostrar `Content-Security-Policy:` sin `-Report-Only` y sin `'unsafe-inline'` en `script-src`. Además, un inicio de sesión desde el celular.
- **M-15: APK 1.7.0** (`versionCode 20`). La APK lleva su propia copia del código web, así que la 1.6.3 (2026-10-11) no tiene nada de lo posterior: M5, temporadas archivadas y M7. Build firmado y verificado el 2026-10-21 (abajo); falta publicarlo en GitHub Releases y probar la actualización desde la app en un teléfono real.
- **M-13:** requiere M-15 publicado y unas semanas para que la gente actualice: la 1.6.3 no lee `data/temporadas/` y, después de «Liberar Firestore», no mostraría la T3. Cuando la T3 termine, finalizarla en la app. Después Claude genera su archivo (`season-archive.mjs --season 1`, `--verify`), se publica y se usa «Liberar Firestore».

**Decisiones de reglamento o producto (hallazgos abiertos):**
- **H-52:** desempate directo entre 3 o más empatados (¿mini-liga?).
- **H-57:** clasificado que cambia con el cruce ya jugado (¿avisar o bloquear?).
- **H-62:** imágenes de Cloudinary huérfanas al borrar un título.

**Bajos, abiertos o aceptados** (detalle en la tabla de hallazgos del plan):
- **H-32:** `fcmTokens` ajenos.
- **H-33:** dedup de push no atómico (aceptado).
- **H-34:** batch de push con un límite de unos 150 destinatarios.
- **H-36:** `esbuild` sin uso en `devDependencies`.
- **H-38:** la iframe de Auth en móvil genera una violación de CSP inocua.
- **H-39:** texto «hoy» después de medianoche.
- **H-54:** nombre de criterio con número; se corrige al archivar la T3.
- **H-56:** grupos de 17 o más equipos a doble vuelta no se pueden regenerar en un lote.
- **H-61:** vínculos del sorteo viejos tras editar la fase.
- **H-63:** SheetJS sin SRI.
- **H-64:** la reversión de un import grande pisa ediciones concurrentes.

**Prioridad acordada con el dueño (2026-10-21):** ahora solo el merge y M-11; después, la APK 1.7.0 (M-15, decidida el mismo día). M-13 queda para cuando termine la T3, en unas semanas. Las decisiones (H-52, H-57, H-62) y los hallazgos bajos quedan en stand-by: no bloquean y se retoman más adelante desde esta lista y la tabla de hallazgos del plan.

## APK 1.7.0 (2026-10-21)

Se decidió subir a 1.7 y no a 1.6.4 por la cantidad de cambios acumulados. Rama `claude/apk-1.7.0`, bump en `fac6a47` sobre `main` (`d7728f1`, ya con M4, M5 y M7).

- `npm ci`, `npm run build:www`, `npx cap sync android`, `gradlew clean :app:assembleRelease` con el keystore de siempre.
- `aapt2 dump badging`: `versionCode='20' versionName='1.7.0'`.
- `apksigner`: `CN=TEAM SUBS CUP, OU=TSC, O=TSC, L=Unknown, ST=Unknown, C=AR`, SHA-256 `7727c9a7…ef802a72` (el de siempre).
- Bundle web dentro del APK: los 95 archivos de `js/`, `css/`, `data/` y `assets/` idénticos a `tsc-src/`; `index.html` solo difiere por la meta CSP (`script-src` sin `'unsafe-inline'`).
- Emulador (Android 16, instalación limpia; el emulador tenía una debug con otra firma): arranca, carga Palmarés y Competiciones desde producción (solo lectura), los `data-onclick` responden y Configuración → Actualizaciones dice «Ya tienes la última versión (v1.7.0)».
- SHA-256 del archivo: `6f55a70c8eef2b58d851418a174cad0f5f00c70baab1687e12e6f6cea778b725` (para la nota del release).

Acción del dueño requerida: M-11; M-15 (publicar la 1.7.0); M-13 cuando termine la T3 y la gente ya haya actualizado.
