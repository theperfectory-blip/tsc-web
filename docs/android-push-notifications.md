# Push Notifications (FCM) — Fase 8

## Alcance de este documento

Cubre lo que ya está implementado (cliente Android: token FCM + timezone
guardados en `users/{uid}`) y el diseño del backend que **todavía no existe**
(envío real de notificaciones). No confundir con el realtime de la app:

- **Foreground (app abierta):** 100% Firestore `onSnapshot`. FCM nunca
  reemplaza ni interfiere con esto — `pushNotificationReceived` solo loguea,
  no dispara ningún re-render.
- **Background/cerrada:** FCM es la única vía para avisar al usuario.

## Flujo cliente (implementado)

1. Usuario activa "Notificaciones" en Configuración (`tsc-src/js/push.js`,
   `window.PUSH.enable()`). Solo ahí se pide el permiso de Android 13+ —
   nunca al abrir la app.
2. `PushNotifications.register()` entrega un token FCM real (evento
   `registration`).
3. El token se guarda:
   - Local: `localStorage.tsc_push_token` (siempre, para poder re-sincronizar
     después).
   - Firestore `users/{uid}` (solo si `AUTH.user` existe en ese momento):
     - `fcmTokens`: `arrayUnion(token)` — array porque un usuario puede tener
       la app instalada en más de un dispositivo.
     - `pushEnabled: true`
     - `pushPlatform: "android"`
     - `timezone`: el valor ya guardado en el perfil, o si no hay ninguno el
       `Intl.DateTimeFormat().resolvedOptions().timeZone` del dispositivo.
     - `pushUpdatedAt`: ISO string.
4. Si **no** hay usuario logueado en el momento del `registration` (invitado
   navegando en modo público), el token queda solo local — no se pierde: al
   iniciar sesión, `window.PUSH.syncUser()` lo sube retroactivamente (llamado
   desde el listener de `onAuthStateChanged` en `auth.js`).
5. Al desactivar (`disable()`): se intenta `arrayRemove(token)` +
   `pushEnabled:false` + `pushUpdatedAt` en Firestore (best-effort — si falla
   por estar offline, no rompe la UI, solo un `console.warn`), se limpia el
   token local, y se llama `removeAllDeliveredNotifications()` en el
   dispositivo.

### Por qué `fcmTokens` es un array y no un campo único

Un presidente puede tener la app en el celular y la tablet. Cada instalación
de la app registra su propio token FCM (no es el mismo dispositivo = no es el
mismo token). El backend futuro debe enviar a **todos** los tokens del
array, no asumir uno solo.

### Zona horaria — sin GPS, nunca

Decisión de producto explícita: **no se pide geolocalización** solo para
saber la hora local del usuario. La fuente es, en este orden:

1. `users/{uid}.timezone` si ya está guardado (el usuario lo puede editar en
   Configuración → Zona horaria, igual que hoy).
2. Si no hay nada guardado todavía: `Intl.DateTimeFormat().resolvedOptions().timeZone`
   del dispositivo en el momento del primer registro de push.

El backend (cuando exista) debe leer `users/{uid}.timezone` para formatear
cualquier hora que aparezca en el texto de la notificación — nunca asumir UTC
ni la zona horaria del servidor.

## Flujos de notificación (diseño — backend NO implementado todavía)

Son **dos** notificaciones distintas, con textos distintos. En el arranque del
stream, "juega hoy" sale como broadcast a **todos** los que juegan ese día y,
~1 minuto después, "juega a continuación" sale a los presidentes del **primer**
y del **segundo** partido. Por eso, en el arranque, los presidentes del 1º y del
2º partido reciben **dos** avisos separados por ~1 minuto (broadcast "juega hoy"
+ "juega a continuación"), mientras que el resto de los que juegan ese día recibe
solo el broadcast "juega hoy". El broadcast no tiene excepciones: todo el que
juega hoy lo recibe.

### "Tu equipo juega HOY" — MANUAL

Decisión de producto explícita: esto **no** se dispara solo a las 00:00 ni
por ningún cron. Lo dispara el admin a mano al iniciar el stream del día.

- **Trigger:** botón futuro "Notificar stream de hoy" en Calendario/Admin
  (todavía no existe en la UI).
- **Destinatarios:** **todos** los presidentes que tienen un partido
  programado ESE día. Es un broadcast a todo el que juega hoy — **no** solo al
  primer partido.
- **Backend (futuro):** al presionar el botón, un endpoint/función junta los
  partidos del día por `scheduledDate` y notifica una vez a cada presidente
  involucrado.
- **Deduplicación:** clave `type + season + date + teamId`. Si el admin toca
  el botón dos veces el mismo día, un presidente no recibe "juega hoy"
  duplicado.

### "Tu equipo juega A CONTINUACIÓN" — el que le toca ya / el siguiente

Propósito: avisar a los presidentes de un partido inminente para que estén
listos. Tiene **dos** disparadores:

**(a) Arranque del stream (primer partido).** Como el primer partido no tiene
un partido previo que se ponga "En Vivo" para dispararlo, el backend manda
"juega a continuacion" automaticamente **~1 minuto despues** del broadcast
"juega hoy". Ejemplo: Luis arranca el stream con Malvinas vs Lechugueros de
primer partido -> "juega a continuacion" sale a **4 presidentes**:

- los 2 del **primer** partido (Malvinas y Lechugueros — les toca ya), y
- los 2 del **segundo** partido programado (van justo después).

**(b) Durante el stream (resto de partidos).** Cuando el admin marca un partido
como "En Vivo" (toggle live), el backend notifica a los 2 presidentes del
**siguiente** partido programado en el calendario — el que va a continuación del
que se acaba de poner en vivo, no del que ya está en vivo.

- **Deduplicacion:** clave `type + targetMatchId + teamId`, donde
  `targetMatchId` es el partido avisado (el primero cuando le toca ya, o el
  siguiente cuando va a continuacion). Un mismo partido objetivo no genera mas
  de un aviso por equipo, aunque se dispare por dos vias (p.ej. el segundo
  partido: una vez en el arranque y otra al marcar el primero en vivo — con
  esta clave, recibe uno solo).

El evento de finalización de partido puede servir como fallback defensivo si más
adelante se decide reintentar eventos perdidos, pero el disparador de producto
es el cambio a `live`.

## Colecciones futuras sugeridas (no creadas todavía)

- **`notificationRuns/{id}`** — un documento por "corrida" de notificación
  (manual o automática), con qué tipo fue, cuándo, y qué claves de
  deduplicación ya se cubrieron. Es lo que el backend consulta ANTES de
  enviar, para no repetir.
- **`notificationEvents/{id}`** (opcional, auditoría) — un documento por
  notificación individual efectivamente enviada (a qué uid, qué token, qué
  resultado de FCM) para poder debuggear "por qué no le llegó a fulano".

Ninguna de las dos existe todavía ni tiene reglas de Firestore — se diseñan
recién cuando se implemente el backend, para no versionar un esquema
especulativo.

## Reglas de Firestore (implementado)

`users/{uid}` — el usuario edita su propio documento con una **allowlist**
explícita de campos (antes era "cualquier campo salvo role/teamId/lockEdits",
lo que de paso permitía reescribir `email`/`uid`/`createdAt` sin querer):

```
'displayName', 'username', 'photoURL', 'timezone',
'fcmTokens', 'pushEnabled', 'pushPlatform', 'pushUpdatedAt'
```

El admin sigue pudiendo editar cualquier campo de cualquier usuario. Un
usuario no puede leer ni escribir el documento de otro usuario (sin cambios,
ya era así).

## Pendiente para la siguiente fase (backend)

- Endpoint o Cloud Function con **Firebase Admin SDK** (server-side,
  credenciales que nunca tocan el cliente) que:
  - Lea `notificationRuns` para deduplicar.
  - Lea `users` filtrando por `teamId` + `pushEnabled==true` para juntar los
    `fcmTokens` a notificar.
  - Envíe vía `admin.messaging().sendEachForMulticast(...)` (o equivalente).
  - Formatee cualquier hora en el texto según `users.timezone` de cada
    destinatario (no una hora fija para todos).
- Botón admin "Notificar stream de hoy" en Calendario/Admin + confirmación
  en UI antes de enviar (esto SÍ manda notificaciones reales, no debe ser un
  click accidental).
- "Juega a continuacion": (a) arranque del stream, ~1 min despues del
  broadcast "juega hoy", a los presidentes del 1º + 2º partido (por lo que 1º y
  2º reciben dos avisos separados por 1 minuto: broadcast "juega hoy" +
  continuacion); (b) durante el stream, enganchado al toggle "En Vivo" de
  `matches.js`/`bracket.js`, al siguiente partido programado.
- Deep-link: al tocar la notificación (`pushNotificationActionPerformed`),
  navegar directo a Calendario o al partido correspondiente en vez de solo
  abrir la app en Palmarés.
- Reglas de Firestore para `notificationRuns`/`notificationEvents` cuando se
  cree el schema real (solo backend con Admin SDK escribe ahí; nada de
  cliente).
