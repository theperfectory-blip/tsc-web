# Control en vivo de PES5 (núcleo del agente)

Cómo el agente local sabe en qué momento está el juego, lee la alineación y
escribe cambios **solo cuando el juego los respeta**. Es la parte local del
agente (sin Firestore): los pedidos de los presidentes llegarán después.

- Núcleo: `tools/pes5/pes5_vivo.py` (Python 3, solo biblioteca estándar y
  `ctypes`).
- CLI: `tools/pes5/live-agent.py`.
- Puente HTTP local: `tools/pes5/live-bridge.py` (ver [Puente local](#puente-local)).
- Pruebas: `tools/pes5/test_pes5_vivo.py` (97) y `tools/pes5/test_live_bridge.py`
  (18), sin juego.
- Mapa de referencia: [MAPA_ALINEACION_VIVO.md](MAPA_ALINEACION_VIVO.md).
- Hallazgos del coordinador: `HALLAZGOS.md` (scratchpad de la sesión).

El agente **nunca toca el option file ni los saves**: solo la memoria del
proceso `PES5.exe`, y solo cuando la pantalla de alineación está abierta.

## Verificado en el juego

El coordinador probó el agente contra el proceso real (Köln vs Bayern, partido
empezado y en pausa con la pantalla de alineación abierta):

| Qué se probó | Resultado |
|---|---|
| `cambio` con el partido empezado (entró Bade por Madsen) | La pareja entró en la cola (`rec-20` / `rec-19` / `rec-6` y sus espejos) y «Supl. Res.» (`rec-42`) bajó de **3 a 2** |
| El juego aplica la cola | Al volver a abrir la alineación el cambio ya estaba aplicado (Bade en la casilla de Madsen) y la cola quedó vacía sola (`rec-6 = 0`) |
| `intercambiar` entre titulares | El orden quedó cambiado y el juego lo respetó |
| `campo` sobre `libero` (= 2, Matip) | Matip quedó como LIB; el espejo de posiciones (`rec+945+c`) lo marca el propio juego, no hay que escribirlo |
| Las tres copias del orden con la pantalla abierta | Ya están llenas en pausa: `intercambiar` no se rechaza |
| Escribir el contador de la cola y su espejo (`rec-6`, `rec+1840`) | Inocuo: el juego aplicó la cola igual |
| `cambio` en partido con el capitán y el penal en Madsen (índice 9) | Al aplicarse, el juego dejó `rec+110` (PK) y `rec+111` (capitán) en **11** (Bade, el que entró) y la pantalla lo muestra como capitán/lanzador en la casilla 9 |
| `intercambiar` las casillas 7 y 8 (Feulner y Streit) | Las marcas de córner y tiro libre siguieron a Feulner a la casilla 8, pero `rec+106..109` se quedaron en **7**: el byte es el índice de Feulner, no la casilla |
| `intercambiar` válido con capitán y penal ya en 11 | VIVO2 lo rechazaba por compararlos con casillas 0–10; desde VIVO3 un lote que no los escribe no los valida |

FV3 (2026-11-26, solo lecturas): con PES5 abierto en la previa y la pantalla de
alineación abierta, `GET /estado` devolvió `partidoCargado: true` y
`GET /leer?lado=ambos` los dos equipos con 11 slots y 32 ids por lado. No se
escribió nada.

**Fallo detectado:** escribir `sistemaDefensivo = 1` (Líbero) solo, con el
líbero (`rec+277`) en 0, dejó al **arquero** (casilla 0) como líbero. Desde el
menú del juego, al elegir Líbero solo se puede elegir un titular con posición
CT; el juego guarda la casilla en `rec+277` y él mismo marca LIB (código 4) en
el espejo `rec+945+c`. Desde VIVO2 el lote se rechaza antes de escribir nada
(ver [Coherencia del estado final](#coherencia-del-estado-final)).

## Estados e indicadores

Cuatro bytes fijos (direcciones absolutas, estables entre reinicios):

| Dirección | Significado | Valores |
|---|---|---|
| `0x39564DA` | Pantalla de alineación abierta (previa, pausa o entretiempo) | 0 cerrada; abierta = **distinto de 0** (también vale 2 en algunos submenús, p. ej. el selector de líbero) |
| `0xD8CCEA` | Partido empezado | 0 antes del saque, 1 desde el saque (también en pausa y entretiempo) |
| `0xD8CD16` | Partido en pausa | 1 en el menú de pausa, 0 en el entretiempo |
| `0x100541C` | Balón en juego | 1 / 0 |

`0xdafd73` y `0xd8cd14` **no** sirven (el primero queda en 128 en la pausa; el
segundo queda en 1 al terminar un partido).

`estado(mem)` devuelve `{alineacionAbierta, partidoEmpezado, pausa,
balonEnJuego, momento, puedeEscribir, partidoCargado}`:

| `momento` | Condición |
|---|---|
| `previa` | Alineación abierta y partido sin empezar |
| `pausa` | Alineación abierta, partido empezado y `pausa == 1` |
| `entretiempo` | Alineación abierta, partido empezado y `pausa == 0` |
| `jugando` | Partido empezado, sin pausa, balón en juego y sin la pantalla de alineación |
| `menu` | Cualquier otro caso (menú principal, menú de pausa sin la pantalla, entretiempo cerrado…) |

`puedeEscribir` es exactamente `alineacionAbierta`. Los valores de los
indicadores se devuelven tal cual se leen (0/1 normalmente); el agente decide
con «distinto de 0».

### ¿Hay un partido cargado?

Con PES5 abierto pero sin partido (menú principal, selección de equipos) el
registro está en ceros y no hay una alineación real. `partido_cargado(mem)` (y
`registro_cargado(mem, lado)`) mira, sin escribir nada:

- el **orden** del registro (`rec+4`, 32 bytes) tiene que ser una permutación
  exacta de `0..31` (cada índice de plantel en una sola casilla);
- el **plantel** (`rec+36`, 32 u16) tiene que tener al menos
  `MINIMO_IDS_CARGADOS` (11) ids distintos de 0.

`estado(mem)` devuelve el resultado en `partidoCargado` (verdadero si
cualquiera de los dos lados tiene un partido cargado). El puente lo usa para
devolver `equipos: []` en `/leer` y para rechazar `/aplicar` sin escribir un
solo byte.

## Regla de escritura: solo con la alineación abierta

Con el juego en el **menú de pausa del partido**, pero sin la pantalla de
alineación abierta, el juego reconstruye el registro desde el estado real del
partido y pisa lo que se haya escrito. Con la pantalla de alineación abierta
(`0x39564DA == 1`) el juego toma el registro al salir con «Salir» (en pausa) o
«Comienzo del partido» (en la previa). Por eso:

- `aplicar` no escribe nada si `estado().puedeEscribir` es falso y devuelve
  `cerrada: true` con el error «abre la pantalla de alineación…».
- `forzar=True` (CLI `--forzar`) existe **solo para pruebas** con capturas;
  nunca se usa contra el juego real.
- La ventana útil es la previa, una pausa o el entretiempo, y dura lo que Luis
  tenga el menú abierto: el agente de vigilancia reintenta en cada vuelta.

## Copias del orden

El orden de alineación (casilla → índice de plantel) vive en tres copias de 32
bytes que tienen que coincidir antes de escribir:

| Copia | Dirección (relativa a `rec`) | Dirección local |
|---|---|---|
| `A` (principal) | `rec+4` | `0x3956F62` |
| `A+0x38B` (c2) | `rec+911` | `0x39572E9` |
| `A+0x1004` (c3) | `rec+4104` | `0x3957F66` |

`intercambiar` y el `cambio` de antes del partido escriben las tres. Si las
tres no coinciden antes (p. ej. una quedó en cero porque la pantalla aún no se
abrió), la operación se rechaza con «las tres copias del orden no coinciden» y
no se escribe nada.

## Condición y resistencia

Dos lecturas nuevas (verificadas por el coordinador el 24-11-2026):

| Qué | Dónde | Detalle |
|---|---|---|
| Flecha de condición | `rec-1678`, 32 bytes (copia en `rec+1302`) | Un byte por **índice de plantel**: 0 roja, 1 naranja, 2 verde, 3 azul, 4 gris. La lectura usa la principal. |
| Resistencia actual | `0x3BD3E00`, 836 bytes (`0x344`) por jugador | Entrada `k`: id u16 del jugador en `+0`, resistencia actual (byte) en `+146`. Hasta ~46 entradas; se asocia por id. Vale 0 antes del saque. |

- `leer_equipo()` devuelve `estadoJugador` (32 valores 0..4 por índice de
  plantel) y `resistencia` (32 elementos: `null` antes del saque o si el id no
  está en la tabla, o `{actual, maxSaque}`).
- El **máximo de resistencia** no está en memoria: lo guarda el llamador. La
  función `leer_resistencia(mem, ids, maximos, partidoEmpezado)` recibe el
  diccionario `{id: máximo}` y lo sube la primera vez que ve un valor mayor
  durante el partido. El puente lo vacía cuando `partidoEmpezado` vuelve a 0.
- Sin diccionario de máximos, `maxSaque` sale `null` (el CLI `live-agent.py
  leer` funciona así).

## Cola de sustituciones (partido empezado)

Con el partido empezado el cambio **no** toca el orden: se apunta en la cola y
el juego lo aplica en la siguiente detención o en el entretiempo.

| Qué | Relativo a `rec` | Detalle |
|---|---|---|
| Entra, pareja `k` | `rec-20+2k` | Índice de plantel que entra |
| Sale, pareja `k` | `rec-19+2k` | Índice de plantel que sale |
| Contador | `rec-6` | Cantidad de parejas en cola |
| Espejo entra | `rec+1826+2k` | Copia que mantiene el juego |
| Espejo sale | `rec+1827+2k` | Copia que mantiene el juego |
| Espejo contador | `rec+1840` | Copia del contador |
| Cambios restantes | `rec-42` | «Supl. Res.»: 255 antes de inicializarse; 3 al abrir la alineación en partido |

- `k = 0..6`: como máximo **7 parejas** en cola.
- Nunca se encola más de lo que permite `rec-42`.
- Solo entran jugadores de la **banca** (casillas 11–22). Las reservas
  (23–31) no entran en el partido.
- El que sale tiene que estar entre los titulares (casillas 0–10).
- Al aplicar la cola, el que entra toma la casilla del que sale, el que sale
  pasa a la casilla de banca del que entró, la cola vuelve a 0 y `rec-42` baja.

## Operaciones del agente

`ops` es una lista; todas se validan antes de escribir la primera (todo o
nada). Los índices de `cambio` son **índices de plantel** (0–31), no casillas.

### `intercambiar`

```json
{"op": "intercambiar", "casillaA": 4, "casillaB": 7}
```

Intercambia dos casillas del orden y escribe las tres copias. Con el partido
empezado solo se permite si las dos casillas son titulares (0–10) o las dos son
banca/reservas (11–31); mezclar titular con banca o reserva da el error «con el
partido empezado los cambios van por la cola».

### `cambio`

```json
{"op": "cambio", "entra": 13, "sale": 5}
```

- **Antes del partido:** intercambia las casillas de los dos índices (equivale
  a `intercambiar` con esas dos casillas). Se admiten reservas.
- **Con el partido empezado:** agrega la pareja a la cola. Valida que el que
  sale sea titular, que el que entra esté en la banca, que la pareja no esté ya
  en la cola, que ninguno de los dos haya salido antes en el partido (lista
  `salieron`) y que quede algún cambio (`rec-6 + 1 <= rec-42`).

### `campo`

```json
{"op": "campo", "nombre": "nivelAtaqueDefensa", "valor": 2}
{"op": "campo", "nombre": "profundidad", "casilla": 6, "valor": 12}
{"op": "campo", "nombre": "flechasAtaque", "casilla": 3, "indice": 2, "valor": 1}
{"op": "campo", "nombre": "sistemaDefensivo", "bloque": "A", "valor": 2}
{"op": "campo", "nombre": "capitan", "bloque": "cabecera", "valor": 11}
{"op": "campo", "nombre": "capitan", "valor": 11}
{"op": "campo", "nombre": "estrategiaBoton", "bloque": "cabecera", "indice": 2, "valor": 9}
{"op": "campo", "nombre": "modoEstrategia", "bloque": "cabecera", "valor": 1}
```

- Escribe un campo del bloque principal (o de la Alineación A/B con
  `"bloque": "A"` / `"B"`, o de la cabecera con `"bloque": "cabecera"`).
  Los offsets y tamaños salen de `pes5-live-map.json`, no están copiados en
  el código.
- `bloque` es opcional y su defecto es `principal`. Si el nombre **no existe**
  en principal/A/B pero sí en la cabecera (`capitan`, `penal`,
  `estrategiaBoton`…), se resuelve a `cabecera`: escribir `capitan` sin bloque
  escribe `rec+111`. Si existe en principal/A/B, el defecto sigue siendo
  `principal` aunque también esté en la cabecera.
- `casilla` es obligatoria en los campos por casilla; `indice` solo en los que
  tienen `stride > 1` (las flechas de ataque, 8 por casilla) o en los campos de
  varios bytes (`estrategiaBoton`: 0–3 = □ △ ○ ✕).
- `valor` se valida contra `valores` del JSON (enumeraciones: p. ej.
  `estrategiaBoton` 0–12 y `modoEstrategia` 0–1), contra `rango`
  (profundidad 1–47, lateral 6–99, capitán y lanzadores 0–31) o contra 0–255 si
  el campo no declara nada. Las flechas y los bytes de 0/1 solo aceptan 0 o 1.
- Después de aplicar el lote se comprueban las reglas de
  [coherencia del estado final](#coherencia-del-estado-final): el `libero`
  queda limitado a una casilla 1–10 con posición CT o LIB, `rivalMarcado` a
  0–10 o 255 y el capitán y los lanzadores a índices de plantel de un titular.
- **Prohibido** escribir `orden` e `idsPlantel` con esta operación (para el
  orden está `intercambiar` / `cambio`), y `desconocido104` (su significado
  todavía no está identificado).
- **Capitán y lanzadores** se escriben con `"bloque": "cabecera"` o sin
  bloque:
  `{"op": "campo", "nombre": "capitan", "bloque": "cabecera", "valor": 11}`.
  El `valor` es el **índice de plantel** (0–31), no la casilla, y el lote se
  rechaza si ese índice no queda en una casilla 0–10 del orden final.
- **Cabecera completa (VIVO4):** además del capitán y los lanzadores se
  escriben el código de estrategia de cada botón (`estrategiaBoton`, con
  `indice` 0–3 = □ △ ○ ✕ y `valor` = código 0–12 del JSON; 9 = Contraataque)
  y el modo (`modoEstrategia`: 0 Manual, 1 Semi-automático). Los dos se validan
  solo contra `valores`: un 13 en `estrategiaBoton` o un 2 en `modoEstrategia`
  se rechazan.

### `mover`

```json
{"op": "mover", "casilla": 6, "prof": 22, "lat": 70, "pos": "MP"}
```

Mueve a un jugador en la cancha: escribe `profundidad` (`rec+112+c`),
`lateral` (`rec+122+c`) y el código de `posicion` (`rec+133+c`) de una casilla
**1–10**. El arquero (casilla 0) no se mueve y se rechaza.

- Rangos: `prof` 2–47 y `lat` 6–99; `casilla` 1–10.
- `pos` es la sigla (PT, CT, LIB, DI, DD, CCD, DLI, DLD, CC, CIZ, CDR, MP, EI,
  ED, SD, DC; no distingue mayúsculas). El código se busca en
  `codificaciones.posicion`: se usa el **primer** código de esa sigla, salvo
  que la casilla ya tenga un código de la misma sigla, que se conserva (por
  ejemplo, un DC en 38 sigue en 38).
- Como el resto de operaciones, valida todo antes de escribir: si otra
  operación del lote falla, `mover` tampoco escribe.

### `variante`

```json
{"op": "variante", "esquema": "4-4-2", "variante": "A-1"}
```

Aplica una variante del catálogo
[`tools/pes5/pes5-variantes.json`](../../tools/pes5/pes5-variantes.json) tal
como lo hace el juego:

- Escribe profundidad, lateral y código de posición de las 11 casillas (el
  arquero no tiene lateral).
- **Borra las flechas de ataque** de los 10 jugadores de campo
  (`rec+147+8c`, 8 bytes a 0 por casilla 1–10). Las del arquero no se tocan.
- Pone la **actitud defensiva** (`rec+243+c`) de las 11 casillas según
  `reglaActitud` (sigla → 0 Alto, 1 Normal, 2 Bajo), igual que el juego: PT
  Normal; CT/DI/DD/CCD Alto; DLI/DLD/CC/CIZ/CDR/MP Normal; EI/ED/DC Bajo.
- El esquema y la variante tienen que existir en el catálogo; si no, se
  rechaza el lote entero. No se escribe ninguna otra cosa (ni orden, ni
  cabecera, ni ajustes).

### Ejemplo completo

```json
{
  "lado": "local",
  "id": "p-2026-11-24-01",
  "ops": [
    {"op": "cambio", "entra": 13, "sale": 5},
    {"op": "campo", "nombre": "nivelAtaqueDefensa", "valor": 3},
    {"op": "campo", "nombre": "profundidad", "casilla": 6, "valor": 12}
  ]
}
```

`aplicar` devuelve `{ok, cerrada, errores, estado, escrituras, escrito,
salieron}`. `escrito` trae, por cada tramo, `dir`, `antes`, `despues` y
`coincide` (la relectura posterior a la escritura). Si algo no coincide, `ok`
es falso aunque los bytes se hayan escrito.

## Coherencia del estado final

Además de validar cada operación, `validar` y `aplicar` miran cómo queda el
registro **después de aplicar todo el lote** en la vista en copia y rechazan el
lote entero (sin escribir ningún byte) si:

| Regla | Qué se comprueba | Error |
|---|---|---|
| Sistema Líbero | Solo si el lote toca `sistemaDefensivo` (de un bloque), `libero` o el orden (`intercambiar` / `cambio` en la previa): si el sistema final del bloque es `1` (Líbero), el líbero final tiene que ser una casilla 1–10 cuyo código de posición (`rec+133+c`) sea CT o LIB (1–7) | `con sistema Líbero el líbero tiene que ser un CT titular (casillas 1–10)` |
| `libero` escrito | Un `libero` que se escribe en el lote tiene que ser una casilla 1–10 con código CT o LIB, aunque el sistema no sea Líbero | `el líbero tiene que ser un CT titular (casillas 1–10)` |
| Capitán y lanzadores escritos | `capitan`, `cornerIzquierdo`, `cornerDerecho`, `tiroLibreLargo`, `tiroLibreCorto` y `penal` son **índices de plantel (0–31)**: solo se validan los que el lote escribe y ese índice tiene que estar en una casilla 0–10 del orden final | `el capitán tiene que ser el índice de plantel de un titular (casillas 0–10): 13 está en la casilla 13` |
| Rival marcado | El `rivalMarcado` de cada casilla 0–10 tiene que ser 0–10 o 255 (ninguno) | `el rival marcado de la casilla 4 tiene que ser 0–10 o 255 (ninguno): 11` |

- Todo se mira sobre el **estado final**, así que el orden de las operaciones
  no importa: `sistemaDefensivo = 1` y `libero = 3` en el mismo lote es válido
  si la casilla 3 es CT; con el líbero en 0, el lote se rechaza (es el fallo que
  se vio en el juego).
- El sistema y el líbero se comprueban en los tres bloques: principal (`rec+276`
  / `rec+277`), Alineación A (`rec+447` / `rec+448`) y Alineación B (`rec+618` /
  `rec+619`), pero solo el bloque que el lote toca; el orden afecta a los tres.
- **Los valores que el lote no toca no se validan** (VIVO3). El caso real: el
  juego dejó capitán y penal en 11 (Bade) y un `intercambiar` de titulares que
  no los tocaba se rechazaba en VIVO2. Ahora solo se validan el capitán y los
  lanzadores que el propio lote escribe; igual con el líbero, que solo se
  revalida si el lote toca el sistema, el líbero o el orden. `rivalMarcado`
  sigue comprobándose siempre.
- `intercambiar` **no** se bloquea por mover al líbero: el juego sigue la
  casilla. Con sistema Líbero, si tras el intercambio el líbero queda en una
  casilla no CT, el lote se rechaza y el intercambio tampoco se escribe.
- La casilla del líbero es 1–10 (la 0 es el portero) y su código tiene que ser
  CT o LIB: es lo que deja elegir el menú del juego y lo que comprobó el
  coordinador. El [mapa](MAPA_ALINEACION_VIVO.md) anotaba «casilla 0..11» en
  `rec+277`; la regla sigue al juego.
- El capitán y los lanzadores son **índice de plantel, no casilla**: el juego
  los muestra en la casilla donde ese índice esté en el orden y, cuando el
  capitán o un lanzador sale por cambio, él mismo pasa el índice del que entra
  a `rec+106..111`.
- El espejo de posiciones (`rec+945+c`) lo escribe el juego al marcar el LIB:
  no se toca.

## CLI `live-agent.py`

```bash
python tools/pes5/live-agent.py estado
python tools/pes5/live-agent.py leer [--lado local|visitante|ambos]
python tools/pes5/live-agent.py validar --lado local --ops cambios.json
python tools/pes5/live-agent.py aplicar --lado local --ops cambios.json [--esperar 20]
python tools/pes5/live-agent.py vigilar --carpeta agentes/local
```

- `estado`: JSON con los indicadores, el momento y `puedeEscribir`.
- `leer`: JSON con orden, ids, titulares, banca, reservas, la cabecera
  (`cabecera.capitan`, `cornerIzquierdo`, `cornerDerecho`, `tiroLibreLargo`,
  `tiroLibreCorto` y `penal`, cada uno con `indice`, `id` y la `casilla` actual
  de ese índice), todos los campos del bloque principal, la cola y los cambios
  restantes. Los campos salen con los **códigos en crudo** (los offsets, tamaños
  y enumeraciones están en `pes5-live-map.json`: `codificaciones` traduce los
  códigos a nombres).
- `validar`: valida y muestra qué escribiría. **No escribe.**
- `aplicar`: valida y aplica. Con `--esperar SEG` sondea cada 0,5 s hasta ese
  tiempo a que se abra la pantalla de alineación y después aplica. `--forzar`
  es solo para pruebas (no espera a la alineación).
- `vigilar`: procesa `DIR/pendientes/*.json` en bucle, cada 0,5 s.
- Opciones de memoria para todas: `--desde-bin ARCHIVO --base 0x3940000` usa
  `MemoriaFalsa` (no abre el juego); `--proceso NOMBRE` cambia el ejecutable.

Códigos de salida:

| Código | Significado |
|---|---|
| 0 | Bien |
| 1 | No hay juego (o error inesperado) |
| 2 | Errores de validación: no se escribió nada |
| 3 | Pantalla de alineación cerrada: no se escribió nada |

Los scripts aceptan JSON con BOM (lo que escribe el Bloc de notas) y la salida
va siempre en UTF-8.

## Vigilancia por carpeta

```
DIR/
  pendientes/  <nombre>.json     {"lado": "...", "ops": [...], "id": "..."}
  hechos/      <id>.pendiente.json + <id>.resultado.json
  rechazados/  <id>.pendiente.json + <id>.resultado.json
  estado.json
  agente.log
```

- Cada vuelta mira `pendientes/` ordenado por nombre. Si la alineación no está
  abierta no toca nada y vuelve a intentarlo en la siguiente.
- Con la alineación abierta, valida y aplica cada pedido. Si sale bien, mueve
  el pedido a `hechos/` y escribe `<id>.resultado.json`; si falla (validación o
  alineación cerrada), lo mueve a `rechazados/` con los errores.
- `estado.json` guarda `{partidoEmpezado, salieron: {local: [], visitante: []}}`
  para no repetir un jugador que ya salió. Cuando `partidoEmpezado` vuelve a 0
  se reinicia la lista.
- `agente.log`: una línea por suceso, con fecha y hora.
- El CLI crea las tres carpetas si no existen y también acepta `id` en el
  nombre del archivo si el JSON no lo trae.

## Puente local

`tools/pes5/live-bridge.py` es el programa que corre en el PC de PES5 y le
sirve la alineación a la web por HTTP. Usa solo la biblioteca estándar
(`http.server`), escucha **solo en 127.0.0.1** y aplica el contrato de
[`tareas/API_PUENTE.md`](../../tareas/API_PUENTE.md).

```bash
python tools/pes5/live-bridge.py
python tools/pes5/live-bridge.py --puerto 9000
python tools/pes5/live-bridge.py --origenes http://localhost:3000,http://localhost:3001
python tools/pes5/live-bridge.py --desde-bin captura.bin --base 0x3940000
```

| Opción | Defecto | Qué hace |
|---|---|---|
| `--puerto` | `8765` | Puerto local (`0` elige uno libre). |
| `--origenes` | `http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000` | Lista CORS exacta, separada por comas. |
| `--desde-bin ARCHIVO` | — | Usa `MemoriaFalsa` con una captura; no abre el juego. |
| `--base` | `0x3940000` | Dirección base del `.bin`. |
| `--proceso` | `PES5.exe` | Ejecutable a leer. |

Con `--desde-bin` los indicadores de estado que caen fuera del volcado valen 0,
así que `POST /aplicar` responde `cerrada: true`: sirve para probar las
lecturas, no para escribir. `--help` lista todo.

### Endpoints

| Método y ruta | Respuesta |
|---|---|
| `GET /estado` | `{ok, juego, estado}`. Si PES5 no está abierto: `{ok: true, juego: false}`. `estado` es `{alineacionAbierta, partidoEmpezado, pausa, balonEnJuego, momento, puedeEscribir, partidoCargado}`. |
| `GET /leer?lado=local\|visitante\|ambos` | `{ok, juego, estado, equipos: [EQUIPO]}`. Sin `lado` usa `ambos`. Con `partidoCargado: false` devuelve `equipos: []`. |
| `POST /aplicar` | `{ok, cerrada, errores, escrito, …}` (lo que devuelve `pes5_vivo.aplicar`). Sin partido cargado: error «No hay un partido cargado en el juego» y no escribe nada. |

`EQUIPO` (contrato completo en `tareas/API_PUENTE.md`):

```json
{
  "lado": "local",
  "ids": [0],
  "orden": [0],
  "cambiosRestantes": 3,
  "cola": [{"entra": 13, "sale": 5}],
  "slots": [{"casilla": 0, "indice": 0, "id": 0,
             "prof": 1, "lat": null, "pos": "PT", "codigo": 0,
             "flechas": [], "act": 1, "mark": 1, "rival": 255}],
  "cabecera": {"botones": [0, 0, 0, 0], "modo": 0,
               "lanzadores": {"ckl": 0, "ckr": 0, "tll": 0, "tlc": 0, "pk": 0},
               "capitan": 0},
  "ajustes": {"nivel": 2, "sistema": 0, "libero": 0, "linea": 1,
              "presion": 0, "offside": 2, "contra": 1},
  "estadoJugador": [2],
  "resistencia": [{"actual": 80, "maxSaque": 90}]
}
```

- `ids` y `orden` tienen 32 elementos; `slots` son las 11 casillas de titular
  (0 arquero, 1–10 campo). `pos` es la sigla del código de posición y
  `flechas` los nombres (`izq`, `arriba-izq`, `arriba`, `arriba-dcha`, `dcha`,
  `abajo-dcha`, `abajo`, `abajo-izq`) que están encendidos.
- `estadoJugador` tiene 32 valores por **índice de plantel** (0 roja, 1 naranja,
  2 verde, 3 azul, 4 gris) y `resistencia` 32 elementos (`null` antes del
  saque o si el id no está en la tabla).
- `cabecera.botones` son los 4 códigos de estrategia; `lanzadores` y
  `capitan` son **índices de plantel**.
- El puente guarda el **máximo de resistencia** de cada id durante el partido
  (`maxSaque`) y lo reinicia cuando `partidoEmpezado` vuelve a 0.

`POST /aplicar` recibe:

```json
{"lado": "local", "ops": [{"op": "mover", "casilla": 3, "prof": 15, "lat": 40, "pos": "MP"}],
 "salieron": [7]}
```

Aplica con `pes5_vivo.aplicar`: todo o nada, y solo con la pantalla de
alineación abierta. Devuelve **200 siempre que el JSON sea válido** (aunque
`ok` sea `false` por validación) y **400** si el cuerpo no es JSON, no es un
objeto o falta `lado`/`ops`. `403` para un `Origin` que no esté en
`--origenes`; `OPTIONS` responde el preflight (204). Las peticiones sin
`Origin` (curl, scripts) se aceptan.

### Seguridad

- Solo escucha en `127.0.0.1`: no queda expuesto a la red local.
- CORS por lista exacta de orígenes. Un origen desconocido recibe `403` y no se
  le agrega ninguna cabecera CORS.
- **Nunca escribe saves ni el option file.** Solo usa `WriteProcessMemory`
  sobre `PES5.exe`, y `aplicar` se niega si la pantalla de alineación no está
  abierta (`cerrada: true`), que es la regla verificada en el juego.
- No hay endpoint de escritura fuera de `POST /aplicar`; `GET /estado` y
  `GET /leer` son de solo lectura.
- El log va a la consola (`127.0.0.1 "GET /leer?lado=ambos HTTP/1.1" 200 -`).

Prueba rápida con el puente levantado:

```bash
curl http://127.0.0.1:8765/estado
curl "http://127.0.0.1:8765/leer?lado=ambos"
curl -X POST http://127.0.0.1:8765/aplicar -H "Content-Type: application/json" \
  -d "{\"lado\":\"local\",\"ops\":[{\"op\":\"mover\",\"casilla\":3,\"prof\":15,\"lat\":40,\"pos\":\"MP\"}]}"
```

## Cómo probar sin juego

La memoria falsa es un diccionario con la misma interfaz que el proceso
(`leer(dir, n)` / `escribir(dir, datos)`):

```python
import sys
sys.path.insert(0, "tools/pes5")
import pes5_vivo as vivo

mem = vivo.MemoriaFalsa()
mem.sembrar(vivo.IND_ALINEACION, b"\x01")            # alineación abierta
mem.sembrar(vivo.REC["local"], registro_de_prueba)   # 628 bytes del registro
print(vivo.estado(mem))
print(vivo.leer_equipo(mem, "local"))
print(vivo.aplicar(mem, "local", [{"op": "campo", "nombre": "nivelAtaqueDefensa", "valor": 1}]))
```

- Con una captura congelada (`0x30000` bytes desde `0x3940000`):

```bash
python tools/pes5/live-agent.py estado --desde-bin captura.bin
python tools/pes5/live-agent.py leer --lado ambos --desde-bin captura.bin
python tools/pes5/live-agent.py aplicar --desde-bin captura.bin --ops ops.json --forzar
```

  Los indicadores que caen fuera del volcado se leen como 0, por eso para
  escribir sobre una captura hace falta `--forzar` (solo pruebas).

- Pruebas automáticas:

```bash
python -I tools/pes5/test_pes5_vivo.py -v
python -I tools/pes5/test_live_bridge.py -v
python -m unittest tools/pes5/test_pes5_vivo.py -v
```

  (En modo aislado, `python -I -m unittest <ruta>` no encuentra el módulo porque
  CPython quita el directorio actual de `sys.path`; por eso se ejecuta el
  archivo directamente o sin `-I`.)

## Decisiones tomadas

1. **`rec-42 = 255` con el partido empezado se rechaza** (no se trata como 3):
   todavía no se sabe cuántos cambios quedan y escribir podría encolar un
   cambio de más. El error pide abrir «Cambios/alineación» para que el juego
   inicialice el contador.
2. **`momento`**: `jugando` solo con el partido empezado, sin pausa, balón en
   juego y sin la pantalla de alineación. El menú de pausa sin la pantalla y el
   entretiempo cerrado son `menu`. En todos esos casos `puedeEscribir` es falso.
3. **Tope de la cola**: 7 parejas (`k = 0..6`). Además nunca se encola más de
   `rec-6 + 1 <= rec-42`.
4. **«Ya en la cola»** se comprueba con los dos campos de todas las parejas: ni
   el que entra ni el que sale pueden estar repetidos.
5. **`salieron`** lo pasa el llamador (`aplicar(..., salieron=[...])`) o lo
   guarda el agente en `estado.json`. Vale para los dos jugadores de la pareja:
   ni el que salió ni el que entró pueden volver a salir.
6. **Antes del partido un `cambio` admite reservas** (es un intercambio de
   casillas y el juego lo permite); con el partido empezado, no.
7. **La cabecera se escribe con `campo`** (VIVO4): capitán, lanzadores,
   `estrategiaBoton` y `modoEstrategia`, con `"bloque": "cabecera"` o sin
   bloque cuando el nombre solo existe en la cabecera. `desconocido104` no se
   escribe (su significado no está identificado) y `orden` / `idsPlantel`
   están prohibidos explícitamente.
8. **Un lote se valida contra el estado que deja el lote**: dos `cambio`
   seguidos van a `k=0` y `k=1`, y un `intercambiar` posterior ve el orden ya
   cambiado. Todo o nada: si una operación falla, no se escribe ninguna.
9. **Relectura obligatoria**: después de escribir se lee cada tramo y se
   compara; el resultado incluye `antes` y `despues` de cada dirección.
10. **La coherencia se mira al final del lote**, no operación por operación
    (VIVO2). Así `sistemaDefensivo = 1` y `libero = 3` en el mismo pedido son
    válidos, y un lote que dejaría al arquero de líbero se rechaza entero.
11. **El líbero es una casilla 1–10 con posición CT o LIB**, también cuando se
    escribe con el sistema en Normal o Defensa en línea: es lo que admite el
    menú del juego. El mapa anotaba «0..11» en `rec+277`; manda lo probado en
    el juego.
12. **Capitán y lanzadores: índice de plantel de un titular, y solo si el lote
    los escribe (VIVO3)**. No se validan los valores preexistentes: el juego
    puede dejarlos en un índice que en ese momento esté en la banca (el caso
    real, 11 con Bade). El valor 255 de `rivalMarcado` sigue significando
    «ninguno».
13. **No se escribe el espejo de posiciones**: el juego marca LIB en
    `rec+945+c` por su cuenta al confirmar el líbero.
14. **`0x39564DA` vale 2 en algunos submenús** (selector de líbero): la pantalla
    está abierta con `!= 0`, no solo con `1`. `estado()` ya lo trataba así; queda
    documentado.
15. **`mover` solo casillas 1–10** (el arquero no se mueve) con `prof` 2–47 y
    `lat` 6–99. El código de posición se elige por sigla: se conserva el actual
    si ya es de la misma sigla y, si no, se usa el primero de esa sigla en la
    tabla de códigos. Se valida con el lote completo, como el resto.
16. **`variante` reproduce lo que hace el juego**: las 11 casillas de
    profundidad/lateral/código, las flechas de ataque de los 10 jugadores de
    campo a 0 (las del arquero no se tocan) y la actitud de las 11 casillas por
    `reglaActitud` (solo la sigla decide). Es lo que midió el coordinador al
    aplicar variantes con flechas marcadas.
17. **El máximo de resistencia lo guarda el llamador**, no la memoria: es
    `{id: máximo}` por partido y se reinicia cuando `partidoEmpezado` vuelve a
    0. Antes del saque, o si el id no está en la tabla, la entrada es `null`.
    `estadoJugador` se lee de `rec-1678`; la copia `rec+1302` no se usa.
18. **El puente no escribe saves** y solo escucha en `127.0.0.1`. CORS por
    lista exacta: un `Origin` no permitido recibe 403; sin `Origin` (curl) se
    acepta. `POST /aplicar` devuelve 200 si el JSON es válido aunque la
    validación falle, y 400 si el cuerpo no es JSON o no trae `lado`/`ops`.
19. **Sin partido cargado no hay alineación (FV3).** Un registro con el orden
    en ceros o el plantel vacío es el menú principal, no una alineación: el
    orden tiene que ser una permutación de 0..31 y el plantel tener al menos 11
    ids distintos de 0. `/leer` devuelve `equipos: []` y `/aplicar` responde
    error sin escribir. La web usa `partidoCargado` para mostrar los estados
    «PES5 está cerrado» / «PES5 está abierto, pero no hay un partido cargado»
    sin dibujar una cancha inventada.

## Pendiente de verificar en el juego

Estas cosas necesitan al coordinador con PES5 abierto (el agente no las prueba
solo porque escribir en el juego no es parte de esta tarea):

- El instante exacto en que el juego inicializa `rec-42` a 3 al abrir
  «Ajuste de alineación» con el partido empezado, y si `255` puede aparecer con
  la pantalla ya abierta (en la prueba estaba en 3 al encolar).
- La contabilidad de `rec-42` con **dos** cambios seguidos sin reabrir el menú:
  el agente compara `rec-6 + 1 <= rec-42` al encolar y el juego lo baja al
  aplicar el cambio.
- Que el nombre del jugador en pantalla se refresque al escribir la cola (los
  números sí; el coordinador ya vio que a veces hay que cambiar de submenú).
- `sistemaDefensivo = 1` y `libero = N` en el mismo lote: queda pendiente ver
  en el juego que el líbero sale bien y que el juego marca LIB en el espejo
  (la regla nueva ya impide que salga el arquero).
- Escribir `capitan` o un lanzador con `"bloque": "cabecera"` (índice de
  plantel): falta ver en el juego que el menú Lanzador/Capit lo muestra y lo
  conserva al reanudar.
- Escribir `estrategiaBoton` (índice 0–3) y `modoEstrategia` (0/1): confirmar
  que el menú de Ajustes de estrategia los muestra con el código escrito y los
  conserva al reanudar.
- Escribir `campo` en la Alineación A/B mientras el bloque seleccionado es el
  principal: confirmar que el juego no lo pisa y qué bloque usa al reanudar.
- Flechas de ataque y actitud defensiva con el partido empezado (el agente las
  permite; el coordinador solo verificó orden y sistema defensivo).
- Probar `mover` y `variante` **a través de `aplicar` y del puente** con PES5
  abierto: el movimiento y el efecto de las variantes están verificados en el
  juego, pero las operaciones nuevas solo se probaron con `MemoriaFalsa`.
- `0xD8CCEA` justo en la animación del saque (puede leer 0 un instante): el
  agente puede ver `previa` un instante de más; confirmar que no llega a
  escribir en ese hueco.
- El comportamiento de `--esperar` cruzando el entretiempo (la pantalla se abre
  y se cierra sola entre tiempos).
