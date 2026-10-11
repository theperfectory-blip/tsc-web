# MS-3.1 / 3.2 · Barrido de sinks y reglas de `users` · 2026-10-11

Hallazgos que cierra: H-28 (sinks de `teams.name` fuera de 0.1) y H-06
(`users` sin allowlist en el alta ni validación de valores). Todo se probó en
el sandbox (emuladores + `tsc-emu` / `tsc-emu-dist` en `:3001`). Producción
no se tocó.

## 3.1 · Mapa de confianza

| Rol | Qué puede escribir (reglas) | Dónde termina |
|---|---|---|
| Anónimo | Nada | — |
| Usuario registrado | Su `users/{uid}`: en el alta los campos de `_loadProfile`; después `displayName`, `username`, `photoURL`, `timezone` y los de push | Panel admin (Usuarios, selector de presidente en Equipos), su perfil, su avatar en la barra |
| Presidente con equipo | Además, `teams/{suyo}.name` y `.logo` (si no tiene `lockEdits`) | Todo el sitio: tablas, brackets, playoff, calendario, historial, palmarés, sorteo, modales admin, `title=` y `aria-label` |
| Admin | Todo | — |

`teams.name` se copia a otras colecciones cuando escribe el admin (`coins.teamName`,
`palmares`, `teams.previousNames` / `historyNames`), así que esos valores
también se tratan como datos de presidente.

Toasts y `showConfirm` usan `textContent`: no son sinks.

## 3.1 · Cambios

Sinks con datos de presidente o usuario que no escapaban (todos al helper de
`sanitize.js`):

- **Contexto atributo, explotable hoy pese a la regla de 0.1** (la regla veta
  `<` y `>`, no las comillas):
  - `teams.js` modal de edición: `value="${team.name}"` (y `ini`, `pres`). Un
    nombre con `"` inyectaba atributos en el panel del admin.
  - `playoff.js:226` y `:385`: el nombre iba dentro de `onclick="…('${name}')"`
    escapando solo `'`. Con `"` se salía del atributo. Ahora viaja como
    literal JSON: `escAttr(JSON.stringify(name))`.
  - `users-admin.js`: `{ uid: d.id, ...d.data() }` dejaba que el campo `uid`
    del perfil (lo escribe el usuario al registrarse) pisara el id real. Ese
    valor iba en `onchange="adminSetUserRole('${_uaEsc(uid)}')"`: el escape HTML
    se deshace antes de correr el JS (`&#39;` vuelve a ser `'`), así que era
    ejecución de código en el panel admin, y además el admin podía cambiarle el
    rol a otra cuenta creyendo que tocaba la del atacante. Ahora el id va al
    final del spread y los tres handlers usan JSON.
  - `bracket.js`: los `JSON.stringify(slot.teamA/B)` de los handlers pasan por
    `escAttr` (un id legacy de tipo string rompía el atributo).
- **Contexto texto** (los mitigaba la regla de 0.1 para el presidente, no para
  datos viejos ni para lo que copia el admin):
  - `matches.js`: tabla de rondas admin, modal de resultado, modal de partido,
    "libre", avisos de cruce repetido, vista previa del ganador.
  - `bracket.js`: nombre del campeón, filas de ida y vuelta, `refBadgeHTML`
    (las refs `fixed` llevan el nombre), modal de partido, modal de slot.
  - `playoff.js`: supercopa, cruces, iniciales, modal de leg, selectores de
    asignación (`optgroup label` y `option`).
  - `standings.js`: tabla de grupo admin (nombre, iniciales, color), modal de
    asignación a grupos, refs.
  - `coins.js`: modal de coins e historial (nombre, iniciales, color, nota).
- **URLs** (`teams.logo`, `users.photoURL`): 23 sinks que escapaban con un
  helper local pero no validaban el esquema pasan a `safeImgUrl` (calendario,
  historial, palmarés, perfil, bracket público, panel, coins, tabla de grupo,
  avatar de la barra). Las vistas previas locales del recorte (`data:`/`blob:`
  generadas por el navegador) quedan como están.
- `auth.js` y `profile.js`: el alta y la edición del perfil validan el nombre
  (hasta 64, sin `<>`) y el @usuario (`[a-z0-9_]{1,30}`) igual que las reglas,
  para mostrar un mensaje en vez de un `permission-denied`. En el alta esto
  evita además una cuenta de Auth sin documento en `users`.

No se tocaron los sinks que ya escapaban con su copia local (`_esc`, `_pbEsc`,
`_tkEsc`…): son equivalentes a `escHtml`, y unificarlos es 7.1 (H-22). Los
nombres de competición, fase, temporada, bombo y criterio (solo admin) quedan
para 7.1 / 7.5.

## 3.1 · Herramienta nueva

`scripts/emu-xss.mjs` + `scripts/emu-xss.js` (solo sandbox):

- `data`: genera `sandbox/backup-xss.json`. Cada nombre de equipo (y
  `historyNames` / `previousNames`) lleva un marcador
  `<zq-t></zq-t>"zq-a=1 '-zqx()-' zq-b=1 ZQ`, reemplazado por valor exacto en
  todas las colecciones (193 reemplazos). Cada logo lleva `" zq-l="1`.
- `users`: el mismo marcador en `displayName`, `username` y `photoURL` de los
  usuarios del emulador, más un usuario extra con el marcador en su campo `uid`.
- `page`: sincroniza el código de `tsc-src` y arma `xss.html` (y la variante
  dist) con un detector que se carga antes que la app. El detector registra
  cualquier `<zq-t>` o atributo `zq-*` que aparezca en el DOM y los handlers
  `on*` con el marcador que no sean un literal JSON válido, con la pila del
  `innerHTML` que los creó. Lectura: `window.__XSS__.report()`.

## 3.2 · Cambios

`firebase/firestore.rules`, bloque `users`:

- **Alta:** `keys().hasOnly([...])` con los 10 campos de `_loadProfile`;
  obligatorios `uid`, `role`, `teamId` y `lockEdits`. `uid` igual al del
  token, `email` igual al del token, `role == 'president'`, `teamId == null` y
  `lockEdits == true` (la cuenta nace bloqueada, como hace el cliente).
  `displayName` de 1 a 64 sin `<>`, `username` `null` o `[a-z0-9_]{1,30}`,
  `photoURL` `null` o Cloudinary de la cuenta (mismo patrón que `teams.logo`),
  `timezone` `null` o IANA, `createdAt` string.
- **Edición propia:** la misma allowlist de antes, y ahora cada campo se valida
  si cambia: los cuatro de perfil con las mismas reglas, `fcmTokens` lista de
  hasta 20, `pushEnabled` bool, `pushPlatform` en `android`/`ios`/`web`,
  `pushUpdatedAt` string. Un valor histórico que hoy no pasaría no bloquea
  editar otro campo.
- `functions/test/rules-suite.js` (nuevo) y `npm run test:rules` ahora corre
  `rules-teams.js` y la suite.

## Verificación

- **Reglas (emulador de Firestore, `npm run test:rules`):**
  - `rules-teams.js`: **21/21**.
  - `rules-suite.js`: **350/350**. Cubre las 14 colecciones del torneo (lectura
    y listado anónimo; alta, edición y baja con los 5 roles), `teams`, `users`
    (lectura, listado, 21 casos de alta, 31 de edición, baja),
    `notificationRuns` y `notificationEvents` (nadie escribe, ni el admin) y
    una colección sin regla (cerrada). Casos clave: nadie se auto-asciende a
    admin (alta ni edición), nadie se asigna equipo ni se desbloquea, nadie
    escribe notificaciones, el presidente no toca equipos ajenos ni otros
    campos del suyo.
  - **Prueba negativa:** la misma suite contra las reglas anteriores (`HEAD`)
    da **324/350**. Los 26 casos que fallan son exactamente los endurecidos
    (13 de alta, 13 de edición). Cada alta usa su propio uid para que una
    regla floja no se esconda detrás de un 409.
- **Barrido dinámico, `tsc-src` en el sandbox (`xss.html`, datos con marcador):**
  - Antes de corregir: 4 inyecciones en el recorrido por páginas
    (`renderGroupTable`, `renderRondasAdmin` ×2, logo de `renderCoinsTable`).
  - Recorrido completo: 7 páginas públicas, 14 admin, las 10 fases con todos
    sus grupos, y los modales de ronda, partido, generador de fechas,
    asignación a grupos, partido de bracket, slot, resultado, leg de playoff,
    supercopa, equipo, coins, historial de coins, perfil y celda del palmarés.
    Ese recorrido encontró 3 más (el nombre del campeón en los 3 brackets,
    `bracket.js`) y 18 handlers de playoff con el nombre adentro, que ya
    estaban en la forma JSON corregida: el detector se ajustó para aceptar
    solo ese caso (el código compila y la comilla del marcador va escapada).
  - Después: **0 inyecciones**, con **176 marcadores visibles** en pantalla.
  - El handler de playoff recibe el nombre intacto (se interceptó
    `openPlayoffLegModal`: el argumento coincide con `teams.name`, marcador
    incluido).
  - Usuarios admin: los handlers usan el id del documento
    (`adminSetUserRole("zq-extra-user", …)`), no el `uid` falso del perfil.
- **Barrido dinámico, `dist` (`tsc-emu-dist`, 9 bundles):** ver el resultado
  más abajo.
- **Flujos reales contra las reglas nuevas (sandbox):**
  - Alta desde el formulario: con nombre `Malo <b>` muestra el mensaje y no
    crea la cuenta. Con nombre válido, el perfil se crea con `role: president`,
    `teamId: null` y `lockEdits: true`, sin errores en consola.
  - El mismo usuario: push (`arrayUnion` / `arrayRemove` del token), zona
    horaria y perfil (nombre + foto por la subida simulada) se guardan bien.
  - Presidente con equipo: nombre y escudo de su equipo se guardan bien.
  - Cambiar el @usuario falla con `permission-denied`: ver H-31.
- `node scripts/audit-wiring.mjs`: 0 handlers rotos (como antes).
  `node scripts/smoke-parity.mjs`: **PARIDAD OK** (902 globales y 26
  listeners en las dos variantes, 0 errores de carga).
  `node scripts/build-web.mjs` (37 JS → 9 bundles) y `build-www.mjs`: OK.
  `node --check` de los 37 JS: OK.

## Pendientes / hallazgos nuevos

- **H-30 (datos, M5 con Opus):** `openPlayoffLegModal` recibe los **nombres**
  de los equipos y `savePlayoffLeg` los guarda como `teamA` / `teamB` del
  partido, en vez de los ids. En el snapshot no hay partidos de playoff
  guardados así (los legs que hay son de bracket), pero el primero que se
  cargue desde ese modal queda con nombres, y `getWinner` compara contra ids.
- **H-31 (funcional, 3.7):** el presidente no puede cambiar su @usuario. La
  verificación de unicidad de `profile.js` consulta
  `users where username == …`, y las reglas no dejan listar `users` a un no
  admin (nunca lo dejaron). Abrir esa consulta expondría los perfiles. Hace
  falta una colección `usernames/{nombre}` o quitar el @usuario.
- `users.email` queda viejo si el usuario cambia su email
  (`verifyBeforeUpdateEmail`): las reglas no le dejan reescribirlo. Va a 3.7.
- Nombres de competición, fase, bombo y criterio sin escape (solo admin) y
  handlers inline con claves de copa: 7.1 / 7.5.

## Acción del dueño requerida

- **M-3 (parcial):** `firebase deploy --only firestore:rules` desde esta rama.
  Son compatibles con el cliente actual de producción: el alta de
  `_loadProfile` ya manda exactamente esos campos con `lockEdits: true`, y la
  edición del perfil y el push ya mandan valores válidos. Un nombre con `<>` o
  de más de 64 en el alta fallaría con el cliente viejo (antes se aceptaba); con
  este cliente muestra un mensaje.
- El escape de los sinks llega a producción con el merge del macro 3 (M-2).
