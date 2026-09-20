# Slice P — Posiciones, posición registrada (O) y Banda/pie · 2026-09-20

> Lo implementa Haiku, lo verifica el supervisor en la UI real. Alcance: **solo PES5**. Todo lo de abajo
> sale del save real y de pruebas en el juego con Stranzl (registro 2). Repo: worktree `tsc.web-yunacoins`,
> rama `feat/yunacoins-pes5`. No tocar `firebase-config.js`, `cloudinary.js`, `users-admin.js`.
> Reglas de siempre: sin emojis (SVG), `_esc()` en innerHTML, `graphify update .` al final dentro de `tsc-src/`.

## 1. Hallazgos verificados (no re-derivar)

**A. Posición registrada (círculo O, la "posición principal")** = código FIJO de 4 bits en los bits 428–431 del
registro (bit 428 = LSB, igual que `getField`). NO es un rango entre las marcadas: esa lectura estaba mal y
mostraba otra posición en 1922 de 2821 jugadores con varias posiciones. Verificado: 100% de los jugadores de una
sola posición (cada una de las 12 tiene un único código) y 2821/2821 de varias posiciones (el código siempre es el de una
de sus marcadas). Confirmado en el juego con Stranzl (O en Carrilero = código 4).

| Código | Nombre en el mapa (`pes5-map.json > posiciones`) | Clave inglesa | Jugadores de 1 posición que lo respaldan |
|---|---|---|---|
| 0 | Portero | GK | 548 |
| 2 | Libero | CWP | 1 (más 29 con varias) |
| 3 | Central | CB | 384 |
| 4 | Carrilero | **SB** | 222 |
| 5 | Centrocampista defensivo (MCD) | DMF | 158 |
| 6 | Lateral | **WB** | 3 (más 53 con varias) |
| 7 | Centrocampista central (MC) | CMF | 39 |
| 8 | Volante | SMF | 111 |
| 9 | Mediapunta | AMF | 65 |
| 10 | Extremo | WG | 25 |
| 11 | Segundo delantero (SD) | SS | 9 |
| 12 | Delantero centro (DC) | CF | 507 |

**Verificación en el juego (20/09, Vastic, registro 10, 12 posiciones marcadas):** el usuario movió la O por las 12
posiciones en el editor de PES5 y guardó cada vez; el save dio exactamente los códigos de la tabla en las 12
(DC 12, SD 11, Extremo 10, Mediapunta 9, Volante 8, MC 7, Lateral 6, MCD 5, Carrilero 4, Central 3, Líbero 2, Portero 0).
Solo cambiaron los bits 428–431 del registro; el bit 427 no se movió.
El código 1 y los ≥13 no aparecen. El bit 427 vale 1 en 71 jugadores (campo desconocido): **no tocarlo**.

**B. Carrilero/Lateral estaban cruzados en la tool.** En el juego: **Carrilero = SB** (grupo DE, con Central y
Líbero) y **Lateral = WB** (grupo ME, mediocampo). Hoy `POSITION_MAP`/`POSITION_LABEL` (pes5-plantilla.js) y
`POSITIONS` (mejoras.html) tienen `WB:'Carrilero'`, `SB:'Lateral'`: hay que invertirlos. Grupo (bucket):
`WB → 'ME'`, `SB → 'DE'` (hoy ambos 'DE'). El bucket solo elige la silueta del héroe; las reglas de costo no lo usan.
El mapa del save ya usa los nombres españoles correctos: no se toca.

**C. Banda/pie** son DOS campos independientes:
- Pie dominante: bit 416 (0 = derecho, 1 = izquierdo). Ya mapeado y escrito.
- **Banda**: 2 bits en 542–543 (bit 542 = LSB), YA agregado a `pes5-map.json > ajustes_basicos > Banda`.
  Valor **relativo al pie**: 0 = banda del mismo lado que el pie, 1 = banda del lado contrario, 2 = ambas.
  Verificado con Stranzl: PD/BD = (pie 0, banda 0), PD/BI = (0, 1), PI/BI = (1, 0), PI/BD = (1, 1),
  PD/Ambas y PI/Ambas = banda 2.
  Conversión a lado ABSOLUTO: 'ambas' si el valor es 2; si no, valor 0 → lado del pie, valor 1 → lado contrario.
  Inversa: lado 'ambas' → 2; lado igual al pie → 0; lado distinto del pie → 1.
- El juego NO tiene "pie ambos". "Ambas" es solo de la banda.

**D. Tope de posiciones**: el juego permite marcar las 12. El máximo de 5 es reglamento de la TSC → regla
configurable `maxPositions` (default 5), NO una restricción del módulo del save.

## 2. Contrato de datos

Formato de la tool (cambios que viajan en `CAMBIOS_PENDIENTES` y entran a `escribirJugadorCompleto`):

```
posiciones:          ['Central','Carrilero',...]  // conjunto COMPLETO deseado, nombres del mapa (no vacío)
posicionRegistrada:  'Carrilero'                   // debe pertenecer al conjunto final
banda:               'der' | 'izq' | 'ambas'       // lado ABSOLUTO
```

Formato del editor (jugador en `mejoras.html`): `positions {CF:true,...}` (claves inglesas, ya existe),
`primaryPos` (clave inglesa de la O, ya existe), `favfoot` 'D'|'I' (ya existe) y **nuevo `side`** 'D'|'I'|'A'.
`leerJugadorCompleto` suma `banda: 'der'|'izq'|'ambas'`.

## 3. Pasos por archivo

### 3.1 `js/pes5/pes5-map.json`
Reemplazar el bloque `posicion_registrada` por: `bit: 428`, `ancho_bits: 4`, `off: "+0x35.4"`, un campo `codigos`
con la tabla A (nombre → código) y un `enc` que diga "código fijo por posición, 4 bits LSB-first". Conservar en la
nota la historia (el rango era un error, resuelto el 20/09) y el aviso del bit 427.

### 3.2 `js/pes5-editor.js`
1. `posicionRegistrada(bytes, registro)`: leer `getField(bit 428, 4)` y devolver el nombre cuyo código coincide, o
   `null` si no hay. Ya no depende de las marcadas.
2. `_buscarDefCampo`: el caso `'Posicion registrada'` ya toma `ancho_bits` del mapa (ahora 4). `'Banda'` sale de
   `ajustes_basicos` sin cambios.
3. Nuevas funciones exportadas: `leerBanda(bytes, id)` → 'der'|'izq'|'ambas' (absoluto, según C) y
   `escribirBanda(bytes, id, lado)` (valida, convierte a relativo con el pie ACTUAL del save, `setField`).
4. `leerJugadorCompleto`: agregar `banda`.
5. `escribirJugadorCompleto`, en este orden (después del bloque de `pieDominante`, antes de `lesiones`), y ajustar el
   comentario largo que dice "NO edita posiciones":
   - Guardar `lado0 = leerBanda(...)` ANTES de tocar el pie.
   - Bloque `pieDominante` (ya existe). Si el pie cambió y `cambios.banda` NO viene: reescribir la banda para
     conservar `lado0` (el lado absoluto no cambia; el juego, en cambio, lo voltearía). Si viene `banda`, gana.
   - Bloque `banda`: validar 'der'|'izq'|'ambas'; escribir con `escribirBanda` (pie ya final); si el valor crudo no
     cambia, saltear (sin `escritos`).
   - Bloque `posiciones`/`posicionRegistrada`: validar que `posiciones` sea un array no vacío de nombres presentes en
     `MAPA.posiciones` (sin duplicados); validar que `posicionRegistrada` (si viene) esté en el conjunto final; si NO viene
     y la actual ya no pertenece al conjunto → lanzar error claro ("elegí la posición registrada"). Escribir el bit de
     cada una de las 12 posiciones (1 si está en el conjunto, 0 si no) solo si cambió, y la O con su código solo si
     cambió. Si solo viene `posicionRegistrada` (sin `posiciones`), es válido si pertenece a las marcadas actuales.
     Cada cosa escrita agrega a `escritos` (`posiciones`, `posicionRegistrada`, `banda`).
   - Sigue: `if (escritos.length) _incrementarContador(...)`.

### 3.3 `js/pes5-plantilla.js`
1. Invertir `POSITION_MAP` (`WB:'Lateral'`, `SB:'Carrilero'`), `POSITION_LABEL` (`WB:'Lateral'`, `SB:'Carrilero'`) y
   `BUCKET_BY_POS` (`WB:'ME'`, `SB:'DE'`).
2. `jugadorParaEditor`: agregar `side` ('D'|'I'|'A' desde `ED.leerBanda`). Verificar que `primaryPos` use la O nueva
   (ya usa `ED.posicionRegistrada`; un `null` cae en 'CMF' como hoy).
3. `cambiosDesdeEditor`: si difieren el conjunto de `positions` marcadas o `primaryPos` → emitir `posiciones`
   (nombres vía `POSITION_MAP`, en el orden de las claves) y `posicionRegistrada`; si difiere `side` → `banda`
   ('D'→'der', 'I'→'izq', 'A'→'ambas'). `draft.positions` puede venir parcial: mezclar con el original.
4. `aplicarCambiosAlJugador`: inversa (rearmar `positions`, `primaryPos`, `tag`, `bucket`, `side`).
5. No mutar el original; ida y vuelta `cambiosDesdeEditor(o, aplicar(o, cc)) === cc`.

### 3.4 `js/yunacoins-rules.js` y editor de reglas de la tool
Agregar `maxPositions` (entero 1–12, default 5) a los defaults, validación y normalización como los demás topes, y un
input en el editor de reglas de `prototipo_yunas/pes5-tool.html` (buscar dónde se editan `budgetGeneral`/`HEIGHT_CAPS`).
Sin costos de posición en este slice (siguen en 0).

### 3.5 `mejoras.html`
1. `POSITIONS`: `WB → 'Lateral'`, `SB → 'Carrilero'` (mismo orden de claves; el orden visible ya coincide con el juego).
2. Quitar los dos bloqueos "las posiciones todavía no se pueden pedir/escribir" (`cambiaPosiciones`, en `commitChanges`
   y en `commitChangesAdmin`). Agregar `positions`, `primaryPos` y `side` al `draft` de `commitChangesAdmin` y al
   `draftJugador` de `commitChanges` (pedido del presidente).
3. Página Posiciones:
   - `togglePosition`: el presidente NO puede quitar la natural (la O) y **no puede pasar de `RULES.maxPositions`**
     (toast: "Tope de N posiciones"). En modo admin (`ADMIN_EMBED`): sin tope y puede quitar cualquiera salvo que
     quede vacío; al quitar la registrada, la O pasa a la primera marcada restante (avisarlo en el carrito).
   - Modo admin: en cada fila marcada, un botón (SVG de círculo) "Registrar" que fija `APP.draft.primaryPos`. Mostrar
     la O actual con el mismo indicador que hoy usa "(natural)".
   - Junto a la fila "Pie dominante" (Izq./Der., ya existe) AGREGAR la fila **Banda** con tres botones Der./Izq./Ambas
     (`setSide`), como el menú "Banda/pie" del juego. `setSide` redibuja tarjeta, filas y carrito.
   - Líneas del carrito: `Banda Der. → Ambas`, `Posición registrada X → Y`, y las posiciones agregadas o quitadas.
4. `renderCard`: la tarjeta refleja `tag` y banda si cambiaron.

### 3.6 `prototipo_yunas/pes5-tool.html`
Verificar que la tabla de plantilla muestre la O nueva (usa `posicionRegistrada`); que `recibirAplicarDelEditor` y la
aplicación de pedidos (buscar dónde se llama `cambiosDesdeEditor`) pasen los cambios nuevos a `escribirJugadorCompleto`;
y que las celdas de cambios pendientes (`.pt-cell-changed`) marquen la posición. No cambiar el flujo de cobro:
posiciones y banda cuestan 0.

## 4. Tests (Node, contra el save real en SOLO LECTURA + copias en memoria)
Nuevo `pes5/tools/test-posiciones-banda.js` (mismo patrón `vm` que `test-jugador-completo.js`) y ampliar
`test-pes5-plantilla.js`:
1. Invariante en TODO el save (registros 1..4893): la O leída pertenece a las marcadas; ningún jugador sin marcadas;
   el código nunca es 1 ni ≥13.
2. Stranzl (registro 2): marcadas = Central, Carrilero, Lateral, Volante; O = 'Carrilero' (verificado en el juego).
   NO asertar su banda ni su pie: el usuario los movió en las pruebas.
3. Ida y vuelta en copias en memoria: las 6 combinaciones pie×banda leen 'der'/'izq'/'ambas' correctos y el valor crudo
   coincide con la tabla C; cambiar SOLO el pie conserva el lado absoluto; una `banda` explícita gana.
4. Posiciones: agregar, quitar, dejar las 12, quitar la registrada sin reemplazo (error), mover la O, dejar vacío
   (error), nombre inválido (error); el bit 427 y todos los bytes ajenos quedan idénticos (diff de bytes del registro =
   solo los bits esperados + el contador +0x32).
5. Plantilla: `WB`↔'Lateral', `SB`↔'Carrilero', buckets; ida y vuelta de `cambiosDesdeEditor`/`aplicar` con posiciones,
   registrada y banda; Stranzl sale con `primaryPos:'SB'`.
6. Regla `maxPositions`: default 5, rechaza 0 y 13, se normaliza.
Todos los tests existentes siguen verdes (`test-pes5-plantilla.js`, `test-jugador-completo.js`,
`test-yunacoins-rules.js`). El comando de cada uno está en su encabezado.

## 5. Verificación del supervisor (UI real, sin tocar el save ni Firestore reales)
- Tool: abrir un jugador; página Posiciones: marcar/desmarcar, mover la O (modo admin), cambiar pie y banda; ver el
  carrito y "Guardar en la tool"; escribir contra una COPIA del save y descifrar el resultado.
- **Prueba en el juego de la ESCRITURA:** la lectura ya está verificada con las 12 posiciones. Lo que falta cerrar es escribir: el
  supervisor escribe en una COPIA del save una O nueva (y una banda y un pie), el usuario carga la copia en PES5 y confirma lo que ve.
  La regla del juego es que la O solo puede ir a una posición ya marcada del jugador, y la escritura de la tool la respeta.
- Presidente (375 px, sin scroll horizontal): tope de 5, natural fija, sin botón "Registrar".
- Las plantillas ya publicadas siguen con los `primaryPos`/`bucket` viejos hasta que se republiquen (decisión del usuario).

## 6. Fuera de alcance
Costos de posición/banda (los define el usuario), nivelación (G) y cualquier cambio a `users-admin`.
