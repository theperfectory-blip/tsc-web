# Bytes sin identificar del registro en vivo de PES5 (PESMAP4)

Análisis de los bytes que quedaron pendientes en `NOTAS.md`: qué valor tienen,
cuándo cambian y con qué acción del menú. Serie usada:
`…/scratchpad/pesmap/serie/` (125 capturas, `p000` … `v021`, `index.json` con
`desc`). La carpeta se estaba ampliando mientras se hacía este informe
(`v000` … `v021` se agregaron durante el análisis), así que los recuentos son
de ese corte; las conclusiones no cambian con las capturas nuevas.

- `rec` FKC = `0x3956f5e` (club 42, FK TUPADRE), `rec` GAF = `0x395bbb2`
  (club 5, GUARANI AF). Cada `.bin` son `0x30000` bytes desde `0x3940000`.
- **Solo lectura**: no se escribió ni el save ni la memoria del juego.
  El save real se descifró en memoria para comparar (`pes5-crypt.js`).

Herramienta: `node tools/pes5/live-unknown-scan.js <carpeta> [--md salida.md]`
(ver «Reproducir» al final).

---

## 0. Dato que ordena todo: el registro guardado mide 628 bytes

`FORM_REGISTRO_BASE = 716932`, `FORM_REGISTRO_STRIDE = 628` (en
`tsc-src/js/pes5-editor.js`). Es decir, del registro del save solo existen
`rec+0` … `rec+627`. Comparando `p000` contra el registro del club 42 del save:

| zona | resultado |
|---|---|
| `rec+4..35` (orden) y `rec+100..103`, `rec+105..111` | idénticos al save |
| `rec+112..625` (bloques principal, A y B) | idénticos al save |
| `rec+36..99` (ids del plantel) | el save tiene 0; los rellena el juego en memoria |
| `rec+0..2` (cabecera del registro) | el save tiene `70 75 67`; en memoria `FF FF FF` |
| `rec+104` | save `0`, memoria `1` (ver §1) |
| `rec+626..627` | el juego los reescribe en memoria |

Consecuencia: **todos los offsets de esta tarea salvo `rec+104` y `rec+283`
están fuera del registro guardado**. Son memoria de ejecución: no se guardan,
no son fuente de verdad y no hace falta leerlos para reconstruir la alineación.

Los tres bloques de 171 bytes (cabecera de 12 bytes + 171 · 3):

| bloque | rango | evidencia |
|---|---|---|
| cabecera | `rec+100..111` | botones, modo, lanzadores, capitán (NOTAS) |
| principal | `rec+112..282` | — |
| Alineación A | `rec+283..453` | `b100→b101` (config rápida sobre A) cambia `+284..+453` |
| Alineación B | `rec+454..624` | `b000→b001` |

---

## 1. Tabla resumen

`¿Save?` = el byte existe dentro de los 628 bytes guardados.
Confianza: **alta** = lo prueba la serie o el save; **media** = hay evidencia
consistente pero poca variación; **baja** = solo se puede describir el
comportamiento, no el significado.

| offset | ¿Save? | valores vistos (FKC; GAF) | capturas donde cambia | interpretación | confianza |
|---|---|---|---|---|---|
| `rec+104` | sí | `1` siempre; GAF `1` | ninguna | bandera de ejecución dentro del registro: el save tiene `0` y el juego la pone en `1`. No la cambia ningún menú | media (es runtime), baja (qué marca) |
| `rec+283` | sí | `1` siempre; GAF `1` | ninguna | **no** es fin del bloque principal: es el primer byte del bloque A = profundidad del portero (slot 0) de la Alineación A | alta |
| `rec+639` | no | `0/1`; GAF `0` | `p007`, `s000`, `ep0`, `ep_ok`, `mk0`, `mk_najera`, `sp0`, `sp_dd`, `m01`, `m05`, `m06`, `v000` | indicador de panel/diálogo abierto en la pantalla del equipo que se edita | baja |
| `rec+641` | no | `0`, `2`; GAF `0` | `c001` (y vuelve a `0` en `b000`) | sin identificar: queda en 2 tras el primer cambio en pausa | baja |
| `rec+642` | no | `0,1,2,8,12`; GAF `0` | `p007`, `s000`, `i000`, `k000`, `c001`, `b000`, `d_n`, `v000` | casilla del jugador en foco: `2` Yunifantino, `8` Freier, `12` fila de banca del cambio | alta |
| `rec+645` | no | `0,5,4,7,8,9,6`; GAF `0` | `k_cap0`, `k_cap1`, `k_l1`..`k_l5` | casilla del jugador seleccionado en Lanzador/Capit; queda en el último valor | alta |
| `rec+658` | no | `0/4`; GAF `0` | `mk0`, `mk_najera`, `mk_zona`, `sp0`, `m01`, `v000` | `4` mientras está abierto el diálogo de Config marcaje (4 opciones), `0` fuera | baja |
| `rec+661` | no | `0/1`; GAF `0` | `p008`, `p009`, `e000`, `l003`, `s001`, `t002`, `i000`, `k000`, `k_cap0`, `k_cap1`, `k_l0`, `q000`, `a000`, `c000`, `d_n`, `v001` | bandera de pantalla/repintado; alterna al navegar y al confirmar. No es un ajuste | media (no es ajuste), baja (qué marca) |
| `rec+675` | no | `0` … `247`; GAF `0` | 59 cambios (anexo §8) | huella/estado derivado de la pantalla abierta: cambia con muchas acciones de menú y con cualquier edición de la config. individual; no es un ajuste | media (derivado), baja (algoritmo) |
| `rec+678` | no | `0/1`; GAF `0` | `i000`, `mk_bartelt`, `mk_najera`, `k000`, `d_n`, `m01`, `m02`, `v000` | foco de la pantalla de Config individual; `0` al elegir rival | baja |
| `rec+679` | no | `0/1`; GAF `0` | `k_cap0`, `k_cap1`, `k_l0`, `q000` | `1` con la lista de lanzadores/capitán abierta | media |
| `rec+724..766` | no | 29 estados distintos; GAF `0` | `i*`, `ep*`, `mk*`, `sp*`, `d*`, `m*`, `c001` | búfer de pantalla de Config individual (espeja casilla, flechas, nº de opciones, centinela 255) | media (búfer), baja (campo por campo) |
| `rec-40..-1` | no | ver §3 | `c001`, `b000`, `b100`, `b200` | cola de cambios en pausa + estado de la configuración activa + centinelas | alta (cola), media (`rec-36`), baja (`rec-38`) |

---

## 2. Detalle por offset

### `rec+104` (vale 1)

| valores | capturas |
|---|---|
| `1` | `p000` … `v021` (toda la serie, FKC y GAF) |

- En el save del club 42 y del club 5 vale `0`; en memoria vale `1` desde la
  primera captura y no cambia con ningún menú (ni con `Nivel`, ni con
  `Sist. defensivo`, ni con `Config rápida`).
- Está entre los 4 botones de estrategia (`rec+100..103`) y el modo
  (`rec+105`). No se encontró ninguna acción que lo modifique.
- **Interpretación**: bandera de estado que el juego activa al cargar el
  equipo (no la escribe el usuario). No usarla como ajuste.

### `rec+283` (¿fin del bloque principal?)

No. El bloque principal es `rec+112..282` (171 bytes) y `rec+283` es el
**primer byte del bloque A**, que ocupa `rec+283..453` (otros 171 bytes):

- `rec+283 = rec+112 = rec+454 = 1` en toda la serie y en el save: es la
  profundidad del portero (slot 0) de cada una de las tres configuraciones.
- `b100 → b101` («Alineación A: Config rápida = Todo ataque») cambia
  `rec+284..453` y **no** toca `rec+283`, porque el portero mantiene
  profundidad 1 en todos los preajustes.
- Conclusión: leerlo como «primer byte de A», no como terminador. Lo que
  termina el bloque principal es `rec+282` (`logica 112 + 171 - 1`).

### `rec+639`

| valores | capturas |
|---|---|
| `0` | `p000`..`p006` |
| `1` | `p007`..`l003` (pantallas de Ajustes equipo) |
| `0` | `s000`..`i_df_chk1` |
| `1` | `ep0`..`ep_right` |
| `0` | `ep_ok` |
| `1` | `mk0`..`mk_bartelt` |
| `0` | `mk_najera`..`mk_zona` |
| `1` | `sp0` |
| `0` | `sp_dd`..`m00` |
| `1` | `m01`..`m04` |
| `0` | `m05` |
| `1` | `m06` |
| `0` | `v000`..`v021` |

Solo cambia en FKC; GAF queda en 0. Alterna con submenús de jugador
(Editar posición, Config marcaje, Selec. posición) y con la pantalla de
Ajustes equipo previa al partido, pero **no** con la misma pantalla abierta en
pausa (`v000` = 0). No se pudo reducir a un significado único: se documenta
como indicador de panel/diálogo (confianza baja).

### `rec+641` y `rec+642`

`rec+642` (casilla del jugador en foco):

| valor | capturas | jugador |
|---|---|---|
| `0` | `p000`..`p006`, `s000`..`t002`, `k000`..`c000`, `b000`..`b201`, `v000`..`v021` | ninguno |
| `1` | `p007`..`l003` | jugador resaltado en Lista de ajustes (el líbero) |
| `2` | `i000`..`sp_dd` | Yunifantino, casilla 2 |
| `12` | `c001` | fila 12 de la banca (el que entra) |
| `8` | `d_n`..`m06` | Freier, casilla 8 |

Es la casilla del jugador con el foco, no el resultado confirmado: en `l003`
el líbero queda en la casilla 3 (`rec+277 = 3`) y `rec+642` sigue en 1.
Coincide al 100 % con `rec+277` en `p008`..`l002` y con la casilla que se está
configurando en `i*`, `d*`, `m*`. Confianza alta.

`rec+641` solo se mueve una vez: `c000` `0` → `c001` `2` → `b000` `0`, y queda
en `0` el resto de la serie (incluido `v*`). No hay evidencia para
interpretarlo: podría ser un contador de cambios restantes (3 − 1 = 2) o el
estado del diálogo de Cambios, pero con una sola observación no se puede
afirmar. **Sin identificar.**

### `rec+645`

| valor | capturas | coincide con |
|---|---|---|
| `0` | `p000`..`k000` | — |
| `5` | `k_cap0` | capitán actual Harureadytoon (`rec+111 = 5`) |
| `4` | `k_cap1`..`k_l0` | capitán Athirson (`rec+111 = 4`) |
| `7` | `k_l1` | TL corto → Babic (`rec+109 = 7`) |
| `8` | `k_l2` | fila de Schneider con el token en mano |
| `9` | `k_l3` | TL largo → Voronin (`rec+108 = 9`) |
| `6` | `k_l4` | córner derecho → Freier (`rec+107 = 6`) |
| `9` | `k_l5`..`v021` | penal → Voronin (`rec+110 = 9`); queda en 9 |

Es la casilla de la fila seleccionada en Lanzador/Capit y se **queda** en el
último valor después de salir de esa pantalla. Por eso `c001` (cambio de
Voronin) mantiene 9 y no el 7 de la lista de cambios: no sirve para leer el
cambio. Confianza alta.

### `rec+658`

| valores | capturas |
|---|---|
| `0` | `p000`..`ep_ok`, `mk_najera`, `sp0`..`m00`, `v000`..`v021` |
| `4` | `mk0`..`mk_bartelt`, `mk_zona`, `m01`..`m06` |

`4` aparece exactamente mientras está abierto el diálogo **Config marcaje**
(que tiene 4 opciones: Marcaje, Zonas, Hombre normal, Hombre agresivo) y se
pone en `0` al entrar a la lista de rivales (`mk_najera`). Puede ser el
número de opciones o un id de diálogo; no hay forma de distinguirlo con esta
serie. Confianza baja.

### `rec+661`

16 cambios, siempre `0`/`1`, solo en FKC. Cambia al navegar entre pantallas y
también al confirmar (`t002`, como ya decía `NOTAS.md`). No se corresponde con
ningún byte del registro: es una bandera de pantalla (repintado / pantalla
pendiente). Se puede ignorar como ajuste; su significado exacto queda sin
identificar. Confianza: alta en que **no es un ajuste**, baja en qué marca.

### `rec+675`

60 valores distintos en 125 capturas. Patrón observado:

- `0` en `p000`..`p006`, `s000`..`t002`.
- Cambia en **cada** pantalla de Config individual (`33, 134, 72, 244, 158,
  19, 129, 237, 87, 194, 46, 113, 244, 31, 29, 137, 12, 157, 8, 92, 134`).
- Repite valor cuando se repite el estado: `244` en `i003` y `i_at_ur_on`,
  `129` en `p008`..`p012` y `i_at_up_off`.
- Vale `118` durante `p014`..`l003`, `236` durante `q000`..`f442_A1`, `73`
  durante `b000`..`b201`, `138` durante `v000`..`v021`.

Es una huella del estado/pantalla, no un ajuste: no está en el save y no
coincide con ningún campo identificado del registro. Se probaron checksums
simples sobre varios rangos del registro (XOR, suma mod 256, CRC-8 con
0x07/0x31/0x9B sobre `0..674`, `4..674`, `112..282`, `112..674`, etc.) y
**ninguno coincide**: el algoritmo no se identificó. Confianza media en que es
derivado, baja en qué es.

### `rec+678` y `rec+679`

`rec+678`:

| valores | capturas |
|---|---|
| `0` | `p000`..`t002`, `mk_bartelt`, `k000`..`b201`, `m01`, `v000`..`v021` |
| `1` | `i000`..`mk0`, `mk_najera`..`sp_dd`, `d_n`..`m00`, `m02`..`m06` |

`rec+679`:

| valores | capturas |
|---|---|
| `0` | `p000`..`k000`, `k_cap1`, `q000`..`v021` |
| `1` | `k_cap0`, `k_l0`..`k_l5` |

`678` se enciende con las pantallas de Config individual y se apaga justo
cuando se está eligiendo el rival (`mk_bartelt`, `m01`); `679` se enciende
solo con la lista de lanzadores/capitán abierta (salvo al abrir el menú
`k000` y al confirmar capitán `k_cap1`). Son indicadores de foco de lista;
su significado exacto no está probado. Confianza baja/media.

### `rec+724..766` (43 bytes)

Es un búfer de la pantalla de **Config individual**: solo se llena en `i*`,
`ep*`, `mk*`, `sp*`, `d*`, `m*` y en `c001` (Cambios); en el resto queda a 0
(`v000`..`v021` incluidos). Estructura observada (índices relativos a 724):

| offset | valores | indicio |
|---|---|---|
| `+724` | `0`/`3` | `3` solo en `i002` (marcar flecha ↑) → dirección marcada |
| `+725` | `0`/`1` | `1` en `i001` (menú de flechas abierto) |
| `+726` | `0`/`5` | `5` en la pantalla de actitud atacante |
| `+727` | `0`/`1` | `0` solo en `p000`; `1` en el resto |
| `+728..735` | 8 flags | valen `1` casi siempre; en `i001`/`i002` = `1 0 0 0 1 0 0 0`, que coincide con las flechas ← y → activas del jugador (`rec+163..170`) |
| `+736` | `0`/`1` | `1` cuando se ve la pantalla principal de Config individual (y en `mk_zona`, `sp_dd`, `m00`, `m05`), `0` dentro de los subdiálogos |
| `+739` | `0`,`2`,`3`,`5` | `5` en la pantalla principal de Config individual y `2`/`3` en los subdiálogos: parece el número de opciones del diálogo abierto; `0` fuera de Config individual |
| `+740` | `0`..`4` | parece un código de diálogo: `1` actitud defensiva, `2` marcaje al hombre / Estrat. equipo, `3` editar posición, `4` selec. posición / Lanzador-Capit; `0` en la principal y al elegir rival. No se pudo fijar |
| `+741` | `0,1,2,255` | `255` = «sin rival», el mismo centinela que `rec+265+casilla`; `0/1/2` en las pantallas de marcaje (no se pudo fijar) |
| `+742` | `0,2,8,12` | duplica `rec+642`: casilla del jugador en foco |
| `+743..747` | `1` | 5 flags (¿las 5 opciones de Config individual?) |
| `+754..766` | u32 | ids de la lista: `23,24,25` en `i*`; `0,1,2` en `d_n`; `1,2,4` en `sp0` |

No se guarda y no reemplaza a los campos del registro. Confianza media como
búfer, baja en cada campo.

---

## 3. Cola `rec-40..rec-1` (y vecinos)

Estado en `p000` (40 bytes):

```
-40: 00 00 08 00 00 01 01 01 01 01 01 01 01 01 01 01
-24: FF FF 00 FF 00 00 00 00 00 00 00 00 00 00 00 00
-8:  00 00 00 01 FF FF FF FF FF
```

Cambios en toda la serie (solo FKC; GAF no cambia):

| offset | antes | después | captura | acción |
|---|---|---|---|---|
| `rec-36` | `0` | `2` | `b000` | Alineación B: menú abierto |
| `rec-36` | `2` | `1` | `b100` | Alineación A: menú abierto |
| `rec-36` | `1` | `0` | `b200` | vuelta al menú de Ajustes estrategia |
| `rec-20` | `0` | `12` | `c001` | entra el jugador de la fila 12 de la banca |
| `rec-19` | `0` | `9` | `c001` | sale Voronin (casilla 7; el índice que registra es 9) |
| `rec-6` | `0` | `1` | `c001` | queda marcado el cambio hecho |

Interpretación:

- `rec-20` = fila/índice del que entra, `rec-19` = índice del que sale,
  `rec-6` = bandera/contador de cambio aplicado. Se mantienen durante el
  resto del partido (`c001` … `v021`). Confianza alta (coincide con
  `NOTAS.md` y con la captura).
- `rec-36` = **configuración activa**: `0` principal, `1` Alineación A,
  `2` Alineación B. Se prueba con `b000`/`b100`/`b200` y no cambia en ningún
  otro sitio. Confianza media-alta (una sola pasada por cada valor).
- `rec-38` = `8` en FKC y `0` en GAF, constante en toda la serie y en el
  save no existe (está antes del registro). Sin evidencia de qué es.
  **Sin identificar.**
- `rec-42` (fuera del rango pedido, justo antes): `255` hasta `s000`, `3`
  desde ahí, **en los dos equipos**. Cambia con el reinicio del proceso
  (`pid` 6112 → 14832), como los punteros de las zonas de interfaz; es estado
  de ejecución.
- `rec-35..-25` = once `01` constantes en los dos equipos (¿11 casillas
  activas?); `rec-24..-21` = `FF FF 00 FF` y `rec-5..-1` = `FF×5`
  (centinelas). Se pueden ignorar.

---

## 4. Zonas `rec+2900..3200` y `rec+5490..5540`: ¿son solo interfaz?

**Respuesta corta**: sí son estado de interfaz y se pueden ignorar para leer
ajustes, pero **no son «solo el cursor»**: son contadores de menú y tablas de
punteros al heap que el juego reconstruye en cada pantalla y también cuando
cambia un ajuste. No contienen el ajuste en sí.

### 4.1 Qué hay dentro

Identificado con confianza alta en `rec+2919..2920` (solo FKC):

| offset | significado | prueba |
|---|---|---|
| `rec+2919` | fila del cursor en el menú con foco | `p001` = 0 (Nivel en Ajustes equipo), `p006` = 1 (Sist. defensivo), `e000` = 2 (Estrat. equipo), `l000` = 3 (Lista de ajustes), `s000` = 0 y `s010` = 1 (Manual/Semi-automático), `a_auto` = 3 (Alineación auto), `k_cap0` = 1 (Elegir capitán), `c000` = 1 (Cambios), `b200` = 4 (Copiar a A), `i*` = 5 (Config individual), `k000` = 0 (Selecc. lanzador), `q000` = 7 (Config rápida) |
| `rec+2920` | número de filas de ese menú | 10 en el menú principal/pausa, 4 en Ajustes equipo y Alineación, 6 en Ajustes estrategia, 2 en Lanzador/Capit |

El resto, por muestreo de bytes:

| zona | contenido observado |
|---|---|
| `+2882..+2909` | hasta 7 punteros de 4 bytes que solo aparecen con «Editar posición» (`ep0`); en el resto `0` |
| `+2921..+2930` | 10 flags `01` (filas habilitadas) |
| `+2934..+2993` | 15 punteros de 4 bytes al heap (`0x0e25…`, `0x0e81…`) |
| `+2999..+3006` | selección/fila y flags de la lista |
| `+3014..+3046` | enteros de 4 bytes con huecos; al abrir Config rápida (`q000`) toman los valores `1..7` |
| `+3050..+3057` | dos palabras de 4 bytes (la segunda parece un puntero a `0x0395…`) que se cargan al abrir menú |
| `+3078..+3125` | dos bloques de 16 bytes que cambian juntos |
| `+3142..+3200` | estado del panel derecho: punteros, flags y centinelas (`255`) |
| `+5486..+5541` | 14 punteros de 4 bytes; a partir del tercero están separados `0x130` entre sí en `p000` (`0x0e275080`, `0x0e2751b0`, …); el último puede ser `0` (fin de lista) → tabla de objetos de menú |

Ejemplo de la tabla de `+5486` en `p000` (13 punteros + nulo):

```
0x0e375460 0x0e3754f0 0x0e275080 0x0e2751b0 0x0e2752e0 0x0e275410
0x0e275540 0x0e275670 0x0e2757a0 0x0e2758d0 0x0e275a00 0x0e275b30
0x0e275c60 0x00000000
```

### 4.2 Cuándo cambian

- `rec+2900..3200`: **58 transiciones** de 124, 1772 bytes en total.
- `rec+5490..5540`: **62 transiciones**, 1435 bytes.
- En **7 transiciones no cambió nada más** que estas zonas (ni un byte del
  registro ni nada fuera de ellas en el tramo `-64..5600`): `p001` (abrir
  Nivel, sin cambiar el valor), `p006` (abrir Sist. defensivo), `p010` (Libero
  con el menú abierto), `l000` (abrir Lista de ajustes), `t000` (Estrat.
  equipo), `a_auto` (Alineación auto.) y `v020` (cursor en Copiar a A). Esa es
  la prueba de que son pantalla y no ajuste.
- También cambian cuando **sí** hay ajuste (`q1`..`q7`, `l003`, los toggles de
  `i_at_*`, `m*`): el juego reconstruye la pantalla y reescribe punteros y
  contadores. Por eso no se pueden usar como fuente de datos.

### 4.3 La prueba con GAF

En GAF (el equipo que no se editó en la serie) estas dos zonas cambian **una
sola vez en toda la serie**: en `s000`, la captura en la que cambia el `pid`
(6112 → 14832), 15 bytes en `+2900..3200` y 36 bytes en `+5490..5540`. Son
relocalizaciones de punteros por el reinicio, no ajustes. Durante todo el resto
de la serie GAF mantiene los mismos valores aunque FKC cambie de pantalla.

**Conclusión para el mapa**: marcarlas como «ignorar» es correcto para la web
y para cualquier lector de ajustes. No describirlas como «cursor»: son estado
de interfaz (fila/opciones del menú) + tabla de punteros al heap del juego.

---

## 5. FKC contra GAF (mismos offsets)

| offset | FKC | GAF | qué significa |
|---|---|---|---|
| `rec+104` | `1` fijo | `1` fijo | idéntico en los dos equipos, dentro del registro |
| `rec+283` | `1` fijo | `1` fijo | profundidad del portero del bloque A |
| `rec+639`, `641`, `645`, `658`, `661`, `675`, `678`, `679` | cambian | `0` fijo | estado de la pantalla del equipo que se edita |
| `rec+724..766` | cambia | `0` fijo | búfer de Config individual del equipo que se edita |
| `rec-40..-1` | cambia (`-36`, `-20`, `-19`, `-6`) | fijo: `-38 = 0`, `-20 = -19 = -6 = 0`, `-36 = 0`; `-42` cambia igual en los dos (`255`→`3` al reiniciar); los centinelas y los once `01` de `-35..-25` son iguales | cola de cambios solo del equipo que juega |
| zonas `+2900..3200` / `+5490..5540` | mucho movimiento | solo en `s000` (reinicio) | estado/interfaz, no estructura |

Conclusión: nada de lo pendiente (salvo `+104` y `+283`) describe la
estructura del equipo; es estado de la interfaz del equipo que se estaba
editando (FKC). GAF, que no se tocó en la serie, no lo mueve.

---

## 6. Lo que queda sin identificar (sin inventar)

| offset | por qué no alcanza |
|---|---|
| `rec+641` | una sola observación (`c001 = 2`); puede ser contador de cambios o estado del diálogo |
| `rec+658` | solo `0/4`; no se distingue «nº de opciones» de «id de diálogo» |
| `rec+661` | alterna con pantallas y confirmaciones; no se encontró el campo que refleja |
| `rec+675` | es derivado (no ajuste), pero ningún checksum simple sobre el registro coincide |
| `rec+678` | se enciende/apaga con subpantallas; no hay un valor distinto que lo dispare |
| `rec+679` | solo se probó con la lista de lanzadores |
| `rec-38` | constante `8` en FKC y `0` en GAF; no hay acción que lo mueva |
| `rec+104` | se sabe que es runtime (save 0, memoria 1), no qué marca |

No se afirma nada más allá de lo que muestran las capturas.

---

## 7. Reproducir

```js
// resumen de todos los campos de la tarea, con la acción de cada cambio
node tools/pes5/live-unknown-scan.js "C:/Users/ADMINI~1/AppData/Local/Temp/claude/8f26ce61c79846ed/0c1b3a36-9c3e-47cb-ae27-fe8ca8b53107/scratchpad/pesmap/serie"

// solo un byte o un rango, y solo FKC
node tools/pes5/live-unknown-scan.js <carpeta> --equipo FKC --campo rec+642

// zonas de interfaz con la marca de «cambió algún ajuste conocido»
node tools/pes5/live-unknown-scan.js <carpeta> --zona rec+2900..rec+3200 --zona rec+5486..rec+5541

// informe markdown completo
node tools/pes5/live-unknown-scan.js <carpeta> --md salida.md
```

El script solo abre los `.bin`; no escribe nada salvo el `--md` que se le pida.

---

## 8. Anexo: recorrido completo de `rec+675`

Valor y capturas en que se mantiene (la acción es la de la primera captura del
tramo; `→` indica que el valor cambia en esa captura).

| valor | capturas | acción de la primera captura |
|---|---|---|
| `0` | `p000`..`p006` | menú previo / Nivel Ataq.-Def. |
| `68` | `p007` | Sist. defensivo = Libero |
| `129` | `p008`..`p012` | Sist. defensivo = Defensa en línea |
| `64` | `p013` | Sist. defensivo = Libero (otra vez) |
| `118` | `p014`..`l003` | Sist. defensivo = Normal (final) |
| `0` | `s000`..`t002` | Ajustes estrategia abierto |
| `33` | `i000` | Config individual: popup de Yunifantino |
| `134` | `i001` | Actitud atacante abierta |
| `72` | `i002` | flecha arriba: up + X |
| `244` | `i003` | quitada flecha izquierda, antes de OK |
| `158` | `i004` | OK confirmado |
| `19` | `i_at_up_on` | toggle up + OK |
| `129` | `i_at_up_off` | toggle up otra vez + OK |
| `237` | `i_at_down_on` | toggle down + OK |
| `87` | `i_at_down_off` | toggle down otra vez + OK |
| `194` | `i_at_left_on` | toggle left + OK |
| `46` | `i_at_left_off` | toggle left otra vez + OK |
| `113` | `i_at_right_off` | toggle right + OK |
| `244` | `i_at_ur_on` | toggle ↑→ (diagonal) + OK |
| `31` | `i_df0` | Actitud defensiva abierta |
| `29` | `i_df_normal` | Defens = Normal |
| `137` | `i_df_bajo` | Defens = Bajo |
| `12` | `i_df_alto` | Defens = Alto |
| `157` | `i_df_A` | Defens = Alto (X sobre Alto) |
| `8` | `i_df_B` | Defens = Bajo |
| `92` | `i_df_N` | Defens = Normal |
| `134` | `i_df_chk1` | abrir menú, down + X |
| `146` | `ep0` | Editar posición abierto |
| `61` | `ep_up` | flecha arriba |
| `232` | `ep_right` | flecha derecha |
| `207` | `ep_ok` | confirmar X |
| `4` | `mk0` | Config marcaje abierto |
| `74` | `mk_bartelt` | marca a G. Bartelt |
| `222` | `mk_najera` | marca a E. Najera |
| `199` | `mk_zona` | vuelve a Marcar zonas |
| `247` | `sp0` | Selec. posición abierto |
| `245` | `sp_dd` | Yunifantino → DD |
| `194` | `k000` | Lanzador/Capit abierto |
| `31` | `k_cap0` | Elegir capitán |
| `107` | `k_cap1` | capitán → Athirson |
| `15` | `k_l0` | Lanzadores (los 3 en Schneider) |
| `225` | `k_l1` | TL corto → Babic |
| `133` | `k_l2` | token en mano tras X |
| `232` | `k_l3` | TL largo → Voronin |
| `121` | `k_l4` | córner derecho → Freier |
| `205` | `k_l5` | penal → Voronin |
| `236` | `q000`..`f442_A1` | Config rápida abierta |
| `241` | `c000` | Cambios abierto (en pausa) |
| `99` | `c001` | cambio Voronin → banca |
| `73` | `b000`..`b201` | Alineación B / A / Copiar a A |
| `162` | `d_n` | Freier: actitud defensiva |
| `159` | `d_b` | Freier = Bajo |
| `127` | `m00` | Freier: antes de marcaje |
| `65` | `m01` | Freier marca a Schunke |
| `196` | `m02` | tipo Agresivo |
| `206` | `m03` | marca a Clarisa |
| `2` | `m04` | marca a Clarisa (explícito) |
| `11` | `m05` | opción Marcaje |
| `68` | `m06` | marca a Clarisa otra vez |
| `138` | `v000`..`v021` | Estrat. equipo (verificación) |

## 9. Anexo: estados de `rec+724..766`

Columnas: `724`, `725`, `726`, `727`, las 8 flechas `728..735` (como tira),
`736`, `739`, `740`, `741`, `742`.

| captura | 724 | 725 | 726 | 727 | 728..735 | 736 | 739 | 740 | 741 | 742 |
|---|---|---|---|---|---|---|---|---|---|---|
| `p000` | 0 | 0 | 0 | 0 | 11111111 | 0 | 0 | 0 | 0 | 0 |
| `i000` | 0 | 0 | 0 | 0 | 11111111 | 1 | 5 | 0 | 255 | 2 |
| `i001` | 0 | 1 | 5 | 1 | 10001000 | 0 | 0 | 0 | 255 | 2 |
| `i002` | 3 | 1 | 5 | 1 | 10001000 | 0 | 0 | 0 | 255 | 2 |
| `i003` | 0 | 0 | 5 | 1 | 11111111 | 0 | 0 | 0 | 255 | 2 |
| `i004` | 0 | 0 | 0 | 1 | 11111111 | 1 | 5 | 0 | 255 | 2 |
| `i_df0` | 0 | 0 | 0 | 1 | 11111111 | 0 | 3 | 0 | 0 | 2 |
| `i_df_normal` | 0 | 0 | 0 | 1 | 11111111 | 1 | 5 | 1 | 255 | 2 |
| `ep0` | 0 | 0 | 0 | 1 | 11111111 | 0 | 5 | 3 | 255 | 2 |
| `mk0` | 0 | 0 | 0 | 1 | 11111111 | 0 | 3 | 1 | 1 | 2 |
| `mk_bartelt` | 0 | 0 | 0 | 1 | 11111111 | 0 | 2 | 0 | 0 | 2 |
| `mk_najera` | 0 | 0 | 0 | 1 | 11111111 | 0 | 3 | 1 | 1 | 2 |
| `mk_zona` | 0 | 0 | 0 | 1 | 11111111 | 1 | 5 | 2 | 255 | 2 |
| `sp0` | 0 | 0 | 0 | 1 | 11111111 | 0 | 3 | 0 | 0 | 2 |
| `sp_dd` | 0 | 0 | 0 | 1 | 11111111 | 1 | 5 | 4 | 255 | 2 |
| `k000` | 0 | 0 | 0 | 1 | 11111111 | 0 | 0 | 4 | 255 | 0 |
| `c001` | 0 | 0 | 0 | 1 | 11111111 | 0 | 0 | 4 | 255 | 12 |
| `d_n` | 0 | 0 | 0 | 1 | 11111111 | 0 | 3 | 1 | 1 | 8 |
| `m00` | 0 | 0 | 0 | 1 | 11111111 | 1 | 5 | 1 | 255 | 8 |
| `m01` | 0 | 0 | 0 | 1 | 11111111 | 0 | 2 | 0 | 0 | 8 |
| `m02` | 0 | 0 | 0 | 1 | 11111111 | 0 | 3 | 2 | 2 | 8 |
| `m05` | 0 | 0 | 0 | 1 | 11111111 | 1 | 5 | 2 | 255 | 8 |
| `m06` | 0 | 0 | 0 | 1 | 11111111 | 0 | 3 | 2 | 2 | 8 |
| `v000` | 0 | 0 | 0 | 1 | 11111111 | 0 | 0 | 2 | 255 | 0 |

(`+754`, `+758`, `+762`, `+766` llevan ids de la lista: `23,24,25` en `i*`,
`0,1,2` en `d_n`, `1,2,4` en `sp0`, y `0` en `p000`/`v000`.)
