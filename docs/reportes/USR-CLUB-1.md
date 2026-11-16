# USR-CLUB-1 · Aviso de email sin verificar en Usuarios (club bloqueado)

Rama: `fix/usuarios-club-sin-verificar` (desde `origin/main` 1f24ae6).
Archivo tocado: `tsc-src/js/users-admin.js`.

## Problema

En la pestaña Usuarios del admin, las cuentas con `emailVerified !== true`
muestran las opciones de club deshabilitadas (regla D7; también la exigen
`firestore.rules`). El select queda con opciones grises y sin explicación en
pantalla; solo había un `title` (tooltip) que no se ve sin pasar el mouse.

## Cambio

Debajo del select de club, en las filas de cuentas sin verificar que no son
la del propio admin, aparece el texto visible:

> Email sin verificar: el usuario debe confirmar el correo y volver a iniciar sesión

Mismo criterio que el aviso de presidente en `teams.js` («email sin
verificar»). El select sigue funcionando para quitar el club. La regla no se
toca y no se permite asignar club a una cuenta sin verificar.

## Verificación (sandbox)

Dos usuarios de prueba creados en el emulador de Firestore (no producción):
`qa-verif` (`emailVerified: true`) y `qa-noverif` (`emailVerified: false`),
ambos con rol presidente. Sesión como admin del sandbox, pestaña Usuarios:

| Fila | Email | Select de club | Aviso visible |
|---|---|---|---|
| Prueba verificado | verificado | habilitado | no |
| Prueba sin verificar | sin verificar | habilitado (opciones sin verificar deshabilitadas) | sí |
| Admin Emulador (tú) | sin verificar | habilitado | no (la propia cuenta sigue pudiendo asignarse club, igual que antes) |

Consola sin errores.

Checks de cierre:

- `node scripts/smoke-parity.mjs`: PARIDAD OK.
- `node scripts/audit-wiring.mjs`: rotos 0, fuera de gramática 0, duplicados 0,
  IDs 1, muertas 3 (ya existían).
- `node scripts/csp.mjs --check`: firebase.json OK.
- `node --check tsc-src/js/users-admin.js`: OK.
- Sin `innerHTML` con datos de usuario nuevos (el texto es fijo), sin emojis,
  sin handlers nuevos.
- Sin reglas de Firestore tocadas.

## Pendiente

- Los usuarios `qa-verif` y `qa-noverif` existen solo en el emulador del
  sandbox. No afectan producción.
