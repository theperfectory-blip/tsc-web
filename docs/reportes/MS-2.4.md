# MS-2.4 · Arranque y fallos de red · 2026-10-10

Hallazgos: H-23 (confirmado, decisión pendiente en D6). Insumo para D6.
Pruebas en el sandbox (`tsc-emu` `:3001` + emuladores). Producción no se
tocó.

## Resultados por caso (antes → después)

| Caso | Antes | Después |
|---|---|---|
| Cualquier paso de la cadena lanza | El handler de `load` se corta: sin `loadSeasons`, sin `setMode`, sin `onAuthInit` | Cada paso va en `_bootStep`: se registra `[arranque] <paso> falló` y el arranque sigue |
| Visitante anónimo con `seasons` vacía | `seedInitialData` intenta escribir, la regla de `_counters` da 403 y la app **se queda en el splash para siempre**, sin botón "Entrar" | Se registra el error, la app carga vacía, "Entrar" visible: un admin puede entrar y crear la temporada |
| `tsc_season` guardada que ya no existe | `STATE.season` queda en 1 (por defecto) aunque tampoco exista. El selector muestra "Temporada..." y el sitio, la temporada 1 inexistente | Si ni la guardada ni la por defecto existen, va a la temporada activa o, si no hay ninguna activa, a la más reciente. Probado: temporada renumerada a 2 con `tsc_season=99` → `STATE.season=2` |
| `tsc_mode=admin` con perfil lento (3 s de demora simulada) | Se sondeaba `AUTH.role` 1,5 s: el admin queda en **público** sin aviso y `tsc_mode` pasa a `public` | `auth.js` emite `tsc:auth` cuando el rol está resuelto y el arranque sube a admin entonces. Probado: termina en admin |
| `tsc_mode=admin` sin sesión | Público | Público, sin abrir el modal de login (igual que antes) |
| `gstatic` bloqueado | Ver abajo | Igual: el comportamiento es la decisión D6 |

### `gstatic` bloqueado (H-23, insumo para D6)

Simulado con una copia de `index.html` que pedía el SDK a `gstatic.invalid`
(DNS falla, como un bloqueo). Visitante nuevo, sin IndexedDB previa:

- `firebase` queda `undefined`, `USE_FIRESTORE=false` y la app usa IndexedDB
  (`TSC_v4`).
- **H-23 confirmado.** `seedInitialData` siembra en el navegador del
  visitante una temporada "T1" **activa** (la real es T3, finalizada) y los
  60 equipos de `EQUIPOS_INICIALES`, sin logos y con 0 YuNaCoins.
  `seedPalmaresIfEmpty` siembra 30 títulos (en producción hay 38).
  Competiciones, partidos y calendario quedan vacíos. El historial sale del
  JSON estático.
- El visitante ve un sitio de aspecto normal: Palmarés con la vitrina y un
  campeón vigente sacado del seed, **sin ningún aviso** de que no hay
  conexión ni de que los datos son viejos. No hay botón "Entrar" (`onAuthInit`
  sale sin Firebase), así que nadie puede llegar a admin. La rama IndexedDB es
  de solo lectura en la práctica.
- Esos datos quedan guardados en la IndexedDB del visitante. Con Firestore
  disponible no se usan, pero reaparecen cada vez que el SDK no cargue.
- En la APK pasa lo mismo si el SDK no carga (sin conexión al abrir).

**Evidencia para D6:** la rama IndexedDB no es un modo offline útil.
Muestra datos inventados con apariencia de reales. Recomendación: en 7.2,
sacar la rama y los seeds de cliente, y mostrar en el splash
"Sin conexión con el servidor. Revisa tu conexión e intenta de nuevo"
(el texto ya existe a los 25 s). Lo decide el dueño.

## Cambios

- `tsc-src/js/ui-utils.js`
  - `_bootStep(name, fn)`: cada paso del arranque (`initDB`, `setTheme`,
    seeds, migraciones, `loadSeasons`, `setMode`, `onAuthInit`) va con su
    propio try/catch. Si `initDB` falla, se muestra un toast de error y se
    saltan seeds y migraciones.
  - `seedInitialData`: en Firestore, si `seasons` viene vacía, confirma con
    `get({source:'server'})` antes de sembrar. Una lectura sin conexión
    puede volver vacía de la caché y sembraría una temporada y 60 equipos
    duplicados si el que abre es un admin. Sin conexión, la confirmación
    lanza y no se siembra. Costo: una lectura extra solo con la base vacía.
  - Respaldo de temporada: la activa o, si no hay activa, la más reciente,
    cuando ni `tsc_season` ni la 1 existen.
  - Restauración de admin con el evento `tsc:auth` en vez del sondeo de
    1,5 s. El listener se registra antes de `onAuthInit`.
- `tsc-src/js/auth.js`: `onAuthStateChanged` emite `tsc:auth` (con `AUTH`)
  después de resolver el rol.

## Verificación

- Sandbox: los 6 casos de la tabla, antes y después del cambio. La demora
  de 3 s del perfil y la página sin SDK eran parches **solo en
  `sandbox/site`** y se borraron al terminar. La base del emulador se
  recargó con `emu-seed --clean`.
- Camino normal: anónimo y admin cargan igual que antes (admin restaurado
  en ~2 s con red local).
- `node scripts/smoke-parity.mjs`: paridad OK (901 globales en las dos
  variantes, por `_bootStep`).
- `node scripts/audit-wiring.mjs`: sin handlers rotos nuevos.
- `dist` no se abrió en el navegador en este slice. Se podía con
  `hosting-dist` navegando a `?emu=1`, pero esa config abre primero sin el
  parámetro, contra producción. Desde la revisión de 2.1/2.2 existe
  `tsc-emu-dist` para esto. El smoke de paridad cubre la carga.

## Acción del dueño requerida

- Decidir D6 con la evidencia de arriba (se aplica en 7.2).
