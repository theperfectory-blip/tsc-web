# MS-6.1 · Cloud Functions · 2026-10-11

Hallazgos que cierra: H-25 (Node 20 en `functions/`). Más la revisión de
autorización, dedup, limpieza de tokens y región de las funciones.

## Autorización, función por función

| Función | Quién la puede invocar | Evidencia |
|---|---|---|
| `notifyStreamToday` (callable, `southamerica-east1`) | Pública a nivel de red, como todo callable. El código exige `request.auth` y `users/{uid}.role == 'admin'` leído de Firestore, nunca de un campo del cliente | POST sin credenciales a producción → **401** desde el handler. Escenario 3 del harness (no admin → `permission-denied`, sin auth → `unauthenticated`) |
| `notifyStartupContinuation` (task queue, `southamerica-east1`) | Solo Cloud Tasks. Sin `invoker`, firebase-tools no le da `roles/run.invoker` a `allUsers`. **Es el único control**: en producción el handler de firebase-functions solo exige que haya un `Bearer` y lo decodifica sin verificar la firma (`unsafeDecodeIdToken`) | POST sin credenciales a producción → **403** de IAM (el código no llega a correr). Ahora declara `invoker: 'private'` explícito y el escenario 9 lo verifica en el manifiesto |
| `onMatchWentLive` (trigger Firestore, `southamerica-west1`) | La dispara una escritura en `matches/*`, que las reglas solo permiten a `isAdmin()`. Los destinatarios salen de `users.teamId` (solo lo escribe el admin, allowlist de 3.2/3.7), no de campos del partido. Del partido solo usa `season`, `scheduledDate` y `live`, escritos por el admin | `firestore.rules:22` y allowlist de `users` (`firestore.rules:123-144`) |
| `onAuthUserDeleted` (Auth 1.ª gen, `us-central1`) | La dispara Auth al borrar una cuenta | Sin cambios (3.7) |

POST de prueba sin cuerpo útil ni token: no puede tener efectos (IAM lo
corta o el handler lanza antes de leer nada).

## Cambios

- `functions/package.json`: `engines.node` 20 → **22**; `firebase-admin`
  ^13.10 → ^14.5 y `firebase-functions` ^7.2.5 → ^7.4. `npm audit fix` para
  las transitivas (`@fastify/busboy`, `@grpc/grpc-js`, `fast-xml-parser`,
  `proxy-addr`, `qs`…). `npm audit`: **15 vulnerabilidades (1 crítica, 3
  altas) → 0**.
- `functions/lib/notifyStartupContinuation.js`: `invoker: 'private'`
  explícito y comentario de por qué IAM es el único control; el payload de la
  task valida la fecha con el mismo `DATE_RE` que el callable.
- `functions/lib/matchOrder.js`: exporta `DATE_RE` (antes estaba solo en
  `notifyStreamToday.js`).
- `functions/lib/notify.js`: la limpieza de `fcmTokens` también saca los
  tokens con `messaging/invalid-registration-token` (mal formados), no solo
  `registration-token-not-registered`. Los errores transitorios siguen sin
  tocar tokens ni registrar dedup.
- `functions/test/verify-emulator.js`: escenario 9 (invoker privado en el
  manifiesto, payload inválido descartado sin enviar, token mal formado
  limpiado y el sano conservado).

## Revisión sin cambios

- **Dedup.** Claves `today_{season}_{date}_{teamId}` y
  `continuation_{matchId}_{teamId}` (ids de partido globales, no se repiten
  entre temporadas). Se registra solo si hubo al menos un token exitoso
  (escenario 6). El trigger de vivo reacciona solo al flanco `false → true`
  (escenario 4). Carrera conocida y aceptada: ver H-33.
- **Región.** Firestore está en `southamerica-west1`; Cloud Tasks no existe
  ahí, así que callable y task van en `southamerica-east1` y el trigger de
  Firestore en `southamerica-west1` (`lib/config.js`). El cliente llama al
  callable en `southamerica-east1` (`calendar.js:190`) y la CSP lo permite.
  `onAuthUserDeleted` es 1.ª gen y no lee `setGlobalOptions`: quedó en
  `us-central1`, que para un trigger de Auth (global) es indistinto. Moverla
  obligaría a borrar y recrear la función; no vale la pena.
- Manifiesto cargando `index.js` con las deps nuevas: las 4 funciones con su
  plataforma, región y trigger esperados.

## Verificación

Emulador de Firestore (`demo-tsc-web`), Java 21, desde `functions/`:

- `npm run test:emulator` con las deps viejas (línea de base): 1-8 OK.
- `npm run test:emulator` con Node 22 declarado y deps nuevas:
  **"TODOS LOS ESCENARIOS DEL GATE PASARON (1-9)"**.
- `npm run test:cleanup`: 9/9. `npm run test:rules`: 21/21 y 379/379.
- `npm audit`: 0 vulnerabilidades.
- Producción (solo POST sin credenciales): `notifyStartupContinuation` 403,
  `notifyStreamToday` 401.

No se probó: el deploy real con runtime `nodejs22` ni un envío FCM real. El
`enqueue` de la task no corre en el emulador (sin credenciales; ya pasaba
antes y se loguea sin abortar el broadcast).

## Pendientes / hallazgos nuevos

- **H-32** (baja): el usuario escribe su propio `fcmTokens` (hasta 20
  strings cualesquiera). Un presidente podría poner el token de otro
  dispositivo y hacerle llegar los avisos de su equipo. Sin datos sensibles
  en el mensaje; no se corrige.
- **H-33** (baja, aceptada): el dedup lee y después escribe. Si la task de
  arranque (+60 s) y el trigger de vivo del 1.er partido corren en el mismo
  segundo, el presidente del 2.º partido puede recibir dos avisos de "a
  continuación". Ya estaba documentado en `notify.js`.
- **H-34** (latente): `notifyRecipients` usa un solo batch (límite de 500
  escrituras: un evento por token, más dedup y limpiezas). Alcanza para unos
  150 destinatarios por corrida; la liga hoy está muy por debajo.
- **H-35** (va a 6.2): `.github/workflows/firebase-hosting.yml` corre el
  build con Node 20.

## Acción del dueño requerida

**M-9:** `firebase deploy --only functions` **antes del 2026-10-30** (fecha en
que Google desactiva Node 20, aviso del deploy de 3.7). Después, en el
próximo stream, probar el botón "notificar stream de hoy" una vez.

## Deploy (M-9) · 2026-10-11

Hecho por el dueño desde `claude/slice-6`. `firebase functions:list`: las 4
funciones en `nodejs22`, con las mismas regiones (`notifyStreamToday` y
`notifyStartupContinuation` en `southamerica-east1`, `onMatchWentLive` en
`southamerica-west1`, `onAuthUserDeleted` en `us-central1`). Las llamadas
sin credenciales devuelven lo mismo que antes: `notifyStartupContinuation`
403 (IAM) y `notifyStreamToday` 401. El botón "notificar stream de hoy" se
probó ese mismo día (abajo).

**Prueba del botón (2026-10-11, cerrada).** Con un partido de prueba de hoy
(FK TUPADRE, equipo del dueño, contra un equipo sin presidente asignado, así
que nadie más recibió nada) se apretó "notificar stream de hoy" en
producción. `notificationEvents`: a las 01:47:27 UTC salió `today` a los 2
tokens del dueño y a las 01:48:32 UTC (65 s después) `continuation` a los
mismos 2, los cuatro con `success: true` y sin código de error; en
`notificationRuns` quedaron `today_1_2026-10-11_61` y
`continuation_1114_61`. Los dos avisos llegaron al teléfono. Eso prueba de
punta a punta que Cloud Tasks puede invocar la función con `invoker:
'private'` (la cuenta de Cloud Tasks tiene `roles/run.invoker` a nivel de
proyecto; la política propia de la función está vacía a propósito). El partido
de prueba (id 1114) hay que borrarlo después de la prueba: mientras exista
aparece en la fecha 14 del calendario público. Hallazgo menor H-39 (texto de
la hora).
