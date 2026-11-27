# Copias en memoria y tablas de coordenadas de la alineación (PES5)

Qué son las copias que el juego mantiene de la alineación, qué campos tiene
cada una, cuándo se escriben y cómo se derivan las tablas de coordenadas
`float32` que usan la pantalla de formación y el partido.

Todo lo que sigue está verificado sobre las capturas de
`scratchpad/pesmap/serie/` (125 capturas, `index.json`) y los volcados
completos `scratchpad/mem/g0`, `g1`, `g2` y `h0`. Se puede reproducir con:

```
node tools/pes5/live-copies-check.js <carpeta-de-capturas>
node tools/pes5/live-copies-check.js <carpeta-de-capturas> --mem <carpeta-de-volcados>
```

El script solo lee archivos: no escribe capturas, saves ni memoria del juego.

---

## 0. Direcciones

`rec` es el registro de formación del equipo en memoria (628 bytes, el mismo
formato que el registro del save). `A = rec + 4` es la dirección que usa el
editor para localizar el orden.

| Estructura | Offset | FKC (club 42) | GAF (club 5) |
|---|---|---|---|
| registro (`rec`) | 0 | `0x3956F5E` | `0x395BBB2` |
| `A` (orden) | `rec+4` | `0x3956F62` | `0x395BBB6` |
| copia **c2** | `rec+0x38B` | `0x39572E9` | `0x395BF3D` |
| copia **c3** | `rec+0x1004` | `0x3957F62` | `0x395CBB6` |
| códigos de posición de la pantalla | `rec+945` | `0x395730F` | `0x395BF63` |
| fila/casilla de Lanzador-Capit | `rec+644` | `0x39571E2` | `0x395BE36` |
| copia del save | `rec-0xA5C` | `0x3956502` | `0x395B156` |
| bloque lateral+posición | `rec-0x7DC` | `0x3956782` | `0x395B3D6` |
| tabla float propia | `rec+3622` | `0x3957D84` | `0x395C9D8` |
| tabla float duplicada | `rec+3806` | `0x3957E3C` | `0x395CA90` |
| tabla float del rival | `rec+3894` | `0x3957E94` | `0x395CAE8` |

Las direcciones son estables entre reinicios del juego (comprobado en los
cuatro volcados y en las dos carpetas de capturas).

Nota de nomenclatura: la nota del coordinador y `docs/pes5/MAPA_ALINEACION_VIVO.md`
toman como base `A = rec + 4`, así que allí el orden de las copias aparece como
`rec+911` (= `A+0x38b`, el `+4` de c2) y `rec+4104` (= `A+0x1004`, el `+4` de
c3). Aquí todo va referido a `rec`.

---

## 1. El registro (`rec`): tres bloques de 171 bytes

`rec` tiene el mismo formato que el registro del club en el save
(`716932 + club*628`), con una diferencia importante: los 64 bytes de `ids`
(casillas 36..99) van **a cero en el save** y el juego los rellena al cargar.
Comparación de `mem/g0` con el save:

| Equipo | `rec` frente al save | `rec-0xA5C` frente a `save[4..627]` |
|---|---|---|
| FKC | 565/628 bytes iguales (difieren `rec+0..2`, los ids `rec+36..99`, `rec+104` y `rec+626..627`) | 623/624 |
| GAF | 568/628 (lo mismo, con los ids de GAF) | 623/624 |

El bloque de formación son **171 bytes** y hay tres seguidos: principal en
`rec+112`, Alineación A en `rec+283`, Alineación B en `rec+454`. Mapa del
bloque (offsets dentro del bloque, verificado con `v010→v011` y `v020→v021`,
que copian los 171 bytes de golpe):

| Offset | Tamaño | Campo | En `rec` (bloque principal) |
|---|---|---|---|
| 0..10 | 11 | profundidad[11] | `rec+112..122` |
| 11..20 | 10 | lateral[10] (casillas 1..10) | `rec+123..132` |
| 21..31 | 11 | códigos de posición[11] | `rec+133..143` |
| 32..34 | 3 | sin identificar | `rec+144..146` |
| 35..122 | 88 | flechas de ataque[11][8] | `rec+147..234` |
| 123..130 | 8 | sin identificar | `rec+235..242` |
| 131..141 | 11 | actitud defensiva[11] | `rec+243..253` |
| 142..152 | 11 | tipo de marcaje[11] | `rec+254..264` |
| 153..163 | 11 | casilla del rival marcado[11] | `rec+265..275` |
| 164..170 | 7 | ajustes de equipo (sist. defensivo, nivel, línea, presión, fuera de juego, contraataque) | `rec+276..282` |

Prueba de que el bloque es exactamente eso: en `v010→v011` («Copiar a B
confirmado») cambian `rec+455..464` (profundidad), `rec+470..474` (lateral),
las flechas de B y sus actitudes/marcajes; en `v020→v021` («Copiar a A
confirmado») cambian solo los 7 bytes que aún diferían: `rec+422` (actitud[8]),
`rec+433` (marcaje[8]), `rec+444` (rival[8]) y `rec+451..453` (`rec+280..282`,
los ajustes).

---

## 2. `c2 = rec+0x38B`: la copia de la pantalla

Campos identificados hasta +180; después siguen banderas sueltas (`0x01`
aislados) que no se interpretaron. Todos los offsets son relativos a `c2`:

| Offset | Tamaño | Campo | Origen |
|---|---|---|---|
| 0..3 | 4 | ceros | — |
| 4..35 | 32 | orden[32] (casilla → índice de plantel) | `rec+4..35` |
| 36..37 | 2 | dos bytes sin identificar: `0x1D 0x17` en los volcados de menú (`g0/g1/g2`) y en `p000..l003`; `0x17 0x17` en el volcado de partido `h0` y en `s000..v021` (coincide con el cambio de proceso: pid 6112 → 14832) | — |
| 38..48 | 11 | códigos de posición[11] | `rec+133..143` (pero se adelanta: ver abajo) |
| 49..59 | 11 | tipo de marcaje[11] | `rec+254..264` |
| 60..70 | 11 | casilla del rival marcado[11] (255 = ninguno) | `rec+265..275` |
| 74..161 | 88 | flechas de ataque[11][8] | `rec+147..234` |
| 170..180 | 11 | actitud defensiva[11] | `rec+243..253` |

> **FV7:** esta copia es la que dibuja el minimapa de la pantalla de
> alineación. `pes5_vivo.leer_equipo` lee sus flechas en
> `campos.flechasAtaquePantalla` (el puente las devuelve en `slots[i].flechas`)
> y `campo`/`variante` escriben `rec+981` junto con el registro. El bloque
> principal (`rec+147`) puede llevar otras flechas aunque la pantalla muestre
> las de `c2`.

Evidencia de las equivalencias (capturas con valores distintos en cada campo):

* marcaje y rival: `m02` (Freier = casilla 8, «hombre agresivo» → `c2+49[8]=3`,
  `c2+60[8]=1`), `m03`/`m06` (tipo 3, rival 2), `m04` (tipo 2), `m05` (tipo 0),
  `mk_najera` (`c2+49[2]=0`).
* flechas y actitud: `d_n`/`d_b` (Freier casilla 8: actitud 1→2 en `rec+251` y
  en `c2+170[8]`), `mk0`/`ep0` (flechas idénticas byte a byte).
* En las 125 capturas de `serie/` la copia de la posición de la pantalla
  (`rec+945..955`) es **siempre** igual a `c2+38..48`.

### 2.1 Qué se escribe al instante y qué al confirmar

`c2` se escribe **antes** de confirmar en los flujos de previsualización:

| Transición | Acción | Qué cambia en `c2` | Registro |
|---|---|---|---|
| `p007→p008` | Sist. defensivo: Líbero → Defensa en línea (menú abierto) | `c2+39` (casilla 1) 7 → 4 | sin cambios |
| `p010→p011` | vuelta a Líbero | `c2+39` 4 → 7 | sin cambios |
| `p013→p014` | otra vez Línea | `c2+39` 7 → 4 | sin cambios |
| `l000→l002` | menú Lista de ajustes abierto (cursor en el líbero) | `c2+36` 0x17 → 0x1D | sin cambios |
| `l002→l003` | confirmar con el líbero Castro | `c2+38..48` recalculados | `rec+133..143` recalculados |

Conteo global: en **27 de 125** capturas de la serie el array de `c2` no
coincide con el del registro. Son exactamente los estados de previsualización:
`p008`, `p009`, `p010`, `p014`, `e000..e003`, `e010..e013`, `e020..e023`,
`e030..e033`, `l000..l003`, `k000`, `k_cap0` y `f442_hover`. En el resto (98
capturas) coinciden byte a byte.

En los flujos de esquema/bloque `c2` puede además quedar **desfasado** en los
campos por jugador: en `f442_hover` ya tiene las flechas y la actitud del
esquema nuevo mientras el registro conserva las anteriores; en `b000`, `b001`,
`b100` y `b101` conserva las flechas, la actitud y el rival de la
configuración anterior; en `c000` el primer byte del marcaje es un valor
transitorio (36). En las 120 capturas restantes los cinco campos coinciden
byte a byte. Es una copia que se regenera cuando el juego la reescribe, no en
cada acción.

---

## 3. `c3 = rec+0x1004`: la copia de la configuración seleccionada

| Offset | Tamaño | Campo | Origen |
|---|---|---|---|
| 0..3 | 4 | cabecera (valor tipo contador/puntero; `95 03 6A 00` en `g0`) | — |
| 4..35 | 32 | orden[32] | `rec+4..35` |
| 36..37 | 2 | `0x1D 0x17` (igual que c2; `0x17 0x17` en el volcado de partido y en `s000..v021`) | — |
| 38 | 1 | **bloque seleccionado**: 0 = principal, 1 = Alineación A, 2 = Alineación B | — |
| 39..49 | 11 | códigos de posición[11] | bloque + 21 |
| 50..60 | 11 | profundidad[11] (**la casilla 0 vale siempre 2**, el registro tiene 1) | bloque + 0 |
| 61 | 1 | `0x34` (52) fijo | — |
| 62..71 | 10 | lateral[10] | bloque + 11 |
| 72..100 | 29 | `0x01` en todas las capturas | — |
| 101..103 | 3 | ceros | — |
| 104..114 | 11 | tipo de marcaje[11] | bloque + 142 |
| 115..125 | 11 | casilla del rival marcado[11] | bloque + 153 |
| 126..136 | 11 | rampa `0,1,2,…,10` (en todas las capturas de `serie/`; a cero en los volcados de menú `g0/g1/g2`) | — |
| 140..227 | 88 | flechas de ataque[11][8] | bloque + 35 |
| 228..235 | 8 | ceros | — |
| 236 | 1 | `0xFF` (en un estado transitorio de config individual, `i002`, tomó 3) | — |
| 237..247 | 11 | actitud defensiva[11] | bloque + 131 |

Prueba del selector y del origen de los datos:

| Captura | Acción | `c3+38` | `c3` muestra |
|---|---|---|---|
| `q000` | pantalla principal | 0 | bloque principal |
| `b000` | menú Alineación B abierto | 2 | bloque B |
| `b001` | config rápida «Todo ataque» dentro de B | 2 | bloque B ya modificado |
| `b100` | menú Alineación A abierto | 1 | bloque A |
| `b101` | config rápida «Todo ataque» dentro de A | 1 | bloque A ya modificado |
| `b200` | vuelta a la pantalla principal | 0 | bloque principal |

El resto de campos por jugador (marcaje, rival, flechas, actitud) también
sigue al bloque elegido en 123–125 de las 125 capturas; las excepciones son
estados transitorios (`mk_bartelt`, `f442_hover`).

### 3.1 Qué se escribe al instante y qué al confirmar

| Transición | Acción | `c3` | Registro |
|---|---|---|---|
| `sp0→sp_dd` | Selec. posición: casilla 2 → DD | pos[2] 7→9 al instante | pos[2] 7→9 al instante |
| `ep0→ep_up` | Editar posición, flecha arriba | lateral[1] 63→61 | sin cambios |
| `ep_up→ep_right` | flecha derecha | profundidad[2] 2→3 | sin cambios |
| `ep_right→ep_ok` | confirmar | ya estaba | profundidad[2]=3 y lateral[1]=61 |
| `q000→q1..q7` | Config rápida | profundidad (y lateral) al instante | profundidad al instante |
| `a_auto_si→f442_hover` | vista previa de la variante 4-4-2 A-1 | pos/prof/lat de la variante | sin cambios |
| `f442_hover→f442_A1` | elegir la variante | ya estaba | pos/prof/lat de la variante |
| `a_auto→a_auto_si` | Alineación auto. → Sí | orden nuevo | orden nuevo |

Conteo: `c3` va por detrás del registro en 11 capturas (posición), 2
(profundidad) y 3 (lateral), todas ellas justo después de confirmar o en la
vista previa (`l003`, `k000`, `k_cap0`, `k_cap1`, `k_l0..k_l5`, `ep_up`,
`ep_right`, `f442_hover`). Es decir, `c3` **no** se resincroniza en el acto al
confirmar: mantiene lo último que previsualizó hasta que el juego vuelve a
escribirla.

---

## 4. La copia de códigos de posición «`rec+946`»

La nota anterior decía `rec+946..956`. El array real empieza un byte antes:

* `rec+945..955` = `c2+38..48` = 11 códigos de posición (casillas 0..10).
* Solo se ven cambiar `rec+946..955`, porque el código del portero (casilla 0)
  es siempre 0.
* `rec+956` **no** forma parte del array: es un byte suelto que cambió una vez,
  al hacer un cambio en pausa (`c000→c001`: 36 → 1).

---

## 5. `rec+644` y `rec+645`: no es «la copia del capitán»

Son dos bytes que se actualizan al instante en la pantalla Lanzador/Capit:
`rec+644` = fila y `rec+645` = **casilla bajo el cursor** (no el capitán).

| Captura | Acción | `rec+644` | `rec+645` | `rec+111` (capitán) |
|---|---|---|---|---|
| `k_l0` | lanzadores sin tocar (cursor en el primer lanzador) | 3 | 4 | 4 |
| `k_l1` | TL corto → casilla 7 | 3 | 7 | 4 |
| `k_l2` | token en mano (TL corto casilla 8) | 2 | 8 | 4 |
| `k_l3` | TL largo → casilla 9 | 2 | 9 | 4 |
| `k_l4` | córner derecho → casilla 6 | 0 | 6 | 4 |
| `k_l5` | penalti → casilla 9 | 4 | 9 | 4 |
| `k_cap0` | menú Elegir capitán (Harureadytoon, casilla 5) | 0 | 5 | 5 |
| `k_cap1` | capitán → Athirson (casilla 4) | 0 | 4 | 4 |

Se comparan con el estado anterior de la misma pantalla, así que `rec+645`
coincide con el capitán en las capturas de capitán y con el lanzador en las de
lanzadores. En `k_cap1` cambian además `rec+646` (0 → 1) y `rec+661` (0 → 1).

---

## 6. Otras copias del bloque de cada equipo

| Copia | Contenido | Cuándo se escribe |
|---|---|---|
| `rec-0xA5C` | **copia literal del save**: orden[32] al inicio, ids a cero, bloque de formación en +96 (profundidad +108, lateral +119, posición +129). 623 de 624 bytes iguales a `save[4..627]` (difiere `save+626`). | una vez, al cargar; no cambia en ninguna de las 125 capturas ni en `g0..g2`/`h0` (en `h0` conserva el orden del save aunque el partido haya hecho cambios) |
| `rec-0x7DC` | 21 bytes: lateral[10] + posición[11] **del save** (coincide con el save; es una copia congelada: no cambia en ninguna de las 125 capturas ni en `g0/g1/g2/h0`), precedidos por profundidad[1..10] y por `45 00 1D 17 FF FF` | nunca |
| `rec+2502` / `rec+2504` | profundidad / lateral del jugador que se está editando con «Editar posición» | al instante (`ep0`: 2 / 63; `ep_up`: 2 / 61; `ep_right`: 3 / 61) y se pone a cero al confirmar (`ep_ok`) |
| `rec+2676` | búfer del editor de posiciones: cabecera de 6 bytes y luego orden[32] en +6, posición[11] en +38, profundidad[11] en +49, `0x34` en +60 y lateral[10] en +61 (con la casilla 0 de la profundidad a 2) | se rellena al abrir «Editar posición» (`ep0`, con los valores del registro del momento), se pone a cero al confirmar (`ep_ok`, `s000`) y vuelve a estar relleno desde `k000` con los valores de la última edición (en `m00`: posición `0,7,9,…` y profundidad `2,10,3,…`) |

---

## 7. Tablas de coordenadas `float32`

### 7.1 Dónde están y cuántos pares tienen

Dentro del bloque de cada equipo, a partir de `rec+3622`, hay una zona de
tablas de pares `(x, y)` en `float32` poco endian:

| Offset | Contenido | Pares |
|---|---|---|
| `rec+3622..3701` | tabla del equipo (jugadores de campo) | 10 |
| `rec+3702..3797` | fila de banca, todos con `y = 103` | 12 |
| `rec+3798..3805` | un par «ancla» del equipo | 1 |
| `rec+3806..3885` | **duplicado exacto** de `rec+3622..3701` | 10 |
| `rec+3886..3893` | par ancla del rival (espejado) | 1 |
| `rec+3894..3973` | tabla del rival (espejada) | 10 |

Las dos copias de la tabla propia son idénticas byte a byte en las 125
capturas de la serie y en los cuatro volcados. No hay tabla propia para el
portero: los 10 pares son las casillas 1..10, en orden de casilla.

(La nota previa daba `rec+3623..3696` y `rec+3807..3880`: es el tramo de bytes
que cambian entre formaciones; la tabla completa va de `3622` a `3701` y de
`3806` a `3885`.)

La tabla **no** está dentro de `c3`: `c3` empieza en `rec+0x1004` y la tabla en
`rec+3622`, 478 bytes antes. `c3` solo lleva los arrays de bytes (posición,
profundidad, lateral) de los que se calcula la tabla. Lo que sí tiene cada
equipo son sus dos tablas: la propia y la del rival, también en GAF
(`GAF+3622` y `GAF+3894`).

Ejemplo (`mem/g0`, FKC, formación 4-2-4):

| Par | Casilla | profundidad | lateral | x | y |
|---|---|---|---|---|---|
| 1 | 1 | 10 | 99 | 32.70833 | 90.43269 |
| 2 | 2 | 2 | 63 | 6.54167 | 57.54808 |
| 3 | 3 | 2 | 42 | 6.54167 | 38.36539 |
| 4 | 4 | 2 | 6 | 6.54167 | 5.48077 |
| 5 | 5 | 17 | 6 | 55.60416 | 5.48077 |
| 6 | 6 | 31 | 99 | 101.39583 | 90.43269 |
| 7 | 7 | 47 | 6 | 153.72916 | 5.48077 |
| 8 | 8 | 37 | 83 | 121.02083 | 75.81731 |
| 9 | 9 | 47 | 53 | 153.72916 | 48.41346 |
| 10 | 10 | 37 | 22 | 121.02083 | 20.09616 |

### 7.2 Fórmula lineal

Con `p = rec+112+casilla` (profundidad) y `l = rec+123+casilla-1` (lateral):

```
x = p * 157/48     (3,2708333…)
y = l * 95/104     (0,9134615…)
```

El ajuste es exacto: la diferencia máxima entre la tabla almacenada y la
fórmula es **1,0·10⁻⁵** (redondeo de `float32`) en `g0`, `g1`, `g2` y `h0`
para FKC y en `g0..g2` para GAF. Los tres volcados de menú (`g0` 4-2-4, `g1`
3-5-2 B5, `g2` A1, cambiando solo la formación de FKC) confirman que la tabla
se recalcula al cambiar el esquema.

El equipo **visitante** se dibuja espejado:

```
x' = 157 - x  =  (48 - p) * 157/48
y' = 95  - y  =  (104 - l) * 95/104
```

Cada bloque guarda **las dos orientaciones**: FKC (local) tiene su tabla
directa en `rec+3622` y la de GAF espejada en `rec+3894`; GAF tiene la suya
espejada en `rec+3622` y la de FKC directa en `rec+3894`. Las dos parejas son
copias exactas: `FKC+3622 == GAF+3894` y `FKC+3894 == GAF+3622` (80 bytes
idénticos en `g0`, `g1`, `g2` y `h0`).

La fila de banca son 12 pares con `y = 103` y `x = 4 + 8·i` en el local;
`x = 154 - 8·i` en el visitante. No cambia con la formación. Los pares ancla
son `(p=2, l=52)` para el local (`6.54167 / 47.5`) y su espejo `(p=46)` para el
visitante (`150.45833 / 47.5`).

### 7.3 Cuándo se recalculan

La tabla **sigue a `c3`** (la previsualización), no al registro:

| Transición | Tabla | Registro |
|---|---|---|
| `ep0→ep_up` | cambia el `y` del par 2 (`rec+3634..3636`) | sin cambios |
| `ep_up→ep_right` | cambia el `x` del par 2 (`rec+3630..3633`) | sin cambios |
| `ep_right→ep_ok` | ya estaba | se escribe profundidad/lateral |
| `f442_hover` | tabla de la variante (difiere 42.0 del registro) | sin cambios |
| `f442_A1` | ya estaba | se escribe el registro |
| `b000/b001` | tabla del bloque B | el bloque B (config rápida) |
| `b100/b101` | tabla del bloque A | el bloque A (config rápida) |
| `b200` | tabla del bloque principal | — |

En el volcado de partido `h0` la tabla de GAF (espejada) quedó **desfasada**:
el lateral de GAF cambió en el registro (63,40,… → 63,85,…) y su tabla sigue
con el valor anterior (diferencia 41,1). Es decir, el juego no recalcula estas
tablas en cada cambio: solo cuando se reescribe la formación desde el menú.

---

## 8. Las 7 copias de los laterales de GAF

Las coordenadas de la nota anterior (`0xFF167E`, `0xFF16D3`, `0x395B1CD`,
`0x395B3D6`, `0x3B8E665`, `0x3B90F9F`, `0xD84D867`) son exactamente las 7
apariciones del array de laterales **antiguo** de GAF
(`63,40,85,18,57,36,65,85,22,53`) en el volcado de partido `h0`:

| Dirección | Estructura que la contiene |
|---|---|
| `0xFF167E` | bloque compacto de **85 bytes** con inicio en `0xFF1654`: orden[32] + profundidad[1..10] + lateral[10] + posición[11] + 22 bytes de banderas. Hay una segunda copia seguida en `0xFF16A9` |
| `0xFF16D3` | la segunda copia (`0xFF16A9 + 42`) |
| `0x395B1CD` | **copia del save** de GAF (`rec-0xA5C`): orden al inicio, ids a cero, laterales en +119 |
| `0x395B3D6` | bloque de 21 bytes en `rec-0x7DC`: lateral[10] + posición[11], precedido por profundidad[1..10] y `45 00 1D 17 FF FF` |
| `0x3B8E665` | bloque de **628 bytes** con cabecera en `0x3B8E5EA` y el formato del registro (orden en +4, lateral en +123, posición en +133) |
| `0x3B90F9F` | bloque con profundidad[11] en `0x3B90F94`, lateral en `0x3B90F9F` y posición en `0x3B90FA9` (las tres contiguas, como en el registro) |
| `0xD84D867` | registro de 628 bytes de GAF dentro de una **tabla de registros de equipo**: cabecera `"GAF"` en `0xD84D7EC`, orden en `0xD84D7F0`, lateral en +123 |

En los volcados de menú (`g0`, `g1`, `g2`) el lateral **vigente** de GAF
aparece en otras 7 direcciones: `0x395B1CD`, `0x395B3D6`, `0x395BC2D`
(registro), `0x395CBF4` (`c3+62`), `0x3B90F9F`, `0xD454867` y `0xDACB103`.
Estas dos últimas son otros dos registros de 628 bytes de GAF (cabecera
`"GAF"` en `0xD4547EC` y `0xDACB088`).

Consecuencias:

* Son copias, no fuentes: según la prueba del coordinador (cambiar el lateral
  en el registro y en esas copias no movió el punto de la línea de marcaje) el
  juego no las lee para dibujar; el punto sale de las tablas `float` de §7.
* En `h0` todas conservan el lateral **guardado** (el del save): el cambio de
  lateral que sí está en el registro no se propagó a ninguna.
* Lo que dibuja el juego son las tablas `float` de §7 (para el rival, la
  espejada de `rec+3622`), y también pueden ir un paso por detrás si el
  cambio no vino del menú de formación.

---

## 9. Resumen de la regla «al instante / al confirmar»

| Acción | `c2` | `c3` | Tablas float | Registro |
|---|---|---|---|---|
| Cambiar de sistema defensivo (menú abierto) | pos, al instante | — | — | al confirmar la lista |
| Confirmar Lista de ajustes (líbero) | pos recalculada | — | — | pos recalculada |
| Selec. posición | pos | pos | — | pos, al instante |
| Editar posición | — | prof/lat | prof/lat | al confirmar (X) |
| Config rápida | — | prof/lat | prof/lat | prof/lat, al instante |
| Elegir variante de esquema | pos (hover) | pos/prof/lat (hover) | sí (hover) | al elegir |
| Abrir Alineación A/B | conserva los campos de la configuración anterior | selector + bloque | bloque elegido | — |
| Alineación automática | orden | orden | — | orden |
| Lanzador/Capit | — | — | — | `rec+644/645` al instante; `rec+106..111` al confirmar |
| Copiar a A / Copiar a B | — | — | — | los 171 bytes del bloque |
| Cambio en pausa | — | — | — | cola en `rec-20/-19/-6` |

---

## 10. Lo que queda abierto

* Los dos bytes `c2+36/+37` (`c3+36/+37`): `0x1D 0x17` en los volcados de menú
  y en `p000..l003`, `0x17 0x17` en el volcado de partido y en `s000..v021`.
  Cambian con el proceso (pid 6112 → 14832 en la serie), no con una acción
  concreta del menú, y no se encontró su significado.
* Los 29 bytes `0x01` de `c3+72..100`, los tres ceros de `c3+101..103` y la
  rampa `0,1,…,10` de `c3+126..136`: sin identificar.
* `rec+956`: cambió 36 → 1 en el cambio en pausa `c000→c001`; no es parte del
  array de códigos de posición.
* Serie `b`: en `b200` (etiquetada «antes de Copiar a A») el bloque A ya es
  igual al principal y `b200→b201` no cambia ni un byte, así que la copia
  ocurrió antes de la captura o la etiqueta está corrida. La evidencia limpia
  del comando es `v020→v021`.
* El par ancla de §7 (`p=2, l=52`) no se identificó con ningún elemento de la
  interfaz; se comporta como un punto fijo del equipo (su espejo es el del
  rival) y no cambia con la formación.
