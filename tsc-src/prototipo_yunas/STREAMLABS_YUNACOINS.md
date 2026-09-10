# Streamlabs ↔ YuNaCoins — notas para retomar en otra sesión

> Estado: **exploración, nada implementado ni decidido en firme.** Este
> documento existe para no perder el contexto investigado — retomar acá
> antes de volver a preguntar lo mismo.

## Objetivo

Cablear el sistema de Loyalty Points de Streamlabs Cloudbot (moneda
"YuNaCoins", canal de YouTube de Luis) con el sistema de YuNaCoins de la
web (`coins.js`), que hoy es un ledger manual que carga el admin a mano.
Estos son los puntos con los que los presidentes de equipo aplican mejoras
a sus equipos.

## Estado actual del lado web (`coins.js`)

- Store `coins` en Firestore/IndexedDB, un registro por transacción:
  `{teamId, teamName, mode, amount, reason, note, before, after, season, date}`
  ([coins.js:143](tsc-src/js/coins.js#L143)).
- 100% manual: el admin abre un modal por equipo (`saveCoinsTransaction`,
  [coins.js:135](tsc-src/js/coins.js#L135)) o hace una carga masiva
  (`saveBulkCoins`, [coins.js:234](tsc-src/js/coins.js#L234)).
- **No existe ningún campo hoy que vincule un equipo/presidente con su
  username de Twitch/YouTube.** Es el primer gap a resolver antes de
  sincronizar nada — sin ese mapeo no se sabe a qué equipo le corresponden
  los puntos de qué usuario de Streamlabs.

## Lo que Streamlabs ofrece (investigado, no asumido)

- Portal de developers: `dev.streamlabs.com`. El Cloudbot/Loyalty en sí es
  parte del plan **gratuito** de Streamlabs (no requiere Ultra, que es para
  overlays/multistreaming — otra cosa).
- Endpoints de puntos (API v1.0, confirmados en la doc):
  - `GET /points` / `GET /points/user_points` — leer puntos de un usuario.
  - `GET /points/group_get_points` — leer puntos de un grupo/rango.
  - `POST /points/user_point_edit` — modificar puntos de un usuario.
  - `POST /points/add_to_all` — sumar puntos a todos.
  - `POST /points/subtract` / `/points/group_subtract_points` — restar.
  - `POST /points/import` — importación masiva.
  - `POST /points/reset` — resetear.
  - Todos requieren `access_token` (OAuth) + identificar `username`/`channel`.
- **Precio: no encontré ningún costo asociado a la API en sí** (ni en FAQ ni
  en la doc de developers). Lo que hay es un sistema de **tiers por límite
  de requests**, no de pago: TESTING = 5 req/min (al registrar la app),
  APPROVED = 2400 req/min (tras pedir revisión a Streamlabs), Unlimited.
  2400 req/min sobra de sobra para decenas de presidentes de equipo.
- Fuentes: [Tiers](https://dev.streamlabs.com/docs/tiers),
  [Getting Started](https://dev.streamlabs.com/docs/getting-started),
  [FAQ](https://streamlabs.com/faq).

## Arquitectura necesaria

- El OAuth de Streamlabs necesita un `client_secret` que **no puede vivir
  en el browser** (mismo principio que `firebase-config.js`/`cloudinary.js`
  gitignored). El proyecto ya tiene `functions/` (Cloud Functions, las
  mismas que usan para push FCM) — ahí es donde iría el handshake OAuth +
  las llamadas a la API de puntos, no en `coins.js` directo.
- Falta decidir el **mapeo usuario de stream ↔ equipo/presidente** — dato
  que solo Luis tiene (no se puede inferir del código).

## Decisión abierta — dirección del sync (SIN RESOLVER)

Tres opciones, sin decidir todavía:
1. **Streamlabs manda**: los viewers ganan puntos orgánicamente mirando/
   chateando, se importan de solo lectura a `coins`.
2. **La web manda**: el admin ajusta YuNaCoins por rendimiento de equipo
   (como hoy), y eso se empuja a Streamlabs para que se vea en overlays del
   stream.
3. **Bidireccional**: las dos cosas a la vez — mucho más complejo, necesita
   resolver conflictos si cambian por los dos lados a la vez.

**Esto hay que decidirlo antes de poder armar el slice de implementación.**

## Qué se necesita de Luis (una vez resuelta la dirección del sync)

1. **Autorizar la app** — el registro de la app en dev.streamlabs.com lo
   puede hacer el developer (no necesita su cuenta), pero el paso de
   "Autorizar esta app a acceder a mi Streamlabs" sí lo tiene que hacer él,
   logueado con su propia cuenta (es su Cloudbot).
2. **Confirmar el canal** — la captura que mandó muestra el toggle
   "YouTube" arriba a la derecha del panel de Loyalty Settings, así que el
   Cloudbot está atado a su canal de YouTube — falta el identificador
   exacto que usa Cloudbot.
3. **Mapeo usuario↔equipo** — de la lista de ~80 usuarios con puntos
   (`@LuisYuNa3210`, `@TheRationalUser`, `@madridista1423`, etc.) solo él
   sabe qué username corresponde a qué presidente/equipo.

## Próximo paso al retomar

Decidir la dirección del sync (arriba) → recién ahí armar
`MACRO_SLICE_STREAMLABS.md` con el mismo formato pre-slice que
`MACRO_SLICE_MEJORAS.md`/`MACRO_SLICE_CALENDARIO.md` → pedirle a Luis los 3
puntos de arriba antes de implementar la parte de OAuth.
