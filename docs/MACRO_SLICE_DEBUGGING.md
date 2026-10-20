# Macro Slice — Debugging integral, seguridad y saneamiento · 2026-10-09

> Base auditada: **v1.6.2** (`origin/main` @ `6fac4b1`, versionCode 18).
> Estado: **plan aprobado para ejecución, nada implementado todavía.**
> Cada slice se ejecuta, verifica y cierra por separado (un commit o un PR
> por slice o por macro). Los hallazgos de partida (`H-xx`) salen del
> reconocimiento del 2026-10-09 y están verificados en código, en el
> historial de git o contra la web publicada; cada slice los vuelve a
> confirmar antes de tocar nada.

---

## 0. Reglas de este macro

1. **localhost = producción.** No hay sandbox hasta cerrar el slice 2.1.
   Hasta entonces, toda verificación en navegador corre con
   `window.__TSC_READONLY__ = true` según `PROTOCOLO_VERIFICACION.md`
   (pasa a `docs/` en el slice 1.2). Ningún flujo de escritura se prueba
   contra producción.
2. **Verificar las dos variantes.** Desde v1.6.2 la web publicada no sirve
   `tsc-src/`: sirve `dist/`, que genera `scripts/build-web.mjs` con los JS
   concatenados en bundles. Toda verificación de UI se hace en `tsc-src`
   (`npx serve tsc-src`) **y** en `dist` (config `hosting-dist`, emulador
   de hosting en `:5050`).
3. **Las reglas se prueban en el emulador** antes de que el dueño las
   despliegue. El CI no despliega reglas (ver H-07).
4. **Escape obligatorio.** Todo `innerHTML` con datos que escribe un rol no
   admin pasa por el helper único que crea el slice 0.1.
5. **Sin emojis en la UI**: íconos SVG inline estilo Lucide (regla de
   `CLAUDE.md`).
6. **Cierre de cada slice:** checklist de seguridad pre-commit de
   `CLAUDE.md` · `graphify update .` dentro de `tsc-src/` si cambió código ·
   reporte breve en `docs/reportes/MS-<n>.<m>.md` (nunca en `tsc-src/`,
   porque se publica).
7. **Acciones destructivas** (borrar archivos locales, ramas, datos) solo
   con aprobación explícita del dueño en el momento, aunque estén en este
   plan.

---

## 1. Decisiones pendientes del dueño

| # | Decisión | Recomendación | Bloquea |
|---|---|---|---|
| D1 | `firebase-config.js` y `cloudinary.js`: ¿commiteados a propósito, como dice `SECURITY.md`? | Sí: son config pública. Corregir `CLAUDE.md` y `.gitignore` | 1.4 |
| D2 | APK **v1.3.1**: es la única copia (no está en GitHub Releases) | Subirla como release histórica y luego borrarla del disco | 1.7 |
| D3 | `assets-src/trophies-hi` (55 MB, originales de los trofeos en alta, sin respaldo en ningún lado) | Respaldar fuera del disco (Drive o un repo privado de assets) | 1.7 |
| D4 | Cambios sin commitear en `main` (`.claude/launch.json`: configs `tsc-yunacoins` y `hosting-dist`) | Commitear `hosting-dist` (este plan la usa). `tsc-yunacoins` a la rama de yunacoins | 1.6, 2.x |
| D5 | Fuente única de instrucciones: `AGENTS.md` y `CLAUDE.md` son idénticos | `AGENTS.md` canónico (Codex no sigue imports); `CLAUDE.md` = `@AGENTS.md` | 1.4 |
| D6 | Rama IndexedDB de `db.js`: ¿fallback offline o código muerto? | Evidencia lista (MS-2.4): muestra datos inventados sin aviso. Recomendado: sacarla y mostrar error de conexión | 7.2 |
| D7 | Auto-registro abierto: cualquiera puede crear cuenta (`role: president`, sin equipo) | Mantenerlo, pero con verificación de email y reglas endurecidas (3.2) | 3.7 |
| D8 | Temporadas cerradas: ¿siguen en Firestore, editables y leídas en cada visita? | **Decidido por el dueño (2026-10-10):** cada temporada finalizada pasa a un archivo JSON fijo en el repo, de solo lectura para todos (también el admin). El público la ve completa desde el selector. Sus datos se borran de Firestore con respaldo. Va en M5. Primera: T3 (última de PES 4) | 5.14–5.16 |

## 2. Acciones manuales del dueño

Estas acciones no se pueden ejecutar desde el repo:

| # | Acción | Cuándo |
|---|---|---|
| M-1 | `firebase deploy --only firestore:rules` | Al cerrar 0.1 |
| M-2 | Merge a `main` (dispara el deploy de hosting por CI) | Al cerrar el macro 0, y luego por macro |
| M-3 | `firebase deploy --only firestore:rules,storage` | Al cerrar 3.2 y 3.3 · **hecho 2026-10-11** |
| M-4 | Google Cloud Console: restringir las 2 API keys (web por referrer, Android por paquete + SHA-1) | Slice 3.6 · **hecho 2026-10-11** |
| M-5 | Cloudinary: restringir el preset unsigned (formatos, tamaño máximo, carpeta fija) | Slice 3.6 · **hecho 2026-10-11** |
| M-6 | (Opcional) Dar el rol "Firebase Rules Admin" a la service account del CI para desplegar reglas desde el workflow | Slice 3.4 |
| M-7 | Aprobar el borrado de archivos locales (lista exacta en 1.7) | Slice 1.7 |
| M-8 | Confirmar el borrado de los documentos de T3 en Firestore, después del deploy del archivo y de verificar el respaldo | Slice 5.16 |
| M-9 | `firebase deploy --only functions` (runtime Node 22) y probar una vez el botón de "stream de hoy" | Slice 6.1 · **hecho 2026-10-11** (deploy y prueba del botón con un partido de prueba: aviso "juega hoy" y, a los 65 s, "a continuación", a 2 tokens, ambos con éxito) |
| M-10 | Publicar un release nuevo de la APK (`versionCode 19` / `1.6.3`, build firmado con tu keystore y `update.json`) con Capacitor parcheado, y probarlo en un teléfono real: inicio de sesión, token de notificaciones guardado, un aviso recibido y la actualización 1.6.2 → 1.6.3 desde la app. Pasos en `docs/reportes/MS-6.2-6.3.md` | Slices 6.2 y 6.3 (H-37, H-38) · **hecho 2026-10-11**: release `v1.6.3` publicado (APK firmado con la clave de siempre, `update.json` con `versionCode 19`); pruebas en teléfono real hechas por el dueño |
| M-11 | **Recordatorio, al terminar todo (después del merge final a `main`):** comprobar que la CSP quedó en enforce. Desde cualquier terminal: `curl -sD - -o /dev/null https://teamsubscup.web.app/` (en PowerShell, `curl.exe -sD - -o NUL https://teamsubscup.web.app/`) debe mostrar `Content-Security-Policy:` sin `-Report-Only`. Después abrir la web en el celular e iniciar sesión. Si algo se rompe, volver la clave a `-Report-Only` en `firebase.json` y desplegar | Después del merge final (cierre de 3.5) |

---

## 3. Hallazgos de partida

### Seguridad

| ID | Sev. | Hallazgo | Evidencia |
|---|---|---|---|
| H-01 | **Crítica** | XSS almacenado vía `teams.logo`. Un presidente puede escribir cualquier string en `logo` y ese valor se inserta sin escapar en `<img src="…">`. El código corre en el navegador del admin, así que es una escalada de presidente a admin | Regla `firebase/firestore.rules:39` (allowlist de campos sin validar valores). Sinks: `bracket.js:54`, `bracket.js:1352`, `teams.js:92`, `teams.js:150`, `playoff.js:326`, `sorteo.js:967`, `history.js:1660` |
| H-02 | Alta | La web publicada sirve documentos internos. Responden 200: `PROTOCOLO_VERIFICACION.md`, `REPORTE_*.md`, `docs/migration/*.md`, `trophies-svg/convert.mjs` | `scripts/build-web.mjs` copia todo `tsc-src/` menos `graphify-out`, `trophies-upload`, `node_modules` y `_cmp` |
| H-03 | Alta | El repo es público e identifica la cuenta y el email del admin | `docs/FIREBASE_MIGRATION_PLAN.md:23` |
| H-04 | Media | Storage `logos/**` admite escritura de cualquier autenticado (cualquiera, por D7), sin límite de tamaño ni tipo. Además no se usa: las subidas van por Cloudinary | `firebase/storage.rules:12` |
| H-05 | Media | No hay CSP. Hay más de 200 `innerHTML` y unos 300 handlers `onclick=` inline | `firebase.json`, `tsc-src/index.html` |
| H-06 | Media | `users.create` no tiene allowlist de campos. Ni create ni update validan tipos ni tamaños (`displayName`, `photoURL`, `username`) | `firebase/firestore.rules` (bloque `users`) |
| H-07 | Media | Las reglas se despliegan a mano, así que producción puede diferir del repo | Nota en `.github/workflows/firebase-hosting.yml` |
| H-08 | Media (**cerrado** 2026-10-11) | Estaban sin restringir (medido 2026-10-11, restringidas en 3.6): las 2 API keys de Google (web y `google-services.json`) y el preset unsigned de Cloudinary | Consolas externas |
| H-09 | Baja | `.gitignore` lista `firebase-config.js` y `cloudinary.js`, pero están trackeados. Contradice `CLAUDE.md` y `SECURITY.md` | `git ls-files -ci --exclude-standard` |

Barrido del historial completo (todas las ramas): sin claves privadas,
service accounts, keystores, `.env`, ni tokens de GitHub, AWS, Stripe o
Slack. `client_secret` y `refresh_token` aparecen solo como texto en docs de
`feat/yunacoins-pes5`, sin valores.

### Repositorio y documentación

| ID | Hallazgo |
|---|---|
| H-10 | `CLAUDE.md` y `AGENTS.md` son idénticos y quedaron en junio: describen IndexedDB sin backend, al mapa de código le faltan unos 15 módulos y no mencionan `dist/`, los bundles ni `build-www` |
| H-11 | Docs de trabajo cerrado sin ninguna referencia: `tsc-src/docs/migration/SLICE_A.md`, `SLICE_B.md` (completados 07-02), `tsc-src/REPORTE_SORTEO_TADA.md`, `tsc-src/REPORTE_TABLA_SCROLL_MOVIL.md`, `docs/firebase-setup-steps.md` (Fase 0, junio), `docs/FIREBASE_MIGRATION_PLAN.md` (migración terminada; además es H-03) |
| H-12 | `releases/android/` en git quedó en v1.5.3. GitHub Releases va en v1.6.2 y es de donde lee el actualizador (`updater.js:66`) |
| H-13 | `tsc-src/MACRO_SLICE_UPDATER.md` dice "nada implementado", pero `updater.js` existe y lo cita |
| H-14 | El grafo está contaminado por `assets/vendor` (los god nodes `copy`, `set` y `add` son de three.js), las comunidades no tienen nombre y hay una corrida suelta en `tsc-src/js/graphify-out/` |
| H-15 | `build-web.mjs` (hosting) y `build-www.mjs` (APK) tienen listas de exclusión distintas |
| H-16 | Ramas locales ya mergeadas: `perf/carga-latam`, `recovery/yunacoins-pre-reset`. El worktree `D:\Desktop\tsc.web-yunacoins` tiene el enlace a git roto: se movió desde `Downloads` |
| H-17 | Disco local: unos 1,1 GB regenerables o duplicados (ver 1.7) y 2 elementos sin respaldo (D2, D3) |

### Datos, cableado y código

| ID | Hallazgo |
|---|---|
| H-18 | **Espejo en memoria nuevo (v1.6.2)**: `db.js` abre un `onSnapshot` por colección y sirve `dbGetAll` desde memoria. Es código nuevo y central, sin verificación independiente. Riesgos: datos viejos después de escrituras propias o transacciones, listeners que no se cierran, fallback silencioso, y costo de leer colecciones completas a medida que crece el historial |
| H-19 | `importDB` en modo sobrescribir borra registro por registro, sin atomicidad: si falla a mitad, la base queda medio vacía (`data.js:145`) |
| H-20 | En `dist`, un error al cargar un módulo corta el resto de su bundle; antes solo cortaba ese archivo. Hoy no se verifica `dist` |
| H-21 | No hay entorno aislado: los flujos de escritura del admin no se pueden probar sin riesgo |
| H-22 | Unas 20 copias de la función de escape; 8 de ellas se llaman `_esc` y comparten el scope global |
| H-23 | Si el SDK de Firebase no carga, `USE_FIRESTORE` queda en `false`. Hay que verificar si en ese caso la app corre sobre un IndexedDB local vacío y `seedInitialData` siembra 60 equipos falsos (`ui-utils.js:628`) |
| H-24 | Assets: 75 MB en `tsc-src/assets` (trofeos `.glb`, `palmares_theme.mp3` de 4,7 MB, PNG de 1,6 a 2,2 MB con su par `.webp` ya generado) |
| H-25 | `functions/` declara Node 20, que está fuera de soporte desde 2026-04-30. **Cerrado en 6.1** (Node 22, deps sin vulnerabilidades; falta el deploy, M-9) |
| H-26 | La ruta pública `competiciones` existe en `nav.js:263`, pero ningún `goPublicPage('competiciones')` apunta a ella. **Resuelto en 4.3:** es inalcanzable (`goPublicPage` y `focusPublicSection` la redirigen a `panel`); `renderPubComps`, `#page-competiciones` y `#pub-comps-content` son código muerto, va a 7.2 |
| H-27 | `loadBracketLogos` (`bracket.js:1341`) nunca pinta logos: busca el nombre del equipo en ids `blogo-<fase>_r<n>_m<n>-a/b`, que no lo contienen. El bracket admin solo muestra iniciales (hallado en 0.1). **Cerrado en 5.7** (`data-team-id`) |
| H-28 | H-01 tenía un 8.º sink de `logo` (`standings.js:806`, corregido en 0.1). Quedan sinks de `teams.name` sin escape fuera de los archivos de 0.1; los mitiga la regla nueva (sin `<>` desde el presidente). Barrido en 3.1 |
| H-29 | Guardar o borrar un equipo tarda minutos: `saveTeam`/`deleteTeam` → `notifyTeamChanged` → `refreshHistoryForSeason` reescribe con `appendOrUpdateHistory`, uno por uno y en serie, cada partido jugado de la temporada (422, ~820 ms cada uno en el emulador: ~6 min con el modal abierto). Hallado en 2.1, va a 2.5 |
| H-30 | `openPlayoffLegModal` recibe los nombres de los equipos y `savePlayoffLeg` los guarda como `teamA`/`teamB` del partido en vez de los ids; `getWinner` compara contra ids. Latente: en el snapshot no hay legs de playoff guardados así. Hallado en 3.1. **Cerrado en 5.7** (el modal recibe ids; `_plTeamId` normaliza datos viejos) |
| H-31 | El presidente no podía cambiar su @usuario: la verificación de unicidad listaba `users`, que las reglas no dejan a un no admin. **Cerrado en 3.7** con la reserva `usernames/{nombre}` |
| H-32 | El usuario escribe su propio `fcmTokens` (hasta 20 strings): un presidente podría registrar el token de otro dispositivo y mandarle los avisos de su equipo. Baja, sin datos sensibles. Hallado en 6.1 |
| H-33 | Dedup de push no atómico (lee y después escribe): la task de arranque y el trigger de vivo en el mismo segundo pueden duplicar un aviso de "a continuación". Baja, aceptada. Hallado en 6.1 |
| H-34 | `notifyRecipients` escribe todo en un solo batch (límite 500): alcanza para ~150 destinatarios por corrida. Latente. Hallado en 6.1 |
| H-35 | `firebase-hosting.yml` corría el build con Node 20. Hallado en 6.1. **Cerrado en 6.2** (Node 22; el `dist/` sale idéntico con Node 22 y 25) |
| H-36 | `esbuild` está en `devDependencies` de la raíz y nada lo usa (los builds concatenan con Node puro). Baja. Hallado en 6.2, candidato a 7.x |
| H-37 | **El APK v1.6.2 en circulación lleva Capacitor Android 8.4.1**, dentro del rango del aviso crítico GHSA-rvm3-566m-v7fv (CVSS 9.3: el WebView carga contenido arbitrario en el origen de la app por la ruta interna del proxy, si la víctima activa un enlace). La superficie es chica (los campos de usuario se escapan) pero el arreglo solo llega con un release nuevo. En el repo ya está Capacitor 8.5.3 (el rango vulnerable incluye 8.5.0, mínimo `^8.5.1`). Hallado en 6.2. **Cerrado el 2026-10-11** con el release v1.6.3 (M-10) |
| H-38 | En móviles la CSP bloquea `https://apis.google.com/js/api.js`: Firebase Auth inicia su iframe de sesión de forma proactiva en navegadores móviles, Safari e iOS y el SDK ignora el fallo. Efecto: 1 violación por carga (APK en enforce; web móvil por el código del SDK). Auth y correo/contraseña no se ven afectados (verificado el arranque en la APK; falta el inicio de sesión real, M-10). **No agregar `apis.google.com` a `script-src`** (endpoints JSONP). La «0 violaciones» de 3.5 se midió en escritorio. Hallado en 6.3. El inicio de sesión en el teléfono con el APK nuevo lo probó el dueño |
| H-39 | El aviso "¡Tu equipo juega hoy!" dice "hoy a las HH:MM (tu hora)" aunque la hora, convertida a la zona del presidente, caiga después de medianoche (partido de las 23:45 en Lima, visto desde Santiago: "hoy a las 01:45", que ya es mañana). Baja, solo texto (`formatKickoffForRecipient` en `functions/lib/notify.js`). Hallado en la prueba de M-9 |
| H-40 | Al recargar, la sección pública guardada en `localStorage` se marcaba en la barra pero el scroll quedaba arriba, en Palmarés (la barra decía «Equipos» y se veía Palmarés). **Cerrado en 4.1** (`redesign-shell.js`) |
| H-41 | La vista pública escribía en Firestore y fallaba para un visitante con `PERMISSION_DENIED`: `SORTEO.init` creaba el registro de una temporada sin sorteo, e `historial` congelaba registros `live` de temporadas pasadas. El rechazo tumbaba el historial («No pudimos cargar el historial») y dejaba Equipos con 0 partidos. **Cerrado en 4.7 y 4.8** (solo el admin escribe) |
| H-42 | Cuando el presidente renombra su club desde el perfil no se guarda `previousNames` (la regla solo deja `name` y `logo`), y el historial enlaza por nombre: el club pierde su historial y su tabla histórica. El admin sí lo guarda. Baja. Hallado en 4.9. **Cerrado en 5.4** (regla + perfil; la APK 1.6.3 sigue sin guardarlo hasta el próximo release) |
| H-43 | El ticker de resultados no se actualizaba en vivo: un partido que pasaba a «en vivo» o un resultado nuevo no aparecía hasta recargar. **Cerrado en 4.6** (`public.js`, suscripción propia a `matches`) |
| H-44 | **Alta.** `getForSeason('teams')` filtraba el plantel por `season`, y toda alta de equipo guarda `season: 1` fijo: desde la T2, dashboard, calendario, bracket, asignación a grupos, tabla pública de grupos y export veían 0 equipos. **Cerrado en 5.2** (`teams` es global) |
| H-45 | **Alta (integridad).** Borrar una temporada dejaba sus fases huérfanas: se borraban por `season`, campo que las fases no tienen (cuelgan de `compId`). También apuntaba a `palmares` por número (su `season` es texto, nunca coincidía). **Cerrado en 5.2** |
| H-46 | Baja. El acceso «Panel admin» del perfil abría el dashboard con `goAdminPage` sin pasar por `setMode` (layout público). **Cerrado en 5.1** |
| H-47 | Baja. Crear una temporada no finaliza la anterior: pueden quedar dos «Activa». Decidir con el dueño; va a 5.16 |
| H-48 | Baja. El campo «YuNaCoins actuales» del modal de equipo cambia el saldo sin dejar movimiento en `coins`. Hallado en 5.4, va a 5.9 |
| H-49 | Media. En una temporada finalizada solo la UI bloquea los cambios; código y reglas aceptan escribir. Hallado en 5.3, va a 5.16 (regla de temporadas archivadas) |
| H-50 | Baja. Código muerto en `openPhaseModal`: `gpOpts` (`originPhaseId`) no se pinta y el listener de `pf-tpg` no tiene input. Hallado en 5.3, va a 7.2 |
| H-51 | Baja. Código muerto en `matches.js`: `openMatchInputModal`, `saveMatchResult`, `updateMatchInputTeams`, `updateMatchPreview`, `closeMatchInputModal` (nadie las llama; el botón `btn-registrar-partido` no existe) y `window._matchRondaActual`, que solo lee esa rama. Hallado en 5.5, va a 7.2 |
| H-52 | Baja. Criterio «Enfrentamiento directo» compara solo a los dos equipos del par, no la mini-tabla entre todos los empatados; con 3 o más empatados el orden puede depender del algoritmo de `sort`. Decisión de reglamento (¿mini-liga?), no un error mecánico. Hallado en 5.5 |
| H-53 | Media. Varios flujos escribían varios documentos en secuencia sin atomicidad (guardar o editar una fecha, aplicar fecha a la jornada, resultado + historial, borrar partido o fecha): un corte a mitad dejaba el estado parcial. **Cerrado en 5.5 (segunda pasada, 2026-10-19):** `dbWriteBatch` en `db.js` (altas, cambios y bajas de varias colecciones en un solo lote; más de 500 escrituras se rechazan en vez de partirse) e `historyRecordFor` en `history.js`; los 5 flujos de `matches.js` escriben en un lote. Quedan con el mismo patrón (partido + historial por separado) `bracket.js`, `playoff.js` y `livematch.js`: van a 5.7 y 5.8 con estas mismas piezas |
| H-54 | Baja. Dato en producción: `phases/11.customCriterionName` vale «5. Orden alfabético» (con el número incluido), por lo que se ve «5. 5. Orden alfabético». Se corrige al archivar T3 (5.14) o editando el nombre desde el modal de criterios. Hallado en 5.5 |
| H-55 | Media. `fxGenerate` (generar fechas) borraba las fechas previas, creaba las nuevas y guardaba `rondaMeta` en 3 escrituras sueltas: un corte dejaba el grupo vacío o a medias. **Cerrado en 5.6:** un solo `dbWriteBatch` (bajas con su historial, altas y fase) |
| H-56 | Baja. Un grupo de 17 equipos o más a doble vuelta (o de 18 a una vuelta con muchas fechas previas) no se puede regenerar: bajas + altas superan las 500 escrituras del lote atómico y el generador se niega con un aviso (hay que borrar fechas antes). Con 16 equipos a doble vuelta son 481 y entra. Los grupos reales son de 8. Hallado en 5.6; decidir en 7.x si se parte por bloques con reconstrucción en dos pasos |
| H-57 | Media (decisión). Entre fases no hay bloqueo: si cambia la tabla de un grupo o el ganador de una llave después de que el cruce que lo recibe ya se jugó, la sincronización no toca ese partido (bien) pero queda con un equipo que ya no clasifica, sin aviso. Dentro de un bracket se bloquea desde 5.7. Decidir: avisar o bloquear al guardar el resultado de origen. Hallado en 5.7 |
| H-58 | Baja. `updateBracketTeamsDynamic` / `updateBracketDOM` (`bracket.js`) son código muerto: buscan elementos `tlogo-` que no existen y leen todos los equipos en cada render. Hallado en 5.7, va a 7.2 |
| H-59 | Baja. `livematch.js` guarda el partido y su historial por separado al terminar un partido en vivo (resto de H-53). Hallado en 5.7, va a 5.8 |

---

## 4. Mapa de macros

```
M0 Hotfix de seguridad          ── urgente, va primero
 └─ M1 Saneamiento del repo     ── docs al día, grafo útil, disco limpio
     └─ M2 Entorno de pruebas y cableado ── sandbox + mapa objetivo de cableado
         ├─ M3 Seguridad completa         (necesita el emulador de 2.1)
         ├─ M4 Modo público, por sección  (usa el informe de 2.3)
         └─ M5 Modo admin, por sección    (necesita el sandbox de 2.1)
             └─ M6 Backend y Android
                 └─ M7 Limpieza de código y cierre documental
```

Entrega sugerida: **un PR por macro**. M0 va en su propio PR chico para
poder desplegarlo cuanto antes.

### Orden de ejecución (optimizado para tokens)

```
0.1 → 0.2 + 0.3 (mismo PR) → 1.4 + 1.5 → 2.3 → resto de M1 → resto de M2
    → M3 → M4 / M5 → M6 → M7
```

1.4 (instrucciones cortas y correctas) y 1.5 (grafo sin vendor) se adelantan
porque abaratan todas las sesiones siguientes. 2.3 (auditor de cableado) se
adelanta porque reemplaza la lectura manual de código en M4, M5 y M7.

### Cómo arrancar cada sesión

1. Contexto limpio (`/clear` en este mismo worktree o sesión nueva).
2. Prompt: `Ejecuta el slice X.Y de docs/MACRO_SLICE_DEBUGGING.md`.
3. Leer solo la sección del slice, los hallazgos que cita y los reportes
   previos que necesite. Nada de exploración general.
4. Cerrar con el protocolo de cierre (abajo). La sesión termina solo
   cuando el slice queda **CERRADO** o **BLOQUEADO**.

### Protocolo de cierre de un slice (lo ejecuta Claude, sin que se pida)

1. **Implementar** los cambios del slice. Nada fuera de su alcance: lo
   que aparezca se anota como hallazgo nuevo.
2. **Tests automáticos**, según lo que toque el slice:
   - Reglas → tests en el emulador de Firestore.
   - Functions → `npm run test:emulator`.
   - Builds → `node scripts/build-web.mjs` / `build-www.mjs` y revisar la
     salida.
   - Scripts propios (auditor de cableado, smoke test) → correrlos.
3. **Prueba en navegador** si el cambio se ve en la UI:
   - En `tsc-src` y en `dist`.
   - Con `__TSC_READONLY__` contra producción, o en el sandbox si hay
     escrituras (desde 2.1).
   - Consola sin errores nuevos.
   - Móvil y escritorio si cambió el layout.
4. **Si algo falla:** corregir y volver al paso 2. No se cierra con fallas
   abiertas.
5. **Higiene:** `graphify update .` en `tsc-src/` si cambió código ·
   checklist de seguridad pre-commit de `CLAUDE.md` · `git diff` revisado
   (sin cambios ajenos al slice).
6. **Reporte** `docs/reportes/MS-X.Y.md` con la plantilla de la sección 6,
   incluida la evidencia de cada verificación.
7. **Marcar el slice** en este documento como `CERRADO · fecha · commit`
   (o `BLOQUEADO · motivo`).
8. **Commit + push** de la rama.
9. **Mensaje final al dueño**, en este formato:
   - Qué quedó hecho.
   - Qué se verificó y cómo (con el resultado real, incluidas fallas).
   - Acción manual pendiente del dueño (M-x), si la hay.
   - Prompt exacto del siguiente slice, con su modelo y esfuerzo.

El dueño revisa ese mensaje, hace las acciones manuales que se le pidan,
cambia modelo y esfuerzo, escribe `/clear` y pega el prompt siguiente.

**BLOQUEADO** = el slice no puede cerrar sin algo del dueño (una decisión
D-x o una acción M-x). Se commitea lo hecho, se explica qué falta y el
siguiente slice no arranca hasta resolverlo, salvo que no dependa de él.

Modelo y esfuerzo por slice (criterio: Opus alto donde un error es un
agujero de seguridad o pérdida de datos; Sonnet donde el trabajo es
mecánico o lo guía un checklist):

| Slice | Modelo | Esfuerzo |
|---|---|---|
| 0.1 XSS logo + reglas + forense | Opus 5.5 | high |
| 0.2 Exclusión en builds · 0.3 email admin | Sonnet 5.5 | low |
| 1.1 · 1.2 · 1.3 Docs y releases | Sonnet 5.5 | low |
| 1.4 AGENTS/CLAUDE al día | Sonnet 5.5 | medium |
| 1.5 Grafo | Sonnet 5.5 | low |
| 1.6 Git local · 1.7 Disco local | Sonnet 5.5 | low |
| 2.1 Sandbox con emuladores | Opus 5.5 | medium |
| 2.2 Paridad tsc-src / dist | Sonnet 5.5 | medium |
| 2.3 Auditor de cableado | Sonnet 5.5 | medium |
| 2.4 Arranque y fallos de red | Opus 5.5 | medium |
| 2.5 Espejo en memoria | Opus 5.5 | high |
| 3.1 Barrido de sinks | Sonnet 5.5 | medium |
| 3.2 Reglas + suite de tests | Opus 5.5 | high |
| 3.3 Storage | Sonnet 5.5 | low |
| 3.4 Drift de reglas | Sonnet 5.5 | low |
| 3.5 CSP | Opus 5.5 | medium |
| 3.6 Config externa · 3.7 Cuentas | Sonnet 5.5 | medium |
| M4 (4.1–4.9) secciones públicas | Sonnet 5.5 | medium |
| 4.2 Palmarés (3,7k líneas, 3D) | Sonnet 5.5 | high |
| M5 (5.1–5.12) secciones admin, salvo las de la fila siguiente | Sonnet 5.5 | medium |
| 5.1 Acceso admin · 5.2 Temporadas (cascada) · 5.4 Equipos y usuarios (incluye H-42, toca reglas) · 5.7 Bracket | Opus 5.5 | medium |
| 5.13 Import atómico | Opus 5.5 | high |
| 5.14–5.16 Temporadas archivadas | Opus 5.5 | high |
| 6.1 Cloud Functions | Opus 5.5 | medium |
| 6.2 Dependencias · 6.3 Android | Sonnet 5.5 | medium |
| 7.1 Helper de escape | Sonnet 5.5 | low |
| 7.2 Código muerto | Sonnet 5.5 | medium |
| 7.3 CSS · 7.4 Assets | Sonnet 5.5 | low |
| 7.5 Delegación de eventos | Opus 5.5 | high |
| 7.6 Cierre documental | Sonnet 5.5 | low |

Si un slice de Sonnet encuentra algo de seguridad o de integridad de
datos, se anota como hallazgo nuevo y se resuelve en una sesión con Opus.

Ahorro adicional: archivos grandes se leen por `grep` y rangos, nunca
enteros; verificación en navegador con `read_page`/consola (capturas solo
para la prueba final); subagentes solo para barridos de solo lectura
grandes (por ejemplo 3.1).

---

## M0 — Hotfix de seguridad

### 0.1 · XSS por `teams.logo` (H-01)
> **Estado:** CERRADO · 2026-10-10 · `9734432` · M-1 ejecutado (reglas desplegadas en `tsc-web-yuna`). Ver `docs/reportes/MS-0.1.md`.

- **Helper único:** nuevo `tsc-src/js/sanitize.js`, cargado justo después
  de `state.js` en `index.html`. `build-web` y `build-www` lo toman solos
  porque leen el orden de `index.html`. Contiene:
  - `escHtml(v)`
  - `escAttr(v)`
  - `safeImgUrl(v)`: solo admite `https:`, rutas relativas a `assets/` y
    `data:image/`. Cualquier otro valor devuelve vacío y se muestra el
    fallback de iniciales.
- **Sinks:** corregir los 7 de H-01. En `teamLogoHtml` escapar también `ini`
  y `color`.
- **Reglas** (rama presidente de `teams`):
  - `name` debe ser string, de 1 a 40 caracteres.
  - `logo` debe ser `null` o un string de menos de 500 caracteres que
    cumpla `^https://res[.]cloudinary[.]com/<cloudName>/`.
- **Forense (solo lectura):** buscar en producción, en `teams.name/logo` y
  `users.displayName/photoURL/username`, valores con `<`, `"`, `javascript:`
  u `on…=`. Para leer `users` hace falta sesión de admin: el dueño corre un
  snippet de solo lectura o se corre en el navegador con su sesión y
  `__TSC_READONLY__`. Si aparece algo, se trata como incidente antes de
  seguir.
- **Verificación:**
  - Test de reglas en el emulador de Firestore (arnés existente de
    `functions/test`): el presidente no puede guardar `x" onerror=…` ni un
    dominio ajeno, y sí puede guardar una URL válida de Cloudinary.
  - En el navegador, llamar `teamLogoHtml()` con un objeto de prueba en
    memoria y confirmar que la salida va escapada. Sin escribir en la base.
- **Cierra cuando:** cero sinks sin escape para `logo`, test de reglas en
  verde, forense documentado y M-1 ejecutado.

### 0.2 · Que la web no publique documentos internos (H-02, H-15)
> **Estado:** CERRADO · 2026-10-10 · ver `docs/reportes/MS-0.2-0.3.md`. Falta solo M-2 (404 tras el deploy).

- Extraer la lista de exclusión a un módulo compartido (por ejemplo
  `scripts/build-exclude.mjs`) que usen `build-web.mjs` y `build-www.mjs`:
  `*.md`, `docs/`, `trophies-svg/`, `graphify-out/`, `trophies-upload/`,
  `_cmp/`, dotfiles.
- **Verificación:** `node scripts/build-web.mjs` y revisar que `dist/` no
  tenga `.md`, `docs/` ni `trophies-svg/`. `build-www` debe producir la
  misma lista que antes. Después del deploy (M-2), esas URLs responden 404.

### 0.3 · Sacar la identidad del admin del repo (H-03)
> **Estado:** CERRADO · 2026-10-10 · ver `docs/reportes/MS-0.2-0.3.md`.

- Borrar `docs/FIREBASE_MIGRATION_PLAN.md` (también está en H-11) y quitar
  su enlace en `README.md`. Hacer `git grep` de otros emails o UIDs reales
  en el árbol actual.
- No se reescribe el historial: ver "Descartado".

---

## M1 — Saneamiento del repositorio

### 1.1 · Borrar documentos de trabajo cerrado (H-11)
> **Estado:** CERRADO · 2026-10-10 · ver `docs/reportes/MS-1.1.md`.

- Borrar `tsc-src/docs/migration/` completo, `tsc-src/REPORTE_SORTEO_TADA.md`,
  `tsc-src/REPORTE_TABLA_SCROLL_MOVIL.md` y `docs/firebase-setup-steps.md`
  (lo cubre `DEPLOY.md`). Arreglar los enlaces de `README.md`.
- Siguen en el historial de git, así que no se pierde nada.

### 1.2 · Reubicar los documentos que sí sirven
> **Estado:** CERRADO · 2026-10-10 · ver `docs/reportes/MS-1.2-1.3.md`.

- `tsc-src/PROTOCOLO_VERIFICACION.md` pasa a `docs/`. Es la regla
  permanente, y `CLAUDE.md`/`AGENTS.md` lo enlazan desde 1.4.
- `tsc-src/MACRO_SLICE_UPDATER.md` pasa a `docs/`. Corregir su estado a
  "implementado en vX" (sacar la versión de `git log -S`) y actualizar las
  rutas citadas en los comentarios de `updater.js` y `push.js` (H-13).
- Crear `docs/reportes/` para los reportes de este macro.

### 1.3 · Releases: GitHub como fuente única (H-12)
> **Estado:** CERRADO · 2026-10-10 · ver `docs/reportes/MS-1.2-1.3.md`.

- Retirar `releases/android/` del repo (notas y `update.json`).
- Actualizar `docs/android-build.md` para que el flujo de publicación
  apunte a GitHub Releases, que es de donde lee el actualizador. Revisar
  `SECURITY.md`: hoy dice que cada release incluye su SHA-256 en
  `RELEASE_NOTES.md`; pasa a decir que va en la nota del release de GitHub.

### 1.4 · Instrucciones del proyecto al día (H-09, H-10, D1, D5)
> **Estado:** CERRADO · 2026-10-10 · D1 y D5 aprobadas por el dueño. Ver `docs/reportes/MS-1.4.md`.

- `AGENTS.md` canónico, reescrito sobre el estado real:
  - Backend Firestore, con el espejo en memoria y el fallback IndexedDB.
  - Pipeline `tsc-src` → `dist` (hosting) y → `www` (APK).
  - Mapa de los ~40 módulos agrupados por dominio.
  - Enlace al protocolo de verificación.
  - Reglas de seguridad alineadas con `SECURITY.md`.
- `CLAUDE.md` pasa a contener `@AGENTS.md` y solo lo específico de
  Claude: graphify y la regla de los íconos.
- `.gitignore`: sacar las 2 líneas engañosas (según D1).

### 1.5 · Grafo útil (H-14)
> **Estado:** CERRADO · 2026-10-10 · ver `docs/reportes/MS-1.5-1.7.md`.

- Excluir `assets/vendor/` del análisis de graphify (revisar qué mecanismo
  de exclusión soporta la herramienta) y regenerar.
- Poner nombre de dominio a las comunidades: palmarés, bracket, sorteo,
  auth/perfil, etc.
- Borrar `tsc-src/js/graphify-out/`.
- **Cierra cuando** los god nodes son funciones del proyecto
  (`dbGetAll`, `showToast`…) y no de three.js.

### 1.6 · Git local (H-16, D4)
> **Estado:** CERRADO · 2026-10-10 · ver `docs/reportes/MS-1.5-1.7.md`.

- Borrar las ramas locales ya mergeadas `perf/carga-latam` y
  `recovery/yunacoins-pre-reset`. Ambas están contenidas en `main`, así
  que no se pierde nada.
- `git worktree repair D:\Desktop\tsc.web-yunacoins` y luego revisar su
  `git status` para no perder trabajo sin commitear. La rama
  `feat/yunacoins-pes5` está en el remoto.
- Resolver `.claude/launch.json` según D4. El ruido CRLF de
  `android/*.gradle` se descarta.

### 1.7 · Disco local (H-17, D2, D3), con aprobación explícita (M-7)
> **Estado:** CERRADO · 2026-10-10 · M-7 aprobada; D2 y D3 resueltas. Ver `docs/reportes/MS-1.5-1.7.md`.

| Elemento | Peso | Acción |
|---|---|---|
| `android/app/build` | 428 MB | Borrar (se regenera) |
| APKs v1.4.0 a v1.5.3 en `releases/android/` | 551 MB | Comparar el SHA-256 contra el asset de GitHub Release y borrar |
| APK v1.3.1 | 82 MB | Según D2 |
| `dist/` y `www/` | 90 MB | Borrar (se regeneran) |
| `tsc-src/graphify-out/cache` | 37 MB | Borrar (se regenera) |
| `firebase-debug.log`, `functions/firestore-debug.log` | — | Borrar |
| `assets-src/trophies-hi` | 55 MB | **Conservar.** Respaldar según D3 |
| `HISTORIAL ENCUENTROS TSC FINAL.ods` | 56 KB | Conservar (es dato fuente) |
| `NEXT_SESSION.md` (editor PES 5) | 16 KB | Mover al worktree de yunacoins |

---

## M2 — Entorno de pruebas y cableado

### 2.1 · Sandbox con emuladores (H-21)
> **Estado:** CERRADO · 2026-10-10 · ver `docs/reportes/MS-2.1.md`. Hallazgo nuevo de rendimiento (guardar un equipo reescribe 422 historiales en serie) propuesto para 2.5/M5.
- Modo emulador en `firebase-config.js`. Se activa solo si `hostname` es
  `localhost` **y** hay `?emu=1`. Conecta Firestore (`:8080`) y Auth
  (`:9099`).
- Script que carga en el emulador un backup JSON de producción, generado
  con `exportFullDB`. Usuario admin y usuario presidente de prueba creados
  en el emulador de Auth; las credenciales van a un archivo de ejemplo, no
  al chat ni a producción.
- Config `tsc-emu` en `.claude/launch.json`.
- **Cierra cuando** el admin puede crear, editar y borrar en el sandbox sin
  ninguna petición a `firestore.googleapis.com`; se comprueba en la pestaña
  Network.

### 2.2 · Paridad `tsc-src` / `dist` (H-20)
> **Estado:** CERRADO · 2026-10-10 · ver `docs/reportes/MS-2.2.md`. `node scripts/smoke-parity.mjs`.
- Smoke test: cargar las dos variantes, comparar la lista de funciones
  globales definidas y los errores de consola. En `dist`, si falta una
  global, un módulo cortó su bundle.

### 2.3 · Auditor estático de cableado
> **Estado:** CERRADO · 2026-10-10 · ver `docs/reportes/MS-2.3-cableado.md`. `node scripts/audit-wiring.mjs`.
- `scripts/audit-wiring.mjs` (solo desarrollo, no se publica). Recorre
  `index.html` y los templates de los JS y reporta:
  - Handlers `on*="fn(…)"` que llaman funciones no definidas: cableado roto.
  - Funciones definidas que nadie referencia: candidatas a código muerto
    para 7.2.
  - Nombres globales duplicados entre archivos (`_esc`, `cloudReady`…).
  - IDs que se piden con `getElementById` y no existen en ningún template
    (heurística).
- Salida: `docs/reportes/MS-2.3-cableado.md`. M4, M5 y M7 la usan.

### 2.4 · Arranque y fallos de red (H-23, D6)
> **Estado:** CERRADO · 2026-10-10 · ver `docs/reportes/MS-2.4.md`. H-23 confirmado: sin SDK, el visitante ve datos sembrados inventados y sin aviso. D6 queda con evidencia para el dueño.
- Cadena `onload → initDB → setTheme → seedInitialData → loadSeasons →
  setMode`: manejo de errores en cada paso.
- Simular que `gstatic` está bloqueado y documentar qué ve el visitante
  (insumo para D6).
- Simular un visitante anónimo con `seasons` vacía.
- Restauración de `tsc_mode=admin` desde `localStorage` antes de que
  resuelva la sesión.
- Temporada guardada en `tsc_season` que ya no existe.

### 2.5 · Espejo en memoria de Firestore (H-18)
> **Estado:** CERRADO · 2026-10-10 · ver `docs/reportes/MS-2.5.md`. 2 bugs del espejo corregidos (timeout que reabría listeners y devolvía `[]` sin conexión; `dbSubscribe` duplicaba listeners). H-29 corregido (0 escrituras al guardar un equipo). Lista de colecciones por temporada para M5.
Verificar en el sandbox:
- (a) Una escritura propia (`dbPut`/`dbAdd`/`dbDelete`/lotes) aparece en el
  siguiente `dbGetAll`.
- (b) Una escritura desde otra pestaña llega al espejo.
- (c) Invalidación después de transacciones (`_counters`,
  `dbMirrorInvalidate`).
- (d) Fallback: timeout de 10 s, `permission-denied`, snapshot desde caché.
- (e) Cierre por inactividad de 3 min sin fugas de listeners.
- (f) Cambio de sesión: login y logout.
- (g) Lecturas por visita pública, medidas en el emulador. Proyectar el
  costo cuando crezca `matches` e `history`.
- (h) H-29: escrituras en serie de `refreshHistoryForSeason` al guardar un
  equipo. Medir en el sandbox y proponer lote o escritura solo de lo que
  cambió.

**Salida:** bugs corregidos y una lista priorizada de colecciones que
conviene consultar por temporada (`where('season','==',…)`) en vez de
espejar completas. Con D8 (temporadas archivadas, 5.14–5.16), las
temporadas cerradas salen de Firestore y la consulta por temporada pasa a
ser opcional.

---

## M3 — Seguridad completa

### 3.1 · Mapa de confianza y barrido de sinks (H-05)
> **Estado:** CERRADO · 2026-10-11 · ver `docs/reportes/MS-3.1-3.2.md`. 3 sinks de atributo/JS explotables pese a la regla de 0.1 (modal de equipo, handlers de playoff, `uid` pisado en Usuarios admin) y unos 40 de texto o URL corregidos. Barrido dinámico con `scripts/emu-xss.mjs`: 0 inyecciones en `tsc-src` y `dist`.
- Tabla de qué campos puede escribir cada rol:
  - Anónimo: nada.
  - Usuario registrado: su `users/{uid}`.
  - Presidente: `teams/{suyo}.name/logo`.
  - Admin: todo.
- Recorrer todos los sinks que reciben campos de roles no admin
  (`teams.name`, `teams.logo`, `users.displayName`, `users.username`,
  `users.photoURL`) en todas las vistas, incluidos toasts, modales y
  `title=`. Migrarlos al helper de 0.1.

### 3.2 · Reglas Firestore endurecidas y suite de tests (H-06)
> **Estado:** CERRADO · 2026-10-11 · ver `docs/reportes/MS-3.1-3.2.md`. `npm run test:rules`: 21/21 + 350/350 (324/350 contra las reglas anteriores). Desplegadas (M-3).
- `users.create`:
  - `keys().hasOnly([...])` con los campos de alta reales (sacarlos de
    `auth.js`).
  - Tipos y tamaños validados.
- `users.update`: tipos y tamaños; `photoURL` restringido al dominio de
  Cloudinary.
- Suite en el emulador que cubra todas las colecciones con los roles
  anónimo, usuario, presidente con equipo, presidente con `lockEdits` y
  admin. Casos clave:
  - Nadie se auto-asciende a admin.
  - Nadie escribe `notificationRuns` ni `notificationEvents`.
  - El presidente no toca equipos ajenos.

### 3.3 · Storage cerrado (H-04)
> **Estado:** CERRADO · 2026-10-11 · ver `docs/reportes/MS-3.3-3.6.md`. `logos/**` sin escritura; nada usa Storage salvo la lectura de `trophies/`. Desplegado (M-3).
- `logos/**` pasa a `allow write: if false`. Antes, confirmar con `grep`
  que nada usa `firebase.storage`; hoy ni se carga ese SDK. Desplegar con
  M-3.

### 3.4 · Drift de reglas y despliegue reproducible (H-07)
> **Estado:** CERRADO · 2026-10-11 · ver `docs/reportes/MS-3.3-3.6.md`. Sin drift (lo publicado = repo antes de 3.2/3.3). `scripts/rules-drift.mjs` y tests de reglas en CI (`rules-tests.yml`). El deploy desde CI queda para cuando se haga M-6.
- Comparar las reglas activas en la consola con las del repo y tomar el
  repo como fuente de verdad.
- Si el dueño hace M-6, agregar el deploy de `firestore:rules,storage` al
  workflow, condicionado a que pasen los tests de 3.2.

### 3.5 · CSP (H-05)
> **Estado:** CERRADO · 2026-10-19 · enforce en `firebase.json` (los dos headers) y en el check de `scripts/csp.mjs`; ver `docs/reportes/MS-3.3-3.6.md` («Semana de Report-Only» y «Paso a enforce»). Semana de Report-Only en producción (2026-10-11 → 2026-10-19) sin violaciones legítimas: solo H-38 en móvil (inocua). Sale con el próximo merge a `main`; después, verificar el header con `curl` y un inicio de sesión desde el celular.
- Header `Content-Security-Policy` en `firebase.json`, primero en modo
  `-Report-Only`. Directivas:
  - `default-src 'self'`
  - `script-src`: `'self'`, `https://www.gstatic.com` y `'unsafe-inline'`
    (temporal: los handlers inline lo obligan hasta 7.5).
  - `connect-src`: Firestore, Auth, Functions y Cloudinary.
  - `img-src`: `'self' data: https://res.cloudinary.com`. Corta la
    exfiltración vía imágenes.
  - `object-src 'none'`, `base-uri 'self'`, `frame-ancestors 'self'`.
- `<meta>` equivalente para la APK, que no recibe los headers de hosting.
- **Cierra cuando** el modo Report-Only lleva una semana sin violaciones
  legítimas y se pasa a modo enforce.
- **Antes de pasar a enforce (hallado en 6.3, H-38):** en móviles hay 1
  violación por carga, `apis.google.com/js/api.js` de Firebase Auth. Es
  inocua (el SDK la ignora) y no se debe permitir ese dominio; no cuenta como
  violación legítima.

### 3.6 · Configuración externa (H-08)
> **Estado:** CERRADO · 2026-10-11 · ver `docs/reportes/MS-3.3-3.6.md`. M-4 y M-5 hechos por el dueño y verificados: las 2 API keys restringidas (403 desde fuera, web y APK funcionando) y el preset `tsc_logos` limitado (más `cobral_fotos`, hallado de paso). App Check: no por ahora (APK fuera de Play).
- Checklist exacto para M-4 y M-5:
  - Referrers permitidos: `teamsubscup.web.app`, `tsc-web-yuna.web.app`,
    `tsc-web-yuna.firebaseapp.com`, `localhost`.
  - Paquete Android y SHA-1 de firma.
  - Preset de Cloudinary: `jpg`/`png`/`webp`, máximo 2 MB, carpeta fija,
    transformación entrante de redimensionado.
- Evaluar App Check (opcional).

### 3.7 · Cuentas (D7)
> **Estado:** CERRADO · 2026-10-11 · ver `docs/reportes/MS-3.7.md`. `emailVerified` escrito por el usuario y respaldado por el token; el admin solo asigna equipo a cuentas verificadas. @usuario por reserva atómica en `usernames/{nombre}` (cierra H-31). `users.email` se alinea con el token. Trigger `onAuthUserDeleted` para perfiles huérfanos. Reglas: 379/379. Reglas y función desplegadas (M-3).
- Exigir email verificado para que el admin asigne equipo.
- Qué pasa al borrar la propia cuenta: ¿queda el equipo apuntando a un
  presidente inexistente? ¿Quedan tokens FCM huérfanos?
- H-31: @usuario sin verificación de unicidad posible para el presidente.
- `users.email` queda viejo tras `verifyBeforeUpdateEmail` (las reglas no
  dejan reescribirlo).

---

## M4 — Modo público, sección por sección

Cada sección pasa el **checklist C1–C7** (sección 5) en `tsc-src` y en
`dist`, a 375 px, 768 px y escritorio, con tema claro y oscuro.

| Slice | Sección | Módulos principales |
|---|---|---|
| 4.1 | Shell y arranque público: topbar, sidebar público, navegación, persistencia, tema, sonido, cursor-fx, motion | `nav.js`, `redesign-shell.js`, `ui-utils.js`, `sounds.js`, `cursor-fx.js`, `motion.js` |
| 4.2 | Palmarés / Sala de Trofeos (página por defecto; 3D, `.glb`, vitrina) | `palmares.js` (3,7k líneas), `assets/vendor/three` |
| 4.3 | Panel de inicio, competiciones y fases públicas, tablas de grupos, indicador en vivo. Incluye H-26 | `public.js`, `phases.js` (`renderPubComps`), `standings.js`, `live.js` |
| 4.4 | Bracket público y playoff: fuegos del campeón, swipe entre rondas | `public-bracket.js`, `bracket.js`, `playoff.js` |
| 4.5 | Equipos: grilla y filtro | `teams.js` (vista pública) |
| 4.6 | Calendario: hero, cuenta regresiva, etiquetas de día | `calendar.js` |
| 4.7 | Sorteo en vivo: tiempo real, chibi, sonido | `sorteo.js` |
| 4.8 | Historial, H2H y tabla histórica | `history.js`, `data/historial-seed.json` |
| 4.9 | Cuenta: login, registro, recuperación, perfil, panel del presidente (edición de nombre y logo, relacionado con H-01), push opt-in, promo APK, actualizador | `auth.js`, `profile.js`, `push.js`, `apk-promo.js`, `updater.js` |

> **Estado M4:** CERRADO · 2026-10-11 (slices 4.1 a 4.9 en una sola sesión) · ver `docs/reportes/MS-4.1-4.9.md`. Verificado en el sandbox (emuladores) en `tsc-src` y `dist`, 390 / 768 / escritorio, tema claro y oscuro; paridad OK y 0 errores de consola. Arreglos: H-40 (sección restaurada al recargar), H-41 (escrituras públicas rechazadas en sorteo e historial), pager móvil del bracket con movimiento reducido, fuegos del campeón (sonido global y listener), título comp/fase cortado en móvil, «hoy» del calendario con la zona elegida, Equipos en vivo desde vacío, validación del nombre de club del presidente, Enter en el login. H-26 resuelto (código muerto). Abre H-42 y cierra H-43 (ticker en vivo). Verificados después: hero del Calendario próximo y en vivo, zona horaria, Sala en táctil, alta de cuenta, `updater`/`push` con Capacitor simulado (`scripts/smoke-native.cjs`) y la Sala 3D dentro de la APK en un emulador de Android (3D, 0 errores, deslizamiento horizontal OK). El dueño confirmó en su teléfono la vitrina 3D en la APK v1.6.3 y probó las notificaciones (FCM). Nada pendiente de M4; PR #10.

---

## M5 — Modo admin, sección por sección

Mismo checklist más C8 y C9. **Todas las escrituras se prueban solo en el
sandbox de 2.1.**

| Slice | Sección | Módulos principales |
|---|---|---|
| 5.1 | Acceso admin (control de `setMode`, rol, restauración desde `localStorage`), shell y dashboard | `nav.js`, `auth.js` |
| 5.2 | Temporadas: crear, cambiar, finalizar, reactivar, borrar (cascada) | `seasons.js` |
| 5.3 | Competiciones y fases: CRUD, publicar y despublicar | `competitions.js`, `phases.js` |
| 5.4 | Equipos y usuarios: asignar rol y equipo, `lockEdits`, logo por admin | `teams.js`, `users-admin.js`, `color-picker.js` |
| 5.5 | Partidos (grupos, jornadas, rondas), resultados, criterios de desempate, asignación a grupos | `matches.js`, `standings.js` |
| 5.6 | Generador de fixture | `fixture-gen.js` |
| 5.7 | Bracket, playoff y supercopa: referencias de slots, partidos de ida y vuelta | `bracket.js`, `playoff.js` |
| 5.8 | Partido en vivo y notificaciones que dispara (`notifyStreamToday`, `onMatchWentLive`) | `livematch.js`, `functions/` |
| 5.9 | YuNaCoins: individual, masivo e historial | `coins.js` |
| 5.10 | Sorteo (admin) | `sorteo.js` |
| 5.11 | Palmarés, historial y tabla histórica (admin) | `palmares.js`, `history.js` |
| 5.12 | Calendario y etiquetas de día (admin) | `calendar.js` |
| 5.13 | Datos: exportar e importar. Import atómico (H-19): backup automático antes de sobrescribir, borrado en lote con `dbDeleteMany` y validación completa antes de tocar nada. Incluye (de MS-5.2): el export arma las fases con `getForSeason('phases')`, que trae las de todas las temporadas (no tienen `season`); filtrar por `compId` y probarlo | `data.js` |
| 5.14 | Temporadas archivadas (D8) · generador: script que lee de producción (solo GET, como `emu-snapshot`) una temporada finalizada y escribe `tsc-src/data/temporadas/<id>.json` con todo lo suyo (`competitions`, `phases`, `matches`, `matchHistory`, `coins`, `sorteo`, `sorteoEvents`, `calDayLabels`) y los nombres de equipo como estaban al cerrar. Índice `data/temporadas/index.json`. Validación: conteos y una huella por colección contra Firestore | `scripts/`, `data/` |
| 5.15 | Temporadas archivadas · lectura: la capa de datos sirve una temporada archivada desde su archivo (todas las secciones públicas y admin, en solo lectura). Historial y tabla histórica suman JSON de PES 1-3 + archivos + temporada actual. La APK baja del hosting los archivos que no trae. Sandbox: T3 desde archivo idéntica a T3 desde Firestore (capturas y conteos) | `db.js`, `history.js`, `nav.js`, `seasons.js` |
| 5.16 | Temporadas archivadas · cierre: el admin no puede editar, reactivar ni borrar una temporada archivada (UI + regla que rechace escrituras con `season` archivada). Respaldo completo y luego borrado de los documentos de T3 en Firestore (M-8, lo confirma el dueño). Medir lecturas por visita antes y después con `emu-probe`. Incluye H-47 (de MS-5.2): decidir con el dueño si crear una temporada ofrece finalizar la activa, implementarlo y probarlo en el sandbox | `seasons.js`, `firestore.rules`, `scripts/` |

> **Estado 5.1 y 5.2:** CERRADO · 2026-10-12 · ver `docs/reportes/MS-5.1-5.2.md`. Verificado en el sandbox en `dist` y `tsc-src`, 0 errores de consola, paridad OK. 5.1: «Panel admin» del perfil pasa por `setMode` (H-46), página admin restaurada validada, render admin con fallo controlado, sesión sin rol admin sale del panel, `dbErrorMsg` para toasts. 5.2: equipos globales en `getForSeason` (H-44), cascada de borrado sin fases huérfanas y sin tocar palmarés (H-45), doble clic al crear, «Ir» persistente, confirmaciones con texto correcto, C9 con mensaje claro. Abre H-47.

> **Estado 5.3 y 5.4:** CERRADO · 2026-10-19 · ver `docs/reportes/MS-5.3-5.4.md`. Verificado en el sandbox en `dist` y `tsc-src`, 0 errores de consola, paridad OK, reglas 33/33 y 379/379. 5.3: borrar fase o competición borra sus partidos y su historial (quedaban huérfanos), «Ver fases» abría la primera competición, doble clic, temporada finalizada, escapes, C9. 5.4: H-42 (regla + perfil), equipos con referencias no se borran, nombre único (actual y anteriores), un club = un presidente con vínculo en lote. Abre H-48 a H-50. Reglas desplegadas por el dueño (2026-10-19; `rules-drift`: Firestore y Storage iguales al repo).

> **Estado 5.5:** CERRADO · 2026-10-19 · ver `docs/reportes/MS-5.5.md`. Verificado en el sandbox en `dist` y `tsc-src`, 0 errores de consola inesperados, paridad OK, sin cambios de reglas (no requiere despliegue). Cambiar el cruce de una fecha ya no deja el marcador pegado a otros equipos (pide confirmación y borra resultado e historial), mover un equipo de grupo ya no hace desaparecer sus resultados de la tabla, resultados validados (enteros 0-99), partido en vivo y temporada finalizada protegidos en el código, doble clic, borrados en lote, C9. `isMathConfirmed` con ida y vuelta. Abre H-51 a H-54 (H-49 sigue abierto). **Segunda pasada (Opus, 2026-10-19):** H-53 cerrado con escrituras atómicas (ver la sección «H-53» del reporte).

> **Estado 5.6:** CERRADO · 2026-10-19 · ver `docs/reportes/MS-5.6.md`. Verificado en el sandbox en `dist` y `tsc-src`, paridad OK, sin cambios de reglas. El generador de fechas escribe todo en un lote atómico (H-55), se niega en temporada finalizada, con partidos jugados, a medias o en vivo, revalida el grupo y la fase al guardar, avisa de los días asignados que se pierden, escapa nombres y no se dispara dos veces. Abre H-56.

> **Estado 5.7:** CERRADO · 2026-10-19 (Opus) · ver `docs/reportes/MS-5.7.md`. Verificado en el sandbox en `dist` y `tsc-src`, paridad OK, 0 errores no provocados. Cierra H-27 (escudos en el bracket admin) y H-30 (playoff con ids), y H-53 en bracket y playoff (resultado + historial en un lote, `dbNewIds`). Bloqueo al cambiar un ganador ya propagado a una ronda jugada; empate a partido único exige penales; sincronización de cruces que pisaba el lado A arreglada; reasignar una llave avisa qué resultados se borran (la supercopa dejaba el historial huérfano). Abre H-57 a H-59.

---

## M6 — Backend y Android

### 6.1 · Cloud Functions (H-25)
- Revisar la autorización de las 3 funciones. `notifyStreamToday` ya
  verifica el rol del lado del servidor. Falta confirmar que
  `notifyStartupContinuation` solo la pueda invocar Cloud Tasks y que
  `onMatchWentLive` no confíe en campos del cliente para decidir
  destinatarios.
- Revisar dedup, limpieza de tokens inválidos y región.
- `npm run test:emulator` en verde.
- Migrar a Node 22. Correr `npm audit` en `functions/`.

> **Estado:** CERRADO · 2026-10-11 · ver `docs/reportes/MS-6.1.md`. Task de continuación privada por IAM (403 sin credenciales, `invoker: 'private'` explícito), callable con rol leído de Firestore, trigger de vivo sin campos del cliente. Payload de la task validado; limpieza también de tokens mal formados. Node 22, firebase-admin 14.5, firebase-functions 7.4, `npm audit` 15 → 0. Harness 1-9, cleanup 9/9, reglas 379/379. Desplegado (M-9): las 4 funciones en `nodejs22`, 403/401 sin credenciales. Hallazgos nuevos H-32 a H-35.

### 6.2 · Dependencias
> **Estado:** CERRADO · 2026-10-11 · ver `docs/reportes/MS-6.2-6.3.md`. `npm audit` de la raíz 18 (3 críticas) → 3 moderadas sin parche upstream (`uuid` vía `xcode`, ruta iOS); producción siempre en 0. Capacitor 8.4.1 → 8.5.3 (aviso crítico del runtime nativo, H-37). `@capacitor/assets` fuera de las dependencias (sin uso y sin parche); `firebase` fijado en 12.14.0 con override de `@grpc/grpc-js`. Coherencia: SDK `gstatic` 12.14.0 = `package.json`; los archivos de three 0.147 vendorizados son idénticos al paquete npm. H-35 cerrado (Node 22 en CI).
- `npm audit` en la raíz (Capacitor).
- Coherencia de versiones: el SDK de Firebase de `gstatic` (12.14.0) contra
  `package.json`, y three 0.147 vendorizado.

### 6.3 · Android
> **Estado:** CERRADO · 2026-10-11 · ver `docs/reportes/MS-6.2-6.3.md`. `build-www` sin excluidos y con la `<meta>` de CSP; el APK (Capacitor 8.5.3) compila, su bundle web coincide con `tsc-src/` (104 archivos por hash) y la configuración de firma funciona (probada con una clave descartable). En un emulador: arranque, 6 páginas públicas y la Sala de Trofeos 3D sin errores bajo la CSP, actualizador contra el `update.json` real OK, token FCM nativo registrado. Proceso de subida de versión documentado en `docs/android-build.md`. **M-10 hecho** (release v1.6.3 publicado y probado en un teléfono real; entrega de avisos verificada en la base). Hallazgos H-36 a H-38.
- `build-www` con la exclusión compartida de 0.2.
- `cap sync`, firma, push en un dispositivo real.
- Actualizador contra el `update.json` del último GitHub Release.
- CSP por `<meta>` (3.5).
- Proceso de subida de versión (`versionCode`/`versionName`) documentado.

---

## M7 — Limpieza de código y cierre

| Slice | Qué | Origen |
|---|---|---|
| 7.1 | Reemplazar las ~20 funciones de escape por el helper de 0.1 | H-22 |
| 7.2 | Borrar el código muerto confirmado por 2.3. Aplicar la decisión D6 sobre la rama IndexedDB | 2.3, H-23 |
| 7.3 | CSS sin uso (7 hojas, ~4.700 líneas), medido con la cobertura del navegador recorriendo las 21 páginas | — |
| 7.4 | Assets: inventario de referencias; borrar lo que nadie usa (PNG con su `.webp` ya en uso, trofeos no referenciados); comprimir el mp3 | H-24 |
| 7.5 | (Largo plazo, opcional) Pasar los handlers inline a delegación de eventos, para poder quitar `'unsafe-inline'` de la CSP | H-05 |
| 7.6 | Cierre documental: `SECURITY.md`, `README.md`, `CONTRIBUTING.md`, `AGENTS.md`/`CLAUDE.md`, grafo regenerado y reporte final del macro | — |

---

## 5. Checklist por sección (M4 y M5)

- **C1 Cableado:** entrada (`case` de `nav.js`) → colecciones que lee →
  render → handlers. Todos los handlers existen (cruzar con el informe de
  2.3).
- **C2 Estados:** temporada vacía; sin datos; referencia rota (equipo
  borrado, fase sin partidos, slot de bracket sin resolver); red lenta.
- **C3 Consola:** cero errores y cero promesas sin capturar, en `tsc-src`
  y en `dist`.
- **C4 Seguridad:** todo sink con campos de roles no admin usa el helper.
- **C5 Tiempo real:** las suscripciones y espejos se cierran al salir; no
  hay re-renders duplicados.
- **C6 Presentación:** 375 / 768 / escritorio; tema claro y oscuro; solo
  íconos SVG.
- **C7 Deuda:** duplicados y código muerto anotados para M7.
- **C8 Escrituras (admin):** cada acción probada en el sandbox; las
  acciones destructivas piden confirmación; no quedan huérfanos (borrar
  competición → fases y partidos; borrar equipo → partidos, coins,
  palmarés).
- **C9 Permisos (admin):** con sesión no admin, la acción falla limpia,
  con un mensaje claro y sin estado a medias.

## 6. Plantilla de reporte (`docs/reportes/MS-x.y.md`)

```
# MS-x.y · <título> · <fecha>
Hallazgos que cierra: H-..
Cambios: archivos y por qué (1 línea c/u)
Verificación: qué se probó, dónde (tsc-src / dist / emulador), evidencia
Pendientes / hallazgos nuevos: H-.. (se agregan a la sección 3)
Acción del dueño requerida: M-.. / ninguna
```

## 7. Descartado (y por qué)

- **Reescribir el historial de git** para purgar `fog.mp4` (30 MB, ya
  borrado) o el email del admin: el repo es público y tiene clones, haría
  falta un force push, y el email ya figura como autor en 3 commits. El
  pack pesa 176 MB, que es manejable. Se reconsidera solo si el tamaño
  pasa a ser un problema.
- **Duplicados de `splash.png` en `android/res`**: los genera
  `@capacitor/assets` por densidad y modo. Es lo esperado.
