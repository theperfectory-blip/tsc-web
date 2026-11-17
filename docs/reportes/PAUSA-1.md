# PAUSA-1 · Pausar mejoras mientras Luis edita el save

Opción A, aprobada por el coordinador: se agrega una condición al create de pedidos. Nada se despliega: las reglas solo están en el repo.

## Reglas (`firebase/firestore.rules`)
- Nueva función `_mejorasPausadas()`: `exists(pes5_config/pausa)` y `get(...).data.pausado == true`. Si el documento no existe, no está pausado.
- En el create de `pedidos_pes5` (que cubre mejora, formación y emparejar), una condición nueva: `(isAdmin() || !_mejorasPausadas())`. El admin no queda bloqueado.
- Diff: 10 líneas agregadas, ninguna cambiada ni borrada. `isAdmin`, los roles y el resto de los creates no cambian.
- `pes5_config/pausa` ya queda cubierto por la regla existente `pes5_config/{id}`: lo leen todos los usuarios autenticados y lo escribe solo el admin.
- **Limitación, para decidir:** el allowlist `hasOnly` que pidió el diseño no se puede aplicar a la pausa con una regla propia. Las reglas de Firestore se combinan con OR, y la regla existente ya deja al admin escribir cualquier campo de `pes5_config`. El admin puede poner campos extra en la pausa, igual que en el resto de `pes5_config`.

## Costo de lecturas
- Create de un pedido: `exists()` cuenta una lectura (documento ausente). Con documento presente, `exists()` más `get()` son dos. No pude medir la facturación real en el emulador; lo anoto como estimación.
- Presidente: un listener sobre `pes5_config/pausa`: una lectura al abrir la página y una por cada cambio.
- Tool: una lectura al entrar a la sección, y al pausar una consulta de pedidos pendientes.

## Tool (`pes5-tool.js`)
- Bloque `#pt-pausa`, arriba de la sección, visible para el admin: «Pausar mejoras» o «Reanudar mejoras».
- Al pausar, si hay pedidos pendientes, aviso: «Hay N pedidos pendientes. Te recomendamos aprobarlos o rechazarlos antes de pausar.», con «Volver» y «Pausar igual».
- Mientras está pausado: «Mejoras pausadas desde HH:MM».
- Escribe `pes5_config/pausa` con `pausado`, `por` (uid) y `desde` (timestamp de servidor).
- **No probado en el navegador:** la Tool necesita la carpeta del save. Se revisó el código y la sintaxis.

## Presidente (`mejoras-page.js`)
- `iniciarPausa()` escucha `pes5_config/pausa` con `onSnapshot`. Sin recargar, muestra el aviso «Las mejoras están pausadas mientras Luis actualiza el juego. Vuelve más tarde.».
- Con la pausa, la clase `ep-pausado` en la raíz deshabilita: Revisar, Formación, los botones `+`/`−` de atributos, Enviar a Luis, Confirmar formación y emparejar. Además, siete funciones (`openApplyConfirm`, `openFormationModal`, `adjustMain`, `commitChanges`, `confirmFormation`, `solicitarEmparejar`, `confirmarSolicitarEmparejar`) vuelven con un aviso si se llaman. No se puede armar el carrito.
- Al reanudar, se habilita solo.
- La pausa no toca `pes5_bloqueos` ni los pedidos ya enviados.

## Pruebas de reglas (emulador en el puerto 8190, no el sandbox)
Se corrieron con `FIRESTORE_EMULATOR_HOST=127.0.0.1:8190` contra un emulador temporal. Hizo falta `JAVA_TOOL_OPTIONS` con `-Djdk.net.unixdomain.tmpdir` (el mismo arreglo que usa `scripts/emu-start.mjs`), porque en esta máquina Netty no puede abrir sockets en `%TEMP%`.
- `rules-teams.js`: 33/33.
- `rules-suite.js`: 426/426.
- `rules-pes5.js`: 82/82, con 12 casos nuevos de pausa:
  - sin documento, el presidente crea su pedido de mejora (200);
  - el presidente no escribe la pausa al crear (403);
  - el admin escribe la pausa (200);
  - con pausa, el presidente no crea pedido de mejora (403) ni de formación (403);
  - con pausa, el admin que preside su equipo sí crea pedido (200);
  - un usuario autenticado lee la pausa (200), el anónimo no (403);
  - el presidente no la modifica (403) ni la borra (403);
  - el admin reanuda (200) y el presidente vuelve a crear pedido (200).

## Prueba en el sandbox con dos sesiones
- **Sesión admin y sesión presidente, con ID tokens del emulador de Auth** (las reglas se aplican de verdad, sin `Bearer owner`):

| Paso | Sesión | Resultado |
|---|---|---|
| El presidente escribe la pausa | presidente | 403 |
| El presidente lee la pausa | presidente | 404 (el documento no existía; leer está permitido) |
| El admin pausa | admin | 200 |
| El presidente crea pedido con pausa | presidente | 403 |
| El admin reanuda | admin | 200 |
| El presidente crea pedido sin pausa | presidente | 200 |

- **Navegador como presidente, en vivo, sin recargar:** el admin pausa desde REST. En tres segundos aparece el aviso, la clase `ep-pausado` queda puesta, la formación y los ajustes quedan con `pointer-events: none` y opacidad 0,45. Al reanudar, el aviso se oculta y los botones vuelven. Captura: `capturas-PAUSA-1/presidente-pausado-en-vivo.jpg`.
- Los pedidos de prueba se borraron después. El documento `pes5_config/pausa` queda con `pausado: false`.
- Se subieron las reglas nuevas al emulador del sandbox (el de 8080), para que la prueba use las del repo.

## Pendiente
- Confirmar la regla con el coordinador: el allowlist de la pausa no es posible sin tocar otra regla (ver arriba).
- Probar la Tool en la PC con la carpeta del save.
- No se desplegó nada (las reglas se despliegan a mano con OK de Jimbo).
