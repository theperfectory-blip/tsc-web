# MS-3.7 · Cuentas (D7) · 2026-10-11

Hallazgos que cierra: H-31 (@usuario sin verificación de unicidad para el
presidente) y los tres puntos del plan: email verificado para asignar equipo,
borrado de cuenta y `users.email` viejo. Todo se probó en el sandbox
(emuladores y `tsc-emu` en `:3001`); producción no se tocó.

## Qué pasa al borrar una cuenta (respuesta a la pregunta del plan)

- **La app no tiene botón de "borrar cuenta"** (`grep` de `deleteUser` y
  `.delete()` sobre `users`: nada).
- El vínculo presidente–equipo vive en `users.teamId`, y el nombre del
  presidente que ve el admin sale de ahí (`buildPresidentByTeam`). Si se borra
  el perfil, el equipo **no queda apuntando a nadie**: simplemente queda sin
  presidente. `teams.pres` es un texto libre del admin, no un vínculo.
- Los tokens FCM viven dentro de `users/{uid}`: se van con el perfil.
- **El único camino que deja huérfanos** es borrar la cuenta en Firebase Auth
  (consola o Admin SDK): el perfil queda con su `teamId`, su `role` y los
  tokens de un dispositivo que ya no es suyo, y el @usuario reservado.
  `notify.js` limpia tokens inválidos solo cuando FCM los rechaza.
- Se agregó `onAuthUserDeleted` (ver abajo) para ese caso. Las reglas de
  borrado de `users` no cambian (cada quien el suyo, el admin cualquiera): un
  intento de restringirlo para admins no protegía nada, porque `isAdmin()` ya
  los deja pasar, y se descartó.

## Cambios

**Reglas (`firebase/firestore.rules`)**

- **Email verificado.** El admin no puede leer Auth y las reglas no ven el
  email de otro usuario, así que el propio usuario deja escrito
  `users.emailVerified = true`, y la regla solo lo acepta si el token de la
  sesión trae `email_verified`. No puede ponerlo en `false` ni autoasignarse
  el flag con un token sin verificar. Después:
  - El admin solo puede asignar un `teamId` a una cuenta con
    `emailVerified == true`. Quitar el equipo siempre se puede, y el admin
    queda exento en su propia cuenta (si no, no podría ser dueño de un club).
- **Email viejo.** `users.email` entra a la allowlist de edición, pero solo
  con el valor del token (`request.auth.token.email`). Así el cliente puede
  alinear el perfil después de `verifyBeforeUpdateEmail` y nadie puede
  escribir el de otro.
- **`usernames/{nombre}`** (H-31): documento `{ uid }`.
  - Se puede leer uno (para avisar "ya en uso") si hay sesión, no listar la
    colección (ni el admin: no hace falta).
  - Se crea con el id `[a-z0-9_]{1,30}`, solo con `uid` y solo a nombre propio
    (el admin, a nombre de cualquiera). No se pisa ni se actualiza: crear uno
    que ya existe es un update y se rechaza. Se borra el propio.
  - `users.update` de `username` exige, con `getAfter`, que la reserva del
    nombre nuevo sea del usuario: el cambio es un lote atómico (reservar el
    nuevo, liberar el viejo, actualizar el perfil).

**Cliente**

- `auth.js` `_syncAccountFlags` (al iniciar sesión, sin bloquear el arranque):
  - Si el perfil no tiene `emailVerified` y la cuenta ya verificó, refresca
    el usuario y el token y lo escribe.
  - Si el email del perfil difiere del de la sesión, lo alinea.
  - Si el perfil tiene @usuario sin reserva (cuentas anteriores a 3.7), la
    crea.
- `profile.js` `saveProfile`: la consulta `users where username == …` (que las
  reglas nunca dejaron a un no admin) se reemplaza por la reserva en lote. Si
  el nombre ya es de otro muestra "Ese nombre de usuario ya está en uso" y no
  guarda nada.
- `users-admin.js`:
  - Columna de email con "verificado" / "sin verificar" (texto, sin emojis).
  - Los equipos del selector quedan deshabilitados para cuentas sin
    verificar (se puede seguir quitando el club).
  - `_uaBackfillUsernames`: al abrir Usuarios, el admin reserva los @usuario
    que aún no tienen reserva (idempotente).
  - `loadUsersForSelect` y el selector de presidente del modal de equipo
    respetan lo mismo.
- `functions/lib/onAuthUserDeleted.js` + `index.js`: trigger de Auth de 1.ª
  gen. Al borrarse una cuenta en Auth borra `users/{uid}` y libera su
  `usernames/{nombre}` (solo si la reserva sigue siendo suya). La lógica
  (`cleanupDeletedUser`) es pura y se prueba contra el emulador.

## Verificación

- **Reglas (`npm run test:rules`):** 21/21 + **379/379** (eran 350). Casos
  nuevos: admin asignando equipo a cuenta sin verificar (403) y verificada
  (200), quitar equipo, exención del admin en su cuenta; `emailVerified` con
  token verificado, sin verificar, ajeno, en `false`, no bool; `email` igual y
  distinto al del token; `usernames` (leer, listar, crear propio, a nombre de
  otro, nombre inválido, campo extra, pisar, borrar ajeno y propio, admin);
  `username` por lote (reserva propia, sin reserva, reserva ajena, lote con
  nombre tomado, cambio atómico).
  - **Prueba negativa** contra las reglas anteriores: 368/379. Los 11 casos
    que fallan son los de 3.7. (Una primera versión de "emailVerified con token
    verificado" pasaba también con las reglas viejas porque el perfil
    sembrado ya tenía el flag; se corrigió para que dependa de la regla.)
- **`npm run test:cleanup`:** 9/9 (borra perfil y reserva propia, no libera
  una reserva ajena, sin @usuario, idempotente, y el trigger está exportado en
  `index.js`). `npm run test:emulator` (harness de Functions) sigue pasando.
- **Cliente real contra las reglas nuevas** (sandbox, `tsc-src`):
  - Presidente sin verificar: su perfil no tiene `emailVerified`; intentar
    escribirlo → `permission-denied`.
  - Admin, panel Usuarios: la cuenta aparece "sin verificar" con 61 de 63
    opciones deshabilitadas; asignarle el equipo 2 saltándose la UI →
    `permission-denied`; quitarle el club → ok.
  - En el emulador de Auth se marcó el email como verificado y se cambió
    (`presi.nuevo@emu.test`). Al iniciar sesión el perfil quedó con
    `emailVerified: true` y el email nuevo; el panel muestra "verificado" y el
    admin le asigna el equipo 2.
  - @usuario desde el formulario de perfil: el presidente toma `presi_uno`
    (reserva y perfil); el admin intenta el mismo → "ya en uso" y no cambia;
    el presidente renombra a `presi_dos` (la reserva vieja desaparece); borra
    el @usuario (la reserva se libera); listar `usernames` → `permission-denied`.
  - Cuenta anterior a 3.7 con @usuario sin reserva: el panel de Usuarios la
    reserva, y si se borra, la propia cuenta la repone al iniciar sesión.
  - Nota: en esa corrida un intento de escribir `username: 'presi_uno'` sin
    reserva lo hizo el **admin** y pasó, porque el admin puede escribir
    cualquier campo de perfil. El caso de un no admin está en la suite (403).
  - Consola sin errores en una pestaña limpia (admin: 3 páginas públicas,
    4 admin, modal de equipo y perfil; presidente: perfil).
- `node scripts/build-web.mjs`, `build-www.mjs`, `csp.mjs --check`: OK.
  `smoke-parity`: PARIDAD OK. `audit-wiring`: 0 handlers rotos.
- No se probó `dist` en el navegador: el código es el mismo concatenado y la
  paridad lo confirma.

## Pendientes / hallazgos nuevos

- **Cuentas existentes:** hasta que cada presidente inicie sesión con el
  cliente nuevo, su perfil no tiene `emailVerified` y el admin no podrá
  asignarle un equipo (aparece "sin verificar"). Los clubes ya asignados no
  se tocan. Si un presidente verificó su email hace tiempo, basta con que
  entre una vez.
- **Cuentas sin verificar:** hoy se puede registrar sin verificar y el correo
  de verificación solo se envía desde el perfil
  (`profileResendVerification`). No se envía solo al registrarse. Se podría
  mandar al crear la cuenta; no se tocó para no cambiar el flujo de alta (queda
  para M4/M5, sección de login).
- **Despliegue de Functions:** `onAuthUserDeleted` es nueva y necesita
  `firebase deploy --only functions:onAuthUserDeleted`. No se probó el trigger
  real contra el emulador de Auth (solo su lógica); el evento lo emite Firebase
  al borrar la cuenta. Se confirma borrando una cuenta de prueba y mirando el
  log de la función.
- La regla de la CSP y el resto del macro 3 quedan como estaban.

## Acción del dueño requerida

- **M-3 (se amplía):** `firebase deploy --only firestore:rules,storage` desde
  `claude/slice-3`. Sin esto el cliente nuevo no puede cambiar @usuario (el
  `getAfter` no existe en las reglas viejas).
- **Functions:** `firebase deploy --only functions:onAuthUserDeleted`.
- Orden recomendado: reglas primero y el merge (cliente) después. Con las reglas
  nuevas y el cliente viejo, el @usuario ya no se puede cambiar y el admin no
  puede asignar equipos a cuentas sin `emailVerified`, hasta que el cliente
  nuevo esté publicado y las cuentas hayan iniciado sesión.
