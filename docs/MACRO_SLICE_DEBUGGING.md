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
| D6 | Rama IndexedDB de `db.js`: ¿fallback offline o código muerto? | Decidir con la evidencia del slice 2.4 | 7.2 |
| D7 | Auto-registro abierto: cualquiera puede crear cuenta (`role: president`, sin equipo) | Mantenerlo, pero con verificación de email y reglas endurecidas (3.2) | 3.7 |

## 2. Acciones manuales del dueño

Estas acciones no se pueden ejecutar desde el repo:

| # | Acción | Cuándo |
|---|---|---|
| M-1 | `firebase deploy --only firestore:rules` | Al cerrar 0.1 |
| M-2 | Merge a `main` (dispara el deploy de hosting por CI) | Al cerrar el macro 0, y luego por macro |
| M-3 | `firebase deploy --only firestore:rules,storage` | Al cerrar 3.2 y 3.3 |
| M-4 | Google Cloud Console: restringir las 2 API keys (web por referrer, Android por paquete + SHA-1) | Slice 3.6 |
| M-5 | Cloudinary: restringir el preset unsigned (formatos, tamaño máximo, carpeta fija) | Slice 3.6 |
| M-6 | (Opcional) Dar el rol "Firebase Rules Admin" a la service account del CI para desplegar reglas desde el workflow | Slice 3.4 |
| M-7 | Aprobar el borrado de archivos locales (lista exacta en 1.7) | Slice 1.7 |

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
| H-08 | Media (a verificar) | Sin confirmar que estén restringidas: las 2 API keys de Google (web y `google-services.json`) y el preset unsigned de Cloudinary | Consolas externas |
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
| H-25 | `functions/` declara Node 20, que está fuera de soporte desde 2026-04-30 |
| H-26 | La ruta pública `competiciones` existe en `nav.js:263`, pero ningún `goPublicPage('competiciones')` apunta a ella. Verificar si es alcanzable |
| H-27 | `loadBracketLogos` (`bracket.js:1341`) nunca pinta logos: busca el nombre del equipo en ids `blogo-<fase>_r<n>_m<n>-a/b`, que no lo contienen. El bracket admin solo muestra iniciales (hallado en 0.1, va a 5.7) |
| H-28 | H-01 tenía un 8.º sink de `logo` (`standings.js:806`, corregido en 0.1). Quedan sinks de `teams.name` sin escape fuera de los archivos de 0.1; los mitiga la regla nueva (sin `<>` desde el presidente). Barrido en 3.1 |

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
| M5 (5.1–5.12) secciones admin | Sonnet 5.5 | medium |
| 5.1 Acceso admin · 5.2 Temporadas (cascada) · 5.7 Bracket | Opus 5.5 | medium |
| 5.13 Import atómico | Opus 5.5 | high |
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
> **Estado:** PARCIAL · 2026-10-10 · M-7 aprobada para regenerables y APKs v1.4.0–v1.5.3. Pendiente D3 (respaldo trophies-hi). Ver `docs/reportes/MS-1.5-1.7.md`.

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
- Smoke test: cargar las dos variantes, comparar la lista de funciones
  globales definidas y los errores de consola. En `dist`, si falta una
  global, un módulo cortó su bundle.

### 2.3 · Auditor estático de cableado
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
- Cadena `onload → initDB → setTheme → seedInitialData → loadSeasons →
  setMode`: manejo de errores en cada paso.
- Simular que `gstatic` está bloqueado y documentar qué ve el visitante
  (insumo para D6).
- Simular un visitante anónimo con `seasons` vacía.
- Restauración de `tsc_mode=admin` desde `localStorage` antes de que
  resuelva la sesión.
- Temporada guardada en `tsc_season` que ya no existe.

### 2.5 · Espejo en memoria de Firestore (H-18)
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

**Salida:** bugs corregidos y una lista priorizada de colecciones que
conviene consultar por temporada (`where('season','==',…)`) en vez de
espejar completas.

---

## M3 — Seguridad completa

### 3.1 · Mapa de confianza y barrido de sinks (H-05)
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
- `logos/**` pasa a `allow write: if false`. Antes, confirmar con `grep`
  que nada usa `firebase.storage`; hoy ni se carga ese SDK. Desplegar con
  M-3.

### 3.4 · Drift de reglas y despliegue reproducible (H-07)
- Comparar las reglas activas en la consola con las del repo y tomar el
  repo como fuente de verdad.
- Si el dueño hace M-6, agregar el deploy de `firestore:rules,storage` al
  workflow, condicionado a que pasen los tests de 3.2.

### 3.5 · CSP (H-05)
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

### 3.6 · Configuración externa (H-08)
- Checklist exacto para M-4 y M-5:
  - Referrers permitidos: `teamsubscup.web.app`, `tsc-web-yuna.web.app`,
    `tsc-web-yuna.firebaseapp.com`, `localhost`.
  - Paquete Android y SHA-1 de firma.
  - Preset de Cloudinary: `jpg`/`png`/`webp`, máximo 2 MB, carpeta fija,
    transformación entrante de redimensionado.
- Evaluar App Check (opcional).

### 3.7 · Cuentas (D7)
- Exigir email verificado para que el admin asigne equipo.
- Qué pasa al borrar la propia cuenta: ¿queda el equipo apuntando a un
  presidente inexistente? ¿Quedan tokens FCM huérfanos?

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
| 5.13 | Datos: exportar e importar. Import atómico (H-19): backup automático antes de sobrescribir, borrado en lote con `dbDeleteMany` y validación completa antes de tocar nada | `data.js` |

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

### 6.2 · Dependencias
- `npm audit` en la raíz (Capacitor).
- Coherencia de versiones: el SDK de Firebase de `gstatic` (12.14.0) contra
  `package.json`, y three 0.147 vendorizado.

### 6.3 · Android
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
