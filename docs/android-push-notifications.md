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

### "Hoy juega [tu equipo]" — MANUAL, no automático

Decisión de producto explícita: esto **no** se dispara solo a las 00:00 ni
por ningún cron. Lo dispara el admin a mano.

- **Trigger:** botón futuro "Notificar stream de hoy" en Calendario/Admin
  (todavía no existe en la UI).
- **Backend (futuro):** al presionar el botón, un endpoint/función busca el
  primer partido pendiente del stream/día por `scheduledDate`/`scheduledTime`
  y notifica solo a los presidentes de **ambos** equipos de ese primer
  partido.
- **Cadencia:** se envían dos avisos separados por 1 minuto a esos mismos
  presidentes.
- **Deduplicación:** clave
  `type + season + date + matchId + teamId + attempt`. Si el admin presiona
  el botón dos veces para el mismo día, no se duplican intentos ya enviados o
  encolados.

### "Tu equipo juega a continuación" — AUTOMÁTICO

Decisión de producto explícita: este sí es automático, pero disparado por
una **acción del admin**, no por un timer.

- **Trigger:** el backend (futuro) escucha cambios en `matches` cuando el
  admin marca un partido `live` (toggle "En Vivo").
- **Lógica:** al marcar un partido en vivo, el backend calcula cuál es el
  **siguiente partido pendiente** por `scheduledDate`/`scheduledTime` y
  notifica a los presidentes de los equipos de ESE próximo partido — no del
  que acaba de pasar a vivo.
- **Deduplicación:** clave `type + currentLiveMatchId + nextMatchId + teamId`.
  Un mismo próximo partido no debe generar más de un aviso por equipo aunque
  el admin marque en vivo varias veces por error.

El evento de finalización puede servir como fallback defensivo si más adelante
se decide reintentar eventos perdidos, pero el disparador de producto es el
cambio a `live`.

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
- Trigger automático de "juega a continuación" enganchado al toggle
  "En Vivo" / finalizar partido ya existentes en `matches.js`/`bracket.js`.
- Deep-link: al tocar la notificación (`pushNotificationActionPerformed`),
  navegar directo a Calendario o al partido correspondiente en vez de solo
  abrir la app en Palmarés.
- Reglas de Firestore para `notificationRuns`/`notificationEvents` cuando se
  cree el schema real (solo backend con Admin SDK escribe ahí; nada de
  cliente).
