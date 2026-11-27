# REGLAPLANT · Cualquier presidente lee los planteles publicados (`pes5_plantillas`)

Decisión de Jimbo: los planteles publicados son información pública del torneo
(el save de Luis se comparte y las instrucciones se dan en el chat del directo).
La Formación en vivo necesita los nombres de los jugadores de cualquier equipo
TSC.

## Cambio de regla

Un solo bloque tocado, `firebase/firestore.rules` → `match /pes5_plantillas/{teamId}`.

Antes:

```
allow read: if isAdmin() || (signedIn() && meExists() && me().teamId != null && string(me().teamId) == teamId);
```

Después:

```
allow read: if isAdmin() || (signedIn() && meExists());
allow write: if isAdmin();
```

- La escritura queda igual: solo admin.
- Se actualizó el comentario del bloque (lectura con sesión + documento en
  `users` porque es información pública; la escribe solo el admin).
- La lectura no exige tener equipo: alcanza con tener documento en `users`, así
  que también lee un `president` sin equipo asignado. Un usuario con sesión pero
  sin documento en `users` sigue denegado (`meExists()`), igual que un anónimo.
- Ninguna otra regla se tocó.

## Tests (`functions/test/rules-pes5.js`)

Se agregó el token `AS.nodoc` (con sesión, sin documento sembrado en `users`) y
se reemplazó el bloque de `pes5_plantillas` por seis casos:

| Caso | Esperado | Resultado |
|---|---|---|
| presidente lee la plantilla de su equipo | 200 | OK |
| presidente lee la plantilla de OTRO equipo | 200 | OK |
| usuario con sesión pero sin documento en `users` no lee | 403 | OK |
| anónimo no lee | 403 | OK |
| presidente no escribe plantillas | 403 | OK |
| admin escribe plantillas | 200 | OK |

`npm run test:rules` desde `functions/` (emulador propio de tests, no el del
sandbox), exit code 0:

```
33/33 casos OK          (rules-teams.js)
rules-suite: 426/426 casos OK
rules-pes5: 114/114 casos OK
```

> Nota de entorno: en esta máquina la JVM no puede crear los sockets AF_UNIX del
> `Selector` de NIO en `%TEMP%` y el emulador de Firestore muere al arrancar
> (`Invalid argument: connect`). Es el mismo motivo por el que
> `scripts/emu-start.mjs` define `-Djdk.net.unixdomain.tmpdir`. Para correr los
> tests hay que exportar antes `JAVA_TOOL_OPTIONS` apuntando ese directorio
> (`%USERPROFILE%\.cache\firebase`, creado antes). Los puertos no estaban
> ocupados por otra tarea.

## Drift con lo publicado (`node scripts/rules-drift.mjs --save=…`)

```
Firestore: DIFIERE del repo · publicado 2026-11-19T04:21:31.400183Z (04213e1c-3f2f-465e-83f3-bd348e1d8376)
Storage:   IGUAL al repo   · publicado 2026-11-17T14:55:46.279804Z (0809ba2c-18bf-4612-bcd2-867c97032eb0)
```

`git diff --no-index` entre la versión publicada y el repo: 4 inserciones y 2
borrados, **todos** dentro de este bloque (el comentario y la línea de
`allow read`). O sea, el único cambio pendiente de desplegar es este. El
despliegue de reglas lo hace el coordinador.

## Comprobaciones

- `node --check functions/test/rules-pes5.js` → OK.
- `node scripts/audit-wiring.mjs` → `rotos 0` (no se tocó código de la app).
- `node scripts/smoke-parity.mjs` → `PARIDAD: OK`.

## Archivos tocados

- `firebase/firestore.rules`
- `functions/test/rules-pes5.js`
- `docs/reportes/REGLAPLANT.md` (este reporte)

Efecto secundario de la comprobación obligatoria: `node scripts/audit-wiring.mjs`
reescribe `docs/reportes/MS-2.3-cableado.md` (lo genera el propio script). Queda
como cambio de árbol, no es una edición de esta tarea. Las modificaciones en
`android/*.gradle` ya estaban en el worktree antes de empezar y tampoco se
tocaron.

## Pendiente

- Desplegar Firestore con `firebase deploy --only firestore:rules` (lo hace el
  coordinador). Hasta entonces, en producción el presidente sigue viendo solo la
  plantilla de su equipo.
- El código de la app no necesita cambios: `mejoras-page.js` lee la plantilla de
  su propio equipo y la Tool (admin) lee todas; la lectura pública de otros
  equipos la usará la tarjeta del equipo / Formación en vivo cuando se
  implemente.
