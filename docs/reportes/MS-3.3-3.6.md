# MS-3.3 a 3.6 · Storage, drift de reglas, CSP y configuración externa · 2026-10-11

Hallazgos: H-04 (cerrado en el repo, falta desplegar), H-07 (sin drift; tests
en CI), H-05 (CSP en Report-Only, falta pasar a enforce) y H-08 (confirmado:
las dos API keys están sin restringir). Producción solo se leyó (reglas
publicadas por la API de Rules, cabeceras de la web y la config pública de
Auth). No se desplegó nada.

## 3.3 · Storage cerrado (H-04)

- `grep` en `tsc-src/`, `functions/` y `scripts/`: nadie carga el SDK de
  Storage ni sube nada. Lo único que se lee de Storage es
  `trophies/` en `palmares.js` (`_TROPHY_STORAGE_BASE`), y hoy ni eso: las 5
  copas de `TROPHY_GLB_MAP` están en `LOCAL_TROPHY_GLB_STYLES`, así que la
  rama remota no se usa (candidata a 7.2).
- `firebase/storage.rules`: `logos/**` pasa a `allow write: if false`. La
  lectura de `logos/` y `trophies/` sigue pública.
- `functions/test/rules-storage.js` (nuevo) + `npm run test:rules:storage`
  (emulador de Storage): **7/7**. Nadie sube a `logos/`, `trophies/` ni a una
  ruta sin regla; `trophies/` y `logos/` se leen; una ruta sin regla no.
  Contra las reglas anteriores, un usuario registrado subía a `logos/`
  (**200**); con las nuevas, 403.

## 3.4 · Drift de reglas (H-07)

- `scripts/rules-drift.mjs` (nuevo, solo lectura): baja con la sesión del CLI
  (`firebase login`) los rulesets publicados de Firestore y Storage, y los
  compara con el repo. `--save=<dir>` guarda los publicados.
- Resultado:
  - **Firestore:** el publicado (2026-10-10 21:27 UTC, el deploy de M-1) es
    **idéntico** al repo de antes de 3.2. Difiere del actual solo por 3.2,
    que todavía no se despliega.
  - **Storage:** el publicado (2026-06-08) es **idéntico** al repo de antes de
    3.3, salvo el salto de línea final. Difiere solo por 3.3.
  - Conclusión: **no hay drift**; el repo es la fuente de verdad. Después de
    M-3, `node scripts/rules-drift.mjs` debería dar "IGUAL" en las dos.
- `.github/workflows/rules-tests.yml` (nuevo): en cada PR o push a `main` que
  toque `firebase/**`, los tests de reglas o `firebase.json`, corre
  `npm run test:rules` (Java 21 + `firebase-tools@15.19.0`) y
  `node scripts/csp.mjs --check`. Sin M-6 no despliega. Cuando la service
  account tenga "Firebase Rules Admin", el deploy va como job aparte con
  `needs: rules`.

## 3.5 · CSP (H-05)

- `scripts/csp.mjs` (nuevo): fuente única de la política.
  `node scripts/csp.mjs --check` verifica que `firebase.json` tenga la misma.
- `firebase.json`: `Content-Security-Policy-Report-Only` en los dos bloques
  que sirven HTML (`/` y `**/*.@(html|json|webmanifest)`).
- `scripts/build-www.mjs`: inyecta la política como `<meta>` en
  `www/index.html` (la APK no recibe headers de hosting). Un `<meta>` no
  admite Report-Only ni `frame-ancestors`, así que en la APK va en enforce.
- Política:
  - `default-src 'self'`.
  - `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https://www.gstatic.com https://cdn.jsdelivr.net`.
    `'unsafe-inline'` es temporal: lo exigen los handlers inline hasta 7.5.
    `'wasm-unsafe-eval'` lo pide el decodificador Draco de las copas 3D, y
    jsDelivr carga SheetJS para exportar el historial.
  - `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com` ·
    `font-src 'self' https://fonts.gstatic.com`.
  - `img-src 'self' data: blob: https://res.cloudinary.com` (corta la
    exfiltración por imágenes) · `media-src 'self'`.
  - `connect-src 'self' blob:` + Firestore, Identity Toolkit, Secure Token,
    Functions (`southamerica-east1`), la API de subida de Cloudinary y
    Firebase Storage. El `blob:` lo agregó la prueba: `GLTFLoader` pide las
    texturas embebidas del `.glb` con `fetch(blob:)`.
  - `worker-src 'self' blob:` (worker de Draco) ·
    `frame-src https://tsc-web-yuna.firebaseapp.com` (iframe de Auth si
    alguna vez se usa popup) · `object-src 'none'` · `base-uri 'self'` ·
    `form-action 'self'` · `frame-ancestors 'self'`.

### Verificación de la CSP

- `node scripts/emu-xss.mjs csp` (comando nuevo) arma `csp.html` en el sandbox
  con la política en **enforce** (más los orígenes de los emuladores) y un
  colector de `securitypolicyviolation` (`window.__CSP__`).
- **`tsc-src`:** las 7 páginas públicas, 14 admin, modal de equipo y perfil,
  SheetJS y las 5 copas 3D (`GLTFLoader` + worker de Draco + wasm).
  - Primera corrida: 2 violaciones, `connect-src blob:` desde `three.min.js`.
    Se agregó `blob:`.
  - Segunda corrida: **0 violaciones**, y las 5 copas cargan.
- **`dist` (9 bundles):** páginas públicas, 3D, SheetJS, **alta real de una
  cuenta** (Auth + perfil), 9 páginas admin, una escritura en `teams` y la
  subida (simulada en el sandbox). **0 violaciones.**
- **Header:** el emulador de Hosting no aplica ninguna cabecera de
  `firebase.json`, tampoco las que ya existían. En la web publicada el bloque
  `/` sí se aplica (`X-Frame-Options`, `Referrer-Policy` y
  `Permissions-Policy` presentes), así que la CSP sale con el próximo deploy
  de Hosting. Se confirma con
  `curl -sD - -o /dev/null https://teamsubscup.web.app/ | grep -i content-security`.
- **Orígenes de producción de Functions y Cloudinary** (en el sandbox la
  callable va al emulador y la subida se simula): se probaron con un `fetch` a
  una ruta inexistente de cada dominio desde `csp.html` (enforce). No ejecuta
  ninguna función ni sube nada.
  - `southamerica-east1-tsc-web-yuna.cloudfunctions.net` y `api.cloudinary.com`:
    la CSP los permite y la petición sale (aparece en Resource Timing).
  - Control `evil.example`: bloqueado por `connect-src`, no sale.
  - El 404 de Cloudinary intenta cargar su propia hoja de estilos y su script
    (`/stylesheets/g/cloudinary_public.css`, `/javascripts/g/…`), que la CSP
    bloquea. Es la página de error de una ruta inventada; la subida real
    devuelve JSON. No se agregan.
  - La callable real (`notifyStreamToday` manda push a los usuarios) y una
    subida real a la cuenta no se ejecutaron a propósito.
- **No cubierto:** un dispositivo Android real.

### Por qué 3.5 no cierra

El plan cierra 3.5 cuando el Report-Only lleva una semana sin violaciones
legítimas y se pasa a enforce. La política no tiene `report-uri`: no hay
backend para recibir reportes, y abrir una colección de Firestore a
escrituras anónimas sería un vector de spam. Las violaciones solo aparecen en
la consola del navegador del visitante.

Paso pendiente (slice corto, Sonnet low), una semana después del deploy:

1. Revisar la consola en escritorio y en móvil: panel, palmarés 3D, sorteo,
   calendario, login, perfil y exportar historial.
2. Si no aparece nada, cambiar la clave a `Content-Security-Policy` en
   `firebase.json` y en `csp.mjs --check`.

## 3.6 · Configuración externa (H-08)

### Estado medido (solo lectura)

Se llamó a `identitytoolkit.googleapis.com/v1/projects?key=…`, que devuelve la
config pública del proyecto, sin efectos:

| Key | Sin cabeceras | `Referer: https://evil.example/` |
|---|---|---|
| Web (`firebase-config.js`, `AIzaSyDm…`) | 200 | 200 |
| Android (`google-services.json`, `AIzaSyDM…`) | 200 | 200 |

**Ninguna de las dos tiene restricción de aplicación.** Además, los dominios
autorizados de Auth son `localhost`, `tsc-web-yuna.firebaseapp.com` y
`tsc-web-yuna.web.app`: falta `teamsubscup.web.app`, el dominio público. Hoy
no rompe nada, porque el login es email y contraseña, que no usa redirect.

### Checklist M-4 · Google Cloud Console → APIs y servicios → Credenciales

**Key web (`AIzaSyDm…`, la de `tsc-src/js/firebase-config.js`)**

1. Restricción de aplicación: **Sitios web (HTTP referrers)**:
   - `https://teamsubscup.web.app/*`
   - `https://tsc-web-yuna.web.app/*`
   - `https://tsc-web-yuna.firebaseapp.com/*`
   - `https://localhost/*`: **la APK**. Capacitor sirve la app desde
     `https://localhost` y usa esta misma key; sin esta línea la APK pierde el
     login.
   - `http://localhost:*/*`: desarrollo (`npx serve tsc-src` en `:3000`). El
     sandbox usa emuladores y no valida la key.
2. Restricción de API: **Identity Toolkit API**, **Token Service API** y
   **Cloud Firestore API**.
3. Verificar después de guardar (tarda hasta 5 minutos):
   - Login y logout en `teamsubscup.web.app` y en la APK.
   - Repetir la prueba de arriba: con `Referer: https://evil.example/` tiene
     que dar 403.

**Key Android (`AIzaSyDM…`, la de `android/app/google-services.json`)**

La usa el SDK nativo, solo para las notificaciones push.

1. Restricción de aplicación: **Apps de Android**:
   - Paquete: `web.teamsubscup.app`.
   - SHA-1 del keystore de release. No se puede leer sin la contraseña del
     keystore. Para sacarlo, cualquiera de estos dos:
     - `cd android && ./gradlew signingReport` (usa
       `keystore.properties`, variante `release`).
     - `keytool -list -v -keystore <ruta del .jks> -alias <alias>`.
   - Si también se prueban builds debug en el teléfono, agregar el SHA-1 del
     keystore de debug.
2. Restricción de API: **Firebase Cloud Messaging API** y **Firebase
   Installations API**.
3. Verificar: instalar la APK firmada, activar las notificaciones y lanzar
   una notificación de prueba.

**Opcional:** Firebase Console → Authentication → Settings → Dominios
autorizados → agregar `teamsubscup.web.app`.

Aclaración: el `Referer` lo puede falsear cualquiera desde fuera de un
navegador. La restricción evita que otro sitio use la key; no protege los
datos, eso lo hacen las reglas (3.2). Sirve, sobre todo, contra abuso de
cuota.

### Checklist M-5 · Cloudinary → Settings → Upload → Upload presets → `tsc_logos` (unsigned)

El preset `tsc_logos` lo usan **tres** flujos:

- El escudo del presidente y el avatar: recortados a 420×420 JPEG, menos de
  100 KB.
- El logo que sube el admin desde Equipos: archivo original.
- **Las fotos de la galería del palmarés**: originales de celular, de varios
  MB. `palmares.js` pide miniaturas por URL (`f_auto,q_auto,w_…`).

Los 2 MB y el redimensionado entrante que proponía el plan **romperían o
degradarían la galería**. Con un solo preset, el ajuste seguro es:

1. Signing mode: **Unsigned** (como está).
2. Allowed formats: `jpg, jpeg, png, webp`. Agregar `heic` si se suben fotos
   desde iPhone.
3. Max file size: **10 MB** (10485760). Si algún día los dos usos van en
   presets separados, el de logos puede bajar a 2 MB.
4. Folder: **`tsc-logos`, fijo**. Desactivar "Use filename" y dejar "Unique
   filename" activo y "Overwrite" desactivado: el cliente no puede elegir ni
   pisar un `public_id`.
5. Incoming transformation: `c_limit,w_2048,h_2048,q_auto`. Limita fotos
   enormes sin tocar las que se usan; las miniaturas siguen saliendo por URL.
6. Access mode: **public**. Las URL tienen que cumplir el patrón de las reglas
   (`res.cloudinary.com/dnjijd8mx/…`).
7. Verificar: subir un escudo desde el perfil (sandbox no: ahí la subida es
   simulada; en producción, con una cuenta de presidente) y una foto de la
   galería desde el admin.

Mejora para más adelante (7.x): un preset aparte para la galería
(`tsc_gallery`, 10 MB, `c_limit` 2048) y `tsc_logos` a 2 MB y
`c_limit,w_512,h_512`. Necesita un cambio en `uploadImageToCloud` para elegir
el preset.

### App Check (evaluación)

**No se recomienda por ahora.**

- **Android:** el proveedor de App Check es Play Integrity, y exige que la app
  esté en Play Console. La APK se distribuye por GitHub Releases, y una build
  instalada por fuera de Play da veredicto "no reconocida". Además, la lógica
  corre en el WebView con el SDK web, así que en la APK haría falta el
  proveedor web (reCAPTCHA Enterprise) con `localhost` autorizado, que
  cualquiera puede reproducir.
- **Web:** reCAPTCHA Enterprise funcionaría, pero activar el enforcement en
  Firestore dejaría afuera a la APK por lo anterior.
- **Costo/beneficio:** las reglas de 3.2 ya cierran las escrituras. App Check
  solo agregaría freno contra lectura masiva o abuso de cuota, que hoy no se
  observa.
- **Reconsiderar** si la APK pasa a Play Store, o si aparece abuso de cuota en
  Firestore o Auth.

## Higiene

- `npm run test:rules`: 21/21 + 350/350 (sin cambios en Firestore desde 3.2).
  `npm run test:rules:storage`: 7/7.
- `node scripts/csp.mjs --check`: OK (2 headers).
- `node scripts/build-web.mjs` (37 JS → 9 bundles) y `build-www.mjs` (con la
  `<meta>` CSP después de `<meta charset>`): OK.
- `node scripts/smoke-parity.mjs`: PARIDAD OK. `node scripts/audit-wiring.mjs`:
  0 handlers rotos. Este lote no toca `tsc-src/` (el grafo no cambia).

## Pendientes / hallazgos nuevos

- 3.5 sigue abierto hasta pasar a enforce (ver arriba).
- La rama de Firebase Storage para copas 3D (`_TROPHY_STORAGE_BASE`) no se usa
  (las 5 copas son locales): 7.2.
- Galería y logos comparten el preset de Cloudinary: separar en 7.x.

## Acción del dueño requerida

- **M-3:** `firebase deploy --only firestore:rules,storage` desde
  `claude/slice-3` (incluye 3.2 y 3.3). Después,
  `node scripts/rules-drift.mjs` tiene que dar "IGUAL" en las dos.
- **M-4:** checklist de arriba (las dos keys).
- **M-5:** checklist de arriba (preset `tsc_logos`).
- **M-6 (opcional):** rol "Firebase Rules Admin" para la service account del
  CI, si se quiere que el workflow despliegue las reglas.
- **M-2 (al cerrar M3):** con el merge sale la CSP Report-Only y el escape de
  3.1. La `<meta>` de la APK sale en la próxima release.

## Cierre (2026-10-11, acciones del dueño hechas)

- **M-3:** `firebase deploy --only firestore:rules,storage` desde
  `claude/slice-3` (02:28 UTC). `node scripts/rules-drift.mjs`: **IGUAL** en
  Firestore y en Storage.
- **M-4, key web (`Browser key`):** restricción por sitios con
  `http://localhost/*`, `http://localhost:3000/*`, `https://localhost/*`,
  `https://teamsubscup.web.app/*`, `https://tsc-web-yuna.firebaseapp.com/*` y
  `https://tsc-web-yuna.web.app/*`. Google no acepta comodín en el puerto
  (`localhost:*`), así que el desarrollo queda en el 3000. La lista de 25 APIs
  que Firebase le puso por defecto no se tocó.
  - Prueba (solo lectura): sin `Referer` y con `evil.example` → **403**;
    `teamsubscup.web.app`, `tsc-web-yuna.web.app` y `https://localhost/` →
    200. El dueño entró a la web en incógnito sin problemas.
- **M-4, key Android:** "Apps para Android" con `web.teamsubscup.app` y dos
  huellas SHA-1 (sacadas con `gradlew signingReport` desde la copia principal,
  donde está `keystore.properties`):
  - release `B5:AE:3A:55:35:81:C0:53:F7:7F:2F:0F:D2:A6:CE:14:AC:2A:27:62`;
  - debug `E3:7C:0A:F8:D8:EC:BD:11:EE:F8:14:21:39:1B:36:59:44:82:43:EE`.
  - Prueba: sin cabeceras, con `Referer` ajeno y con el paquete sin firma →
    **403**. La APK sigue funcionando en el teléfono del dueño.
- **M-5, Cloudinary `tsc_logos`:** Unsigned, carpeta `tsc-logos`, sin
  sobrescribir, public ID automático (inadivinable), incoming transformation
  `c_limit,w_2048,h_2048,q_auto`, formatos `jpg, png, webp`.
  - El preset **no tiene campo de tamaño máximo**: el límite lo pone el plan de
    la cuenta. El checklist decía 10 MB por error de supuesto.
  - Las fotos HEIC de iPhone quedan rechazadas; si hace falta, agregar `heic`.
  - Prueba del dueño: cambio de escudo desde el perfil y foto en una galería
    del palmarés, las dos OK.
- **Hallazgo:** había un segundo preset unsigned, `cobral_fotos` (creado el
  2026-10-02), que no usa ningún repo. El dueño le aplicó la misma protección
  (carpeta `cobral`, sin sobrescribir, la misma transformación y formatos).
- **Estado:** 3.3, 3.4 y 3.6 cerrados del todo. 3.5 sigue en la semana de
  Report-Only, que empieza con el merge.

## Semana de Report-Only (3.5)

- **Inicio:** 2026-10-11 03:43 UTC, merge de
  [PR #7](https://github.com/theperfectory-blip/tsc-web/pull/7) (`beb692f`) y
  deploy de Hosting por CI (verde).
- **Verificado en producción** el mismo día:
  - `curl -sD - -o /dev/null https://teamsubscup.web.app/` muestra
    `Content-Security-Policy-Report-Only` con la política de `csp.mjs`.
  - Visita anónima con `__TSC_READONLY__ = true` a panel, equipos,
    calendario, sorteo, historial y palmarés: **0 violaciones** (evento
    `securitypolicyviolation`) y consola sin avisos de CSP.
  - No se revisaron las páginas del admin con sesión ni la APK (la `<meta>`
    llega con la próxima release).
- **Fecha de revisión: 2026-10-18 o después.** Pasos:
  1. Abrir la consola del navegador (F12) en escritorio y en el celular y
     recorrer: panel, palmarés (Sala 3D), sorteo, calendario, login, perfil
     (cambiar foto), admin (equipos, partidos, usuarios) y exportar historial.
     Buscar mensajes "Content Security Policy" / "Report Only".
  2. Si no aparece ninguno: cambiar la clave a `Content-Security-Policy` en
     `firebase.json` (los dos headers) y en el check de `scripts/csp.mjs`,
     correr `node scripts/csp.mjs --check` y publicar (merge a `main`).
  3. Si aparece alguno legítimo: agregar el origen en `scripts/csp.mjs`,
     sincronizar `firebase.json` y reiniciar la semana.
  4. Marcar 3.5 como CERRADO en el plan.
- Prompt para esa sesión (Sonnet 5.5, low):
  `Cierra el slice 3.5 de docs/MACRO_SLICE_DEBUGGING.md (paso a enforce)`.

## Paso a enforce (3.5) · 2026-10-19

Revisión al cumplirse la semana (sin `report-uri`, así que la evidencia es la de cada recorrido):

- **Producción, vista pública** (`teamsubscup.web.app`, con `__TSC_READONLY__ = true`, solo lectura), en panel, palmarés, calendario, equipos, sorteo e historial:
  - Escritorio: 0 eventos `securitypolicyviolation` y ningún aviso de CSP en la consola.
  - Móvil emulado (375 px, user agent de Android): solo `apis.google.com/js/api.js` y su `gapi_iframes`, que es H-38, inocua y que **no** se debe permitir.
  - No se recorrió el panel admin en producción: algunas vistas sincronizan datos al renderizar.
- **Sandbox con la política en modo enforce** (`node scripts/emu-xss.mjs csp`, `localhost:3001/csp.html`, con el código actual de M5), en `tsc-src` y en `dist`, con sesión de admin: **0 violaciones** en:
  - las 6 páginas públicas y la Sala de Trofeos 3D (Draco, texturas `blob:`);
  - las 14 páginas admin;
  - los modales de equipo, competición y fase, el selector de color y el perfil.
- **Cambio:**
  - `firebase.json`: los dos headers pasan de `Content-Security-Policy-Report-Only` a `Content-Security-Policy`.
  - `scripts/csp.mjs --check`: ahora exige esa clave y da `OK (2 headers, Content-Security-Policy)`.
  - `build-web` OK.
  - La APK ya la aplicaba en enforce (`<meta>`).
- **No verificable en local:** el emulador de hosting no aplica headers propios (tampoco `X-Frame-Options`).
- **Después del merge a `main` (deploy por CI):**
  - `curl -sD - -o /dev/null https://teamsubscup.web.app/` debe mostrar `Content-Security-Policy:`.
  - Abrir la web en el celular e iniciar sesión.
  - Si algo se rompe, volver la clave a `-Report-Only` y desplegar.
