# Mapa en vivo de la pantalla de alineación de PES5

Cómo queda la alineación de un equipo en memoria mientras el juego está en la
pantalla previa al partido (o en pausa, incluido el entretiempo), qué menú
escribe cada byte y cuándo.
Todo lo que sigue se midió **leyendo** la memoria del proceso y el option file
(ver [Cómo se verificó](#cómo-se-verificó-al-final));
nada de esto se escribió en el juego ni en el save.

- Comprobador: `tools/pes5/verify-live-map.js`
- Lector en vivo: `tools/pes5/live-lineup-read.py` (solo lectura, imprime JSON)
- Analizador de capturas: `tools/pes5/live-map-analyze.js` (PESMAP1)
- Capturas: serie etiquetada del coordinador (`index.json` + `<label>.bin`,
  0x30000 bytes desde 0x3940000)

## Índice

- [Estado de la pantalla de alineación](#estado-de-la-pantalla-de-alineación)
- [Resumen de los informes de `mapa-vivo/`](#resumen-de-los-informes-de-mapa-vivo)
- [Direcciones](#direcciones)
- [Estructura del registro (628 bytes)](#estructura-del-registro-628-bytes)
- [Tabla de códigos de posición](#tabla-de-códigos-de-posición)
- [Banca, reservas y momentos de edición](#banca-reservas-y-momentos-de-edición)
- [Copias en memoria](#copias-en-memoria)
- [Copias c2 y c3, tablas float y laterales](#copias-c2-y-c3-tablas-float-y-laterales)
- [Línea de marcaje](#línea-de-marcaje)
- [Búferes de pantalla y temporales](#búferes-de-pantalla-y-temporales)
- [Cambios en pausa (partido empezado)](#cambios-en-pausa-partido-empezado)
- [Lo que reescribe cada menú](#lo-que-reescribe-cada-menú)
- [Zonas de interfaz a ignorar](#zonas-de-interfaz-a-ignorar)
- [Controles de teclado](#controles-de-teclado)
- [Árbol del menú (previo al partido y pausa)](#árbol-del-menú-previo-al-partido-y-pausa)
- [Sin identificar](#sin-identificar)
- [Herramientas](#herramientas)
- [Verificación de las notas del coordinador](#verificación-de-las-notas-del-coordinador)
- [Lector en vivo](#lector-en-vivo)
- [Cómo se verificó al final](#cómo-se-verificó-al-final)

## Estado de la pantalla de alineación

Un renglón por ajuste que se puede tocar en la pantalla de alineación. El
offset es relativo a `rec` salvo que diga otra cosa; `+c` es la casilla
(0..10). «Verificado» remite a la evidencia de las capturas (la tabla completa
está en [Verificación de las notas](#verificación-de-las-notas-del-coordinador)).

| Ajuste | Offset(s) | Verificado | Dónde |
|---|---|---|---|
| **Alineación → Cambio** (elegir variante) | prof `112..122`, lat `123..132`, pos `133..143`, reinicia flechas `147..242` (incluye los 8 bytes sin identificar) y actitudes `243..253`; la vista previa escribe el espejo `945..955` | Sí, con reserva | [Bloque de alineación](#bloque-de-alineación-171-bytes-relativo-al-inicio-del-bloque) |
| **Alineación → Editar posición** | prof `112+c`, lat `122+c`; temporales en `2502`/`2504` | Sí | [Bloque de alineación](#bloque-de-alineación-171-bytes-relativo-al-inicio-del-bloque) |
| **Alineación → Selec. posición** | pos `133+c` y espejo `945+c` | Sí | [Bloque de alineación](#bloque-de-alineación-171-bytes-relativo-al-inicio-del-bloque) |
| **Alineación → Alineación auto.** | orden `4..35` y sus copias `911`/`4104` | Sí | [Lo que reescribe cada menú](#lo-que-reescribe-cada-menú) |
| **Cambios** | antes del partido: orden `4..35`; en partido: cola `rec-20` (entra), `rec-19` (sale), `rec-6` (contador) | Sí | [Cambios en pausa](#cambios-en-pausa-partido-empezado) |
| **Ajustes equipo → Nivel Ataq./Def.** | `278` | Sí | [Bloque de alineación](#bloque-de-alineación-171-bytes-relativo-al-inicio-del-bloque) |
| **Ajustes equipo → Sist. defensivo** | `276` (y recalcula posiciones `133..143`) | Sí, con reserva | [Bloque de alineación](#bloque-de-alineación-171-bytes-relativo-al-inicio-del-bloque) |
| **Ajustes equipo → Estrat. equipo** (submenú) | `279..282`, con búferes `0x395886d..0x3958870` | Sí | [Búferes](#búferes-de-pantalla-y-temporales) |
| **Ajustes equipo → Estrat. equipo → Línea** | `279`; búfer `0x395886d` | Sí | [Búferes](#búferes-de-pantalla-y-temporales) |
| **Ajustes equipo → Estrat. equipo → Presión** | `280`; búfer `0x395886e` | Sí | [Búferes](#búferes-de-pantalla-y-temporales) |
| **Ajustes equipo → Estrat. equipo → Fuera de juego** | `281`; búfer `0x395886f` | Sí | [Búferes](#búferes-de-pantalla-y-temporales) |
| **Ajustes equipo → Estrat. equipo → Contraataque** | `282`; búfer `0x3958870` | Sí | [Búferes](#búferes-de-pantalla-y-temporales) |
| **Ajustes equipo → Lista de ajustes → Líbero** | `277`; búfer `0x3958b18`; recalcula posiciones | Sí | [Búferes](#búferes-de-pantalla-y-temporales) |
| **Ajustes estrategia → Manual** | modo `105` = 0; botones de estrategia `100..103` | Sí, con reserva | [Cabecera común](#cabecera-común-rec100111) |
| **Ajustes estrategia → Semi-automático** | modo `105` = 1; los mismos bytes son L2/AUTO1-3 | Sí, con reserva | [Cabecera común](#cabecera-común-rec100111) |
| **Ajustes estrategia → Alineación A** | bloque `283..453`; selector `4138` (`c3+38`) | Sí | [Configuraciones A y B](#configuraciones-a-y-b) |
| **Ajustes estrategia → Alineación B** | bloque `454..624`; selector `4138` (`c3+38`) | Sí | [Configuraciones A y B](#configuraciones-a-y-b) |
| **Ajustes estrategia → Copiar a A** | bloque `283..453` (171 bytes) | Sí | [Configuraciones A y B](#configuraciones-a-y-b) |
| **Ajustes estrategia → Copiar a B** | bloque `454..624` (171 bytes) | Sí | [Configuraciones A y B](#configuraciones-a-y-b) |
| **Config. individual → Actitud atacante** | `147+8c` (8 bytes) | Sí | [Bloque de alineación](#bloque-de-alineación-171-bytes-relativo-al-inicio-del-bloque) |
| **Config. individual → Actitud defens.** | `243+c` | Sí, con reserva | [Bloque de alineación](#bloque-de-alineación-171-bytes-relativo-al-inicio-del-bloque) |
| **Config. individual → Config. marcaje** | `254+c` (tipo) y `265+c` (rival, 255 = ninguno) | Sí, con reserva | [Bloque de alineación](#bloque-de-alineación-171-bytes-relativo-al-inicio-del-bloque) |
| **Config. individual → Editar posición** | prof `112+c`, lat `122+c` | Sí | [Bloque de alineación](#bloque-de-alineación-171-bytes-relativo-al-inicio-del-bloque) |
| **Config. individual → Selec. posición** | pos `133+c` y espejo `945+c` | Sí | [Bloque de alineación](#bloque-de-alineación-171-bytes-relativo-al-inicio-del-bloque) |
| **Lanzador/Capit → Selecc. lanzador** | `106` (SE izq.), `107` (SE der.), `108` (TL largo), `109` (TL corto), `110` (PK); cursor `644`/`645` | Sí | [Cabecera común](#cabecera-común-rec100111) |
| **Lanzador/Capit → Elegir capitán** | `111`; cursor `645` (no es copia del capitán) | Sí | [Cabecera común](#cabecera-común-rec100111) |
| **Config. rápida** (7 preajustes) | prof `113..122`, flechas `147..242`, actitudes `243..253`, ajustes `278..282` y byte `145` | Sí | [Lo que reescribe cada menú](#lo-que-reescribe-cada-menú) |

## Resumen de los informes de `mapa-vivo/`

Dos informes amplían este documento. Aquí queda lo esencial y el enlace al
archivo completo:

- [`mapa-vivo/COPIAS.md`](mapa-vivo/COPIAS.md): las copias **c2**
  (`rec+0x38B`) y **c3** (`rec+0x1004`), qué campo escribe cada una y cuándo,
  las tablas `float32` de coordenadas (`rec+3622..3973`), el espejo del rival,
  la fila de banca y las 7 copias de los laterales de GAF. Corrige: `rec+945`
  (no `946`) es el inicio del array de posiciones, `rec+956` no pertenece a ese
  array, `rec+644`/`645` son fila/casilla del cursor y no una copia del
  capitán, `rec+3622..3701` y `rec+3806..3885` son la tabla completa, y
  `rec+4138` es el selector de bloque de `c3`.
- [`mapa-vivo/SIN_IDENTIFICAR.md`](mapa-vivo/SIN_IDENTIFICAR.md): `rec+104`,
  `rec+283`, `rec+642`, `rec+645`, `rec-36`, la cola de cambios
  `rec-20/-19/-6` y las zonas de interfaz `rec+2900..3200` y
  `rec+5486..5541`. Confirma que `rec+283` es el primer byte de la Alineación
  A (no el fin del bloque principal) y que los bytes de estado (`639`, `641`,
  `658`, `661`, `675`, `678`, `679`, `724..766`) no son ajustes.

> **Dos erratas heredadas de la nota anterior.** Los dos informes conservan el
> rótulo «córner derecho» para `k_l4`, pero `k_l4.png` muestra la **I** en
> Freier (casilla 6) y la **D** en Schneider (casilla 8): manda la imagen, así
> que `rec+106` es el córner **izquierdo** y `rec+107` el **derecho**. Igual
> con `rec+946`: el array de códigos de posición empieza en `rec+945`.

## Direcciones

| Equipo | Club en el save | `rec` | `A` (= rec+4) |
|---|---|---|---|
| FK TUPADRE (FKC, local) | 42 | `0x3956f5e` | `0x3956f62` |
| GUARANI AF (GAF, visitante) | 5 | `0x395bbb2` | `0x395bbb6` |

`rec` es el inicio en memoria del registro de formación de 628 bytes que el
save guarda en `716932 + club*628` (`FORM_REGISTRO_BASE` de
`tsc-src/js/pes5-editor.js`). Los dos registros tienen el mismo formato: GAF
reproduce la cabecera, los ajustes y las posiciones del save del club 5 igual
que FKC las del club 42.

## Estructura del registro (628 bytes)

| Rango | Campo | Detalle |
|---|---|---|
| +0..3 | Código del club | `FKC\0` en el save; en memoria `FF FF FF 00` |
| +4..35 | Orden de alineación | 32 bytes, permutación de 0..31: casilla → índice de plantel |
| +36..99 | IDs del plantel | 32 × u16 LE; en el save este tramo está a 0 y el plantel vive aparte (`667458 + club*64`) |
| +100..111 | Cabecera común | botones, modo, lanzadores y capitán (igual en las tres alineaciones) |
| +112..282 | Bloque principal | 171 bytes (ver tabla siguiente) |
| +283..453 | Alineación A | 171 bytes, mismo formato que el principal |
| +454..624 | Alineación B | 171 bytes, mismo formato que el principal |
| +625..627 | Cola | sin identificar (difiere entre save y memoria: ver [Sin identificar](#sin-identificar)) |

### Bloque de alineación (171 bytes, relativo al inicio del bloque)

El principal arranca en `rec+112`, la A en `rec+283` y la B en `rec+454`; los
desplazamientos de la tabla son relativos al inicio del bloque.

| Offset | Bytes | Campo | Valores / codificación | Menú que lo cambia | Cuándo se escribe |
|---|---|---|---|---|---|
| +0..10 | 11 | Profundidad por casilla | 1..47 | Alineación → Editar posición ↑↓; Alineación → Cambio (variante); Config. rápida | Al confirmar (Editar posición); al elegir la variante; al aplicar el preajuste |
| +11..20 | 10 | Lateral por casilla (1..10) | 6..99 | Alineación → Editar posición ←→; Alineación → Cambio (variante) | Al confirmar; Config. rápida no lo toca |
| +21..31 | 11 | Posición declarada por casilla | códigos de la [tabla](#tabla-de-códigos-de-posición) | Alineación → Selec. posición; Alineación → Cambio (variante); Líbero/sistema (recalcula) | Al instante en Selec. posición; al elegir la variante; al confirmar el líbero |
| +32..34 | 3 | Sin identificar | siempre 0 en el save; la Config. rápida escribe `+33` (`rec+145`) | — | — |
| +35..122 | 88 | Flechas de ataque, 11 grupos de 8 | casilla 0..10: ←, ↖, ↑, ↗, →, ↘, ↓, ↙ (0/1); cada diagonal es su propio bit | Config. individual → Actitud atacante (dirección + X); Config. rápida; Cambio (variante las reinicia) | Al marcar la dirección con X (no hace falta el OK del submenú; en la serie una captura se queda un paso por detrás) |
| +123..130 | 8 | Sin identificar | cambia con Config. rápida y con `c001`; **no** es un duodécimo grupo de flechas | — | — |
| +131..141 | 11 | Actitud defensiva por casilla | 0 Alto, 1 Normal, 2 Bajo | Config. individual → Actitud defens.; Config. rápida | Al elegir (dos capturas de la serie leen el valor anterior) |
| +142..152 | 11 | Config. de marcaje por casilla | 0 Marcaje, 1 marcar zonas, 2 hombre normal, 3 hombre agresivo | Config. individual → Config. marcaje | Al confirmar (se observa una captura por detrás) |
| +153..163 | 11 | Rival marcado por casilla | casilla del rival; 255 = ninguno (se conserva al volver a zonas) | Config. individual → Config. marcaje | Al confirmar |
| +164 | 1 | Sistema defensivo | 0 Normal, 1 Líbero, 2 Defensa en línea (3 visto tras elegir el líbero de la lista: sin explicar) | Ajustes equipo → Sist. defensivo | Al confirmar; varias capturas lo leen con una selección de retraso |
| +165 | 1 | Líbero (jugador) | casilla 0..11 del líbero | Ajustes equipo → Lista de ajustes → Líbero | Al confirmar la Lista de ajustes |
| +166 | 1 | Nivel ataque/defensa | 0 Manual, 1 Auto defensa, 2 Normal, 3 Auto ataque | Ajustes equipo → Nivel Ataq./Def. | Al instante |
| +167 | 1 | Línea defensiva | 0 A, 1 B, 2 C | Ajustes equipo → Estrat. equipo → Línea | Al confirmar (con X); mientras está abierto vive en el búfer `0x395886d` |
| +168 | 1 | Zona de presión | 0 A, 1 B, 2 C | Ajustes equipo → Estrat. equipo → Presión | Búfer `0x395886e` con el submenú abierto; se escribe al confirmar (`v000 → v001`) |
| +169 | 1 | Fuera de juego | 0 A, 1 B, 2 C | Ajustes equipo → Estrat. equipo → Fuera de juego | Búfer `0x395886f`; se escribe al confirmar (`v000 → v001`) |
| +170 | 1 | Contraataque | 0 A, 1 B, 2 C | Ajustes equipo → Estrat. equipo → Contraataque | Búfer `0x3958870`; se escribe al confirmar (`v000 → v001`) |

Comprobación de las sumas: 11 + 10 + 11 + 3 + 88 + 8 + 11 + 11 + 11 + 7 = 171.

La nota anterior contaba 96 bytes de flechas (12 grupos); los 8 últimos
(`rec+235..242`) no son un grupo de flechas sino 8 bytes sin identificar, así
que el bloque tiene 11 grupos de 8 (casillas 0..10) y esos 8 bytes aparte.

### Cabecera común (`rec+100..111`)

Se escribe igual para las tres alineaciones (editar la A o la B no la toca).

| Offset | Campo | Valores |
|---|---|---|
| +100 | Estrategia del botón □ (cuadrado) | código de estrategia (ver tabla) |
| +101 | Estrategia del botón △ (triángulo) | idem |
| +102 | Estrategia del botón ○ (círculo) | idem |
| +103 | Estrategia del botón ✕ (equis) | idem |
| +104 | Desconocido | 0 en el save, **1 en memoria** en las 125 capturas |
| +105 | Modo estrategia | 0 Manual, 1 Semi-automático |
| +106 | Lanzador de córner izquierdo (marca **I** de la columna SE) | **índice de plantel** 0..31 |
| +107 | Lanzador de córner derecho (marca **D** de la columna SE) | **índice de plantel** 0..31 |
| +108 | Tiro libre largo (TL L) | **índice de plantel** 0..31 |
| +109 | Tiro libre corto (TL C) | **índice de plantel** 0..31 |
| +110 | Penal (PK) | **índice de plantel** 0..31 |
| +111 | Capitán | **índice de plantel** 0..31 |

Capitán y lanzadores **no** guardan la casilla sino el índice de plantel (0–31)
del jugador; la pantalla lo muestra en la casilla donde ese índice esté en el
orden `rec+4..35` (VIVO3, ver [la prueba](#capitán-y-lanzadores-son-índices-de-plantel)).
En cambio `libero` (`+165`, `rec+277`) y `rivalMarcado` (`+153..163`) sí son
casillas.

Códigos de estrategia de los botones (`rec+100..103`): 0 Sin estrategia, 1
Normal, 2 Ataque centro, 3 Ataque derecha, 4 Ataque izquierda, 5 Ataque al lado
opuesto, 6 Cambio de banda, 7 Desborde DC, 8 Zona de presión, 9 Contraataque,
10 Fuera de juego, 11 Alineación A, 12 Alineación B. En modo semi-automático los
mismos cuatro bytes son L2, AUTO1, AUTO2 y AUTO3.

> **Córners (evidencia de la imagen, no de la `desc`):** la serie `k_l*` mueve
> un solo lanzador de córner. En `k_l4.bin` `rec+106` pasa de 8 a 6 y `rec+107`
> sigue en 8; en `k_l4.png` la columna SE muestra **I** en Freier (casilla 6) y
> **D** en Schneider (casilla 8). Por lo tanto `rec+106` es el córner
> **izquierdo** y `rec+107` el **derecho**. La `desc` de `k_l4` («SE: columna
> derecha; X en Schneider (D), mover a Freier») describe el recorrido del
> cursor, no la columna que se estaba editando, y por eso la primera lectura
> (PESMAP2) invirtió las dos filas.

### Capitán y lanzadores son índices de plantel

Las seis filas `rec+106..111` (córner I, córner D, TL largo, TL corto, penal y
capitán) guardan el **índice de plantel (0–31)** del jugador, no la casilla
donde está. La pantalla lo enseña en la casilla que ese índice ocupa en el
orden `rec+4..35`. Prueba en el juego (VIVO3, partido empezado, Köln):

- **Sustitución.** Entró Bade (índice 11) por Madsen (índice 9, que era capitán
  y lanzador de penales). El juego dejó `rec+110` (PK) y `rec+111` (capitán) en
  **11**, y la pantalla muestra a **Bade** (casilla 9, la de Madsen) como capitán
  y lanzador de penales. 11 es el índice de Bade, no una casilla.
- **Intercambio de casillas.** Se intercambiaron las casillas 7 (Feulner,
  índice 7) y 8 (Streit, índice 8): las marcas de córner y tiro libre siguieron
  a **Feulner** a la casilla 8, mientras los bytes `rec+106..109` se quedaron
  en **7**, su índice.
- En la serie `k_l*` el índice y la casilla coincidían (Freier = índice 6 en la
  casilla 6), por eso las primeras lecturas parecían leer casillas.
- Cuando el capitán o un lanzador sale por cambio, **el juego pasa el índice del
  que entra** a esos bytes: no hay que copiarlo a mano.
- `0x39564DA` (pantalla de alineación) puede valer `2` dentro de algunos
  submenús (el selector de líbero). La condición de «abierta» es `!= 0`, no
  `== 1`.

El `libero` (`rec+277`) sigue siendo **casilla** (vale 2 y el líbero es Matip,
índice 1 en la casilla 2) y `rivalMarcado` también es casilla del rival.

### Configuraciones A y B

Son dos bloques de 171 bytes con el mismo formato que el principal. En el save
del club 42 los tres comparten los mismos 7 bytes de ajustes (`+164..170`:
sistema, líbero, nivel, línea, presión, fuera, contraataque).

- **Alineación A / Alineación B** (menú Ajustes estrategia) hacen que los menús
  de formación editen el bloque A o el B en lugar del principal. Comprobado:
  «Alineación B: Config. rápida = Todo ataque» escribe 39 bytes, todos dentro de
  `rec+454..624`; lo mismo con la A dentro de `rec+283..453`. Ninguna toca la
  cabecera.
- La copia **c3** lleva en `c3+38` (`rec+4138`) el bloque que está seleccionado:
  0 = principal, 1 = Alineación A, 2 = Alineación B. Es el selector que usa la
  pantalla; no es un byte fijo (la nota anterior lo daba como «0 fijo»).
- **Copiar a A / Copiar a B** vuelcan el bloque principal sobre el elegido, sin
  diálogo de confirmación y sin tocar nada más. Comprobado: `v020 → v021`
  («Copiar a A» confirmado con X) escribe 6 bytes, todos dentro de
  `rec+283..453`, y deja la A idéntica al principal (171/171); `v010 → v011`
  hace lo mismo con la B (40 bytes dentro de `rec+454..624`, 171/171). En
  `v021.png` y `v011.png` el menú sigue abierto con el cursor en la opción, así
  que la copia no pide confirmación. El par `b200 → b201` no sirve para esto:
  las dos capturas son idénticas (mismo `.bin` byte a byte) y en las dos el
  menú sigue abierto con el cursor en «Copiar a "A"», es decir, la X no llegó a
  registrarse.

## Tabla de códigos de posición

`rec+133+casilla` (y su espejo, ver más abajo):

| Código | Sigla | Código | Sigla | Código | Sigla |
|---|---|---|---|---|---|
| 0 | PT | 14 | CCD | 28 | MP |
| 1 | CT | 15 | DLI | 29 | EI |
| 2 | CT | 16 | DLD | 30 | ED |
| 3 | CT | 17 | CC | 31 | SD |
| 4 | LIB | 18 | CC | 32 | SD |
| 5 | LIB | 19 | CC | 33 | SD |
| 6 | CT | 20 | CC | 34 | SD |
| 7 | CT | 21 | CC | 35 | SD |
| 8 | DI | 22 | CIZ | 36 | DC |
| 9 | DD | 23 | CDR | 37 | DC |
| 10 | CCD | 24 | MP | 38 | DC |
| 11 | CCD | 25 | MP | 39 | DC |
| 12 | CCD | 26 | MP | 40 | DC |
| 13 | CCD | 27 | MP | 41..255 | inválido (vacío) |

Los varios códigos con la misma sigla son la zona (izquierda / centro /
derecha); el código lleva posición **y** variante. El juego recalcula los
códigos al cambiar el sistema defensivo o el líbero: en `l002 → l003`
(confirmar la lista con Castro de líbero) pasan `12→10`, `26→28`, `35→31`,
`36→38` y además `7→6`, `7→1`, `7→2` en la línea. La tabla coincide con la hoja
`labels/sheet.png` (0..40 con sigla, 41..50 vacíos).

## Banca, reservas y momentos de edición

El orden (`rec+4..35`) es una permutación de los 32 índices del plantel. La
casilla decide qué papel tiene cada jugador:

| Casillas | Grupo | Uso |
|---|---|---|
| 0..10 | **Titulares** | Los 11 que empiezan; son los que tienen formación, flechas, actitud y marcaje |
| 11..22 | **Banca** | Los 12 suplentes convocados; de aquí salen los cambios |
| 23..31 | **Reservas** | Completan el plantel; no entran en el partido |

El menú de alineación solo existe **con el juego detenido**: antes del partido,
en pausa o en el entretiempo. Con el balón en juego no se abre.

- **Antes del partido**, «Cambios» intercambia directamente las casillas del
  orden `rec+4..35` (y sus copias `911` y `4104`).
- **En partido**, el cambio no toca el orden: se apunta en la cola `rec-20`
  (entra), `rec-19` (sale) y `rec-6` (contador). Solo se puede elegir un
  jugador de la **banca** (11..22); las reservas 23..31 no están disponibles.
  El detalle está en [Cambios en pausa](#cambios-en-pausa-partido-empezado).

## Copias en memoria

| Dirección | Contenido | Cómo se comprobó |
|---|---|---|
| `rec+911` (= `c2+4`, `A+0x38b`) | Copia exacta del orden `rec+4..35` (32 bytes) en **c2** | `a_auto_si` cambia el orden en `+6..14` y la copia en `911+2..911+10` a la vez |
| `rec+4104` (= `c3+4`, `A+0x1004`) | Otra copia exacta del orden, en **c3** | igual, en `4104+2..4104+10` |
| `rec+945..955` (= `c2+38..48`) | Espejo de los 11 códigos de posición (945 = PT y 946..955 = casillas 1..10) | `sp_dd` (135 7→9) escribe `947`; `l003` recorre el espejo entero. Mientras hay líbero el espejo marca `4` (LIB) en la casilla del líbero donde el bloque principal deja `1` (CT). **El array empieza en `945`**, no en `946` |
| `rec+956` (= `c2+49`) | Primer byte del marcaje de c2 (portero); **no** es parte del array de posiciones | en `c000→c001` toma un 36 transitorio y vuelve a 1 |
| `rec+967..977` (= `c2+60..70`) | Espejo del rival marcado (`rec+265..275`) | coincide en las capturas de marcaje |
| `rec+981..1068` (= `c2+74..161`) | Espejo de las flechas de ataque (`rec+147..234`) | `mk0`/`ep0` idénticos byte a byte |
| `rec+1077..1087` (= `c2+170..180`) | Espejo de la actitud defensiva (`rec+243..253`) | `q1` deja los 11 bytes a 1 igual que `243..253`; `f442_A1` los reinicia igual |
| `rec+4138` (= `c3+38`) | **Bloque seleccionado** de c3: 0 principal, 1 Alineación A, 2 Alineación B | `b000` = 2, `b100` = 1, `b200` = 0. La nota anterior lo daba como «0 fijo» |
| `rec+4139..4149` (= `c3+39..49`) | Copia de las posiciones del bloque seleccionado | coincide 1:1 con `rec+133..143` en `p000` y `f442_A1`; **no** sigue los ajustes individuales (`l003`) |
| `rec+4150..4160` (= `c3+50..60`) | Copia de las profundidades (slot 0 fijo a 2, slots 1..10 iguales a `113..122`) | `q1..q7` y `f442` la escriben a la vez que el bloque |
| `rec+4161..4171` (= `c3+61..71`) | `4161` = 52 fijo y `4162..4171` = copia de los laterales (`rec+123..132`) | idem |
| `rec+2194…2241`, `rec+3222…3513` | Estructuras del motor (posiciones/velocidades de los jugadores) que se actualizan al cambiar formación | se mueven con `q1..q7`, `f442`, `i*`, `mk*`, `sp_dd`, `c001`, pero su formato no está mapeado |
| `rec+3622…3973` | Tablas de coordenadas `float32` de la pantalla y del partido (ver [Copias c2 y c3](#copias-c2-y-c3-tablas-float-y-laterales)) | 10 pares propios, 12 de banca, ancla, duplicado y tabla espejada del rival |

La vista previa de **Alineación → Cambio** escribe en el espejo
(`rec+945..955`) y no en el bloque principal: por eso se puede recorrer el
cursor sobre las variantes sin que cambie la alineación; el bloque solo cambia
al confirmar.

> `rec+2946..2988` queda **fuera** de esta tabla: no es una estructura del
> motor sino estado de interfaz del menú (ver [Zonas de interfaz a
> ignorar](#zonas-de-interfaz-a-ignorar)).

## Copias c2 y c3, tablas float y laterales

Resumen de [`mapa-vivo/COPIAS.md`](mapa-vivo/COPIAS.md). `A = rec + 4` es el
orden; las direcciones son estables entre reinicios (comprobadas en cuatro
volcados y dos series de capturas).

| Copia | FKC (club 42) | GAF (club 5) |
|---|---|---|
| **c2** = `rec+0x38B` | `0x39572E9` | `0x395BF3D` |
| **c3** = `rec+0x1004` | `0x3957F62` | `0x395CBB6` |
| tabla float propia = `rec+3622` | `0x3957D84` | `0x395C9D8` |
| tabla float duplicada = `rec+3806` | `0x3957E3C` | `0x395CA90` |
| tabla float del rival = `rec+3894` | `0x3957E94` | `0x395CAE8` |

**c2, la copia de la pantalla.** Lleva orden en `+4`, códigos de posición en
`+38..48`, tipo de marcaje en `+49..59`, rival en `+60..70`, flechas en
`+74..161` y actitud defensiva en `+170..180`. Se escribe **antes de
confirmar** en los flujos de previsualización (sistema defensivo con el menú
abierto, lista de ajustes, esquema en hover): en 27 de 125 capturas no coincide
con el registro, y son justo los estados de previsualización. En los flujos de
esquema puede quedarse con las flechas o la actitud anteriores, así que no se
usa para leer un ajuste ya confirmado.

**c3, la copia de la configuración seleccionada.** Lleva orden en `+4`, el
bloque seleccionado en `+38` (0 principal / 1 A / 2 B), posiciones en `+39..49`,
profundidad en `+50..60` (la casilla 0 vale siempre 2), `0x34` fijo en `+61`,
laterales en `+62..71`, marcaje en `+104..114`, rival en `+115..125`, una rampa
`0..10` en `+126..136`, flechas en `+140..227` y actitud en `+237..247`. Sigue
al bloque elegido, no al principal (`b000` muestra B, `b100` A y `b200` el
principal). Va por detrás del registro en 11 capturas de posición, 2 de
profundidad y 3 de lateral, siempre en la vista previa o justo después de
confirmar: **no se resincroniza en el acto**.

**Tablas de coordenadas `float32`.** Ocupan `rec+3622..3973`:

| Rango | Contenido | Pares |
|---|---|---|
| `rec+3622..3701` | tabla del equipo (casillas 1..10, sin portero) | 10 |
| `rec+3702..3797` | fila de banca, todos con `y = 103` | 12 |
| `rec+3798..3805` | par «ancla» del equipo | 1 |
| `rec+3806..3885` | duplicado exacto de `rec+3622..3701` | 10 |
| `rec+3886..3893` | par ancla del rival (espejado) | 1 |
| `rec+3894..3973` | tabla del rival (espejada) | 10 |

Con `p = profundidad` y `l = lateral`:

```
x = p · 157/48        y = l · 95/104
x' = 157 − x          y' = 95 − y        (visitante espejado)
```

La diferencia máxima entre la tabla y la fórmula es `1,0·10⁻⁵` (redondeo de
`float32`). La fila de banca del local es `y = 103`, `x = 4 + 8·i`; en el
visitante, `x = 154 − 8·i`. El ancla propia es `(p=2, l=52)` → `(6,54167 /
47,5)` y su espejo del visitante `(150,45833 / 47,5)`. Las dos copias propias
son idénticas byte a byte. La tabla **sigue a c3** (vista previa): cambia con
`ep_up`, `ep_right`, `f442_hover` y los bloques A/B, y puede quedar desfasada
si el cambio no vino del menú de formación (en el volcado de partido `h0` la de
GAF quedó con el lateral anterior).

**Las 7 copias de los laterales de GAF.** En el volcado de partido `h0` el
array antiguo de laterales (`63,40,85,18,57,36,65,85,22,53`) aparece en siete
direcciones: `0xFF167E` y `0xFF16D3` (dos bloques compactos de 85 bytes),
`0x395B1CD` (copia del save), `0x395B3D6` (bloque de 21 bytes en
`rec-0x7DC`), `0x3B8E665` y `0x3B90F9F` (bloques con formato del registro) y
`0xD84D867` (registro dentro de una tabla de equipos). En los volcados de menú
(`g0..g2`) el lateral vigente aparece en `0x395B1CD`, `0x395B3D6`, `0x395BC2D`
(registro), `0x395CBF4` (`c3+62`), `0x3B90F9F`, `0xD454867` y `0xDACB103`. Son
**copias, no fuentes**: cambiar el lateral en el registro y en esas copias no
mueve el punto de la línea de marcaje. En `h0` todas conservan el lateral del
save aunque el registro ya tenga otro. Para reconstruir la alineación se leen
el registro y, si hace falta la pantalla, c3; estas copias se ignoran.

## Línea de marcaje

La línea que une al jugador con el rival al que marca se dibuja con las
coordenadas de las tablas `float`, **no** con el byte del rival leído al vuelo:

- el punto del jugador propio sale del par de `rec+3622..3701` (o de su
  duplicado `rec+3806..3885`), indexado por la casilla;
- el punto del rival sale de la tabla espejada `rec+3894..3973`, en la casilla
  que indica `rec+265+c`;
- `rec+265+c` solo dice **a qué casilla** del rival se marca (255 = ninguno);
  la posición de esa casilla sale de la tabla del rival, no del byte.

Por eso la línea puede quedar un paso por detrás si el cambio de lateral o
profundidad no vino del menú de formación: las tablas siguen a `c3`/a la
previsualización y no se recalculan con cualquier escritura del registro. Las 7
copias de laterales de GAF tampoco se leen para dibujar.

## Búferes de pantalla y temporales

Direcciones absolutas; existen mientras el juego está en la pantalla de
alineación.

| Dirección | Uso | Evidencia |
|---|---|---|
| `0x395886d` | Línea defensiva pendiente (0 A / 1 B / 2 C) | `e000..e003` la mueven 1→0→2→1 con rec+279 quieto; `t002` copia el valor a `rec+279` |
| `0x395886e` | Zona de presión pendiente | `e010..e013` la mueven 0→2→1→0 con rec+280 quieto; `v001` copia 2 a `rec+280` |
| `0x395886f` | Fuera de juego pendiente | vale 2, 1, 0, 2 en `e020..e023` (el registro no cambia); `v001` copia 1 a `rec+281` |
| `0x3958870` | Contraataque pendiente | vale 1, 0, 2, 1 en `e030..e033`; `v001` copia 0 a `rec+282` |
| `0x395885e..0x39588e7` | Bloque de trabajo de la pantalla de ajustes: se llena al abrir el menú y se vacía al cerrarlo. Al abrirlo refleja los cuatro ajustes actuales (`1,0,2,1`) | diffs `p006→p008` (se llena) y `p008→p009` (se vacía) |
| `0x3958b18` | Líbero pendiente (casilla) | `l000 → l002` la mueve 1→2→3; `l003` copia 3 a `rec+277` |
| `rec+644` / `rec+645` | **Fila** (`644`) y **casilla bajo el cursor** (`645`) de la pantalla Lanzador/Capit. No son una copia del capitán: coinciden con el capitán solo porque esa pantalla está abierta | `k_l0..k_l5` mueven 645 con el lanzador y dejan 644 con la fila; `k_cap0`/`k_cap1` lo mueven con el capitán. En `k_cap1` cambian además `rec+646` (0→1) y `rec+661` |
| `rec+642` | Casilla del jugador con el foco (no el resultado confirmado) | `2` Yunifantino, `8` Freier, `12` fila de banca en `c001`; en `l003` el líbero queda en 3 y `642` sigue en 1 |
| `rec+639`, `+658`, `+661`, `+675`, `+678`, `+679` | Estado de la pantalla del equipo que se edita: panel/diálogo abierto (`639`), opciones del diálogo de marcaje (`658`), bandera de repintado (`661`), huella derivada (`675`), foco de lista (`678`/`679`). No son ajustes | solo se mueven en FKC; GAF queda a 0 |
| `rec+724..766` | Búfer de la pantalla de Config. individual: dirección marcada, flechas, número de opciones, casilla en foco (duplica `642`), centinela 255 e ids de la lista | se llena en `i*`, `ep*`, `mk*`, `sp*`, `d*`, `m*` y en `c001`; en el resto queda a 0 |
| `rec+2502` / `rec+2504` | Profundidad y lateral que se están editando | `ep_right` deja 2502=3; `ep_up` deja 2504=61; `ep_ok` los pasa a `rec+114` y `rec+124` |

## Cambios en pausa (partido empezado)

Los cambios no tocan el orden: quedan en cola justo antes del registro.

| Offset | Campo | Valor observado |
|---|---|---|
| `rec-20` | Entra | índice de plantel del que entra (12, fila de banca) |
| `rec-19` | Sale | índice de plantel del que sale (9) |
| `rec-6` | Contador de cambios | 0 → 1 |
| `rec-36` | Configuración activa | 0 principal, 1 Alineación A, 2 Alineación B (`b000` = 2, `b100` = 1, `b200` = 0) |

El entrante queda además en `rec+642` (12, la fila de banca en foco) y el juego
mantiene copias en `rec+1826/1827`; el contador se refleja en `rec+1840`.
`rec+641` solo se movió una vez (0 → 2 → 0) y no se interpreta. Solo se puede
elegir un jugador de la banca (casillas 11..22); las reservas 23..31 no entran
en el partido. Antes del partido, en cambio, «Cambios» intercambia directamente
las casillas del orden `rec+4..35` (y sus copias).

Cuando el que sale era **capitán o lanzador**, al aplicar el cambio el juego
escribe el **índice de plantel del que entra** en `rec+106..111` (VIVO3). Es
decir, esos bytes siguen al jugador que ocupa el puesto, no a la casilla: en el
caso real, Madsen (índice 9) salió por Bade (índice 11) y penal y capitán
pasaron a 11.

## Lo que reescribe cada menú

| Acción | Bytes del registro que cambia | Notas |
|---|---|---|
| Alineación auto. → Sí | solo el orden `4..35` (y sus copias `911`, `4104`) | `a000 → a_auto` (antes de responder) no cambia nada |
| Config. rápida (7 preajustes) | `113..122`, `147..242`, `243..253`, `278..282` y el byte `145` | ningún byte de `112`, `123..143` ni `254..277`; los siete preajustes tocan subconjuntos distintos |
| Alineación → Cambio (variante) | profundidad `113..122`, lateral `123..132`, posiciones `135..143`, reinicia flechas (`147..242`) y actitudes (`244..253`) | la vista previa solo escribe el espejo `945..955` (la casilla 0 se queda en PT) |
| Config. individual (actitud atacante) | 8 bytes de la casilla en `147+8c` | al marcar la dirección con X; la diagonal (↗, índice 3) es su propio bit, no la suma de ↑ y → |
| Config. individual (actitud defensiva) | `243+c` | al elegir |
| Config. individual (marcaje) | `254+c` y `265+c` | una captura por detrás |
| Editar posición | `112+c` (profundidad) y `122+c` (lateral) | al confirmar |
| Selec. posición | `133+c` y el espejo `945+c` | al instante |
| Lanzador / capitán | `106` (córner izq.), `107` (córner der.), `108`..`110` / `111`; el cursor de la lista vive en `644`/`645` | al instante (índice de plantel; el cursor no es copia del capitán) |
| Estrat. equipo (línea, presión, fuera, contraataque) | `279..282` (desde los búferes `0x395886d..0x3958870`) | al confirmar: `t002` escribe solo `279` y `v000 → v001` escribe `280..282` de una vez |
| Alineación A/B y Copiar a A/B | bloque `283..453` (A) o `454..624` (B), 171 bytes; selector en `4138` (`c3+38`) | Elegir A/B cambia el bloque que editan los menús; copiar vuelca el principal sin diálogo |

## Zonas de interfaz a ignorar

Resumen de la sección 4 de
[`mapa-vivo/SIN_IDENTIFICAR.md`](mapa-vivo/SIN_IDENTIFICAR.md). No son ajustes:
el juego las reconstruye al abrir o cambiar de pantalla y no sirven para
reconstruir la alineación.

| Zona | Qué hay | Prueba |
|---|---|---|
| `rec+2900..3200` | Estado del menú: fila del cursor (`2919`), número de filas (`2920`), flags de filas habilitadas, punteros al heap (`2934..2993`, `3050..3057`), tablas de opciones (`3014..3046`, `3078..3125`) y estado del panel derecho | Siete transiciones (`p001`, `p006`, `p010`, `l000`, `t000`, `a_auto`, `v020`) cambian solo estas zonas, sin tocar ningún byte del registro |
| `rec+5486..5541` | Tabla de 13 punteros a objetos del menú (separados `0x130`) y un nulo final | Se mueve con las mismas transiciones de pantalla |
| `rec+639`, `641`, `642`, `645`, `658`, `661`, `675`, `678`, `679`, `724..766` | Indicadores de panel, foco, opciones, repintado, huella derivada y búfer de Config. individual (ver [Búferes](#búferes-de-pantalla-y-temporales)) | Solo cambian en FKC, el equipo que se edita; GAF queda a 0 durante toda la serie |
| `rec-35..-25`, `rec-24..-21`, `rec-5..-1` | Once flags `01` y centinelas `FF` constantes en los dos equipos | No cambian con ninguna acción |
| `rec-42` | `255` hasta `s000` y `3` desde ahí, en los dos equipos | Cambia con el reinicio del proceso (pid 6112 → 14832), no con el menú |

En GAF las dos primeras zonas solo se mueven en `s000` (el reinicio), 15 y 36
bytes respectivamente: son relocalizaciones de punteros, no ajustes. **No** hay
que leerlas para reconstruir la alineación ni para decidir qué menú se tocó.

## Controles de teclado

Según la configuración de teclado de jugador 1 del coordinador (`settings.exe`).
No se puede comprobar desde la memoria: es la interfaz.

Flechas = mover; X = ✕ (confirmar); W = △ (atrás); A = □; D = ○; Q = L1; E = R1;
Z = L2; C = R2; Espacio = Start; F1 = Select.

## Árbol del menú (previo al partido y pausa)

```
Comienzo del partido (en pausa: Salir)
Cambios
Alineación
  Cambio        [esquema → variante A-1…C-6]
  Editar posición
  Selec. posición
  Alineación auto. [Sí / No]
Ajustes equipo
  Nivel Ataq./Def.
  Sist. defensivo
  Estrat. equipo [Línea, Presión, Fuera de juego, Contraataque]
  Lista de ajustes [+ Líbero]
Ajustes estrategia
  Manual / Semi-automático / Alineación A / Alineación B / Copiar a A / Copiar a B
Config. individual  (por jugador)
  Actitud atacante   [8 flechas]
  Actitud defens.
  Config. marcaje    [zonas / al hombre + rival]
  Editar posición
  Selec. posición
Lanzador/Capit
  Selecc. lanzador   [TL corto, TL largo, SE izq, SE der, PK]
  Elegir capitán
Config. rápida   (7 preajustes)
Almacenar        (no se toca: lo hace Luis)
Ayuda
```

## Sin identificar

| Qué | Observación |
|---|---|
| `rec+104` | 0 en el save y **1** en todas las capturas; se pone a 1 al cargar la partida. Es una bandera de ejecución, no un ajuste |
| `rec+144..146` | siempre 0 en el save; la Config. rápida escribe `rec+145` |
| `rec+235..242` | 8 bytes **después** de las flechas (no un duodécimo grupo): cambian con Config. rápida y con `c001`, pero la pantalla solo muestra 11 casillas |
| `rec+956` | no es el final del array de posiciones: es `c2+49`, el primer byte del marcaje (portero). En `c000→c001` toma 36 de forma transitoria y vuelve a 1 |
| `rec+661` | bandera 0/1: cambia al confirmar los ajustes de equipo (`t002`) pero también al abrir o cerrar otros menús, así que no identifica a los ajustes |
| `rec+641` | solo se movió una vez: `c001` = 2 y vuelve a 0; puede ser contador de cambios o estado del diálogo, no se afirma |
| `rec+276 = 3` | cuarto valor del sistema defensivo, visto solo al confirmar la lista del líbero |
| `rec+626..627` | difieren entre el save (107 y 0) y la memoria (10 y 255); sin identificar |
| `rec+0..2` | en memoria el código del club está a `FF FF FF` (el save guarda `FKC` / `GAF`) |
| `rec+4138` | **no** es fijo: es el selector de bloque de c3 (0 principal, 1 A, 2 B) |
| `rec+4161` | fijo a 52 (`c3+61`), junto a la copia de laterales |
| `rec-38` | constante 8 en FKC y 0 en GAF; ninguna acción del menú lo mueve |
| `c2+36..37` / `c3+36..37` | `0x1D 0x17` en los volcados de menú; `0x17 0x17` en el volcado de partido y desde `s000` (cambia con el reinicio del proceso, no con una acción) |

Los dos pendientes que quedaron aclarados son `rec+283` (primer byte de la
Alineación A, no el fin del bloque principal) y `rec+104` (bandera de
ejecución). Los bytes de estado de pantalla (`641`, `661`, `956`, `4138`,
`4161`, `c2+36..37`) viven fuera del registro guardado o son copias de
ejecución: no se guardan en el option file ni se usan como ajuste.

## Herramientas

Todas son de **solo lectura**: no escriben en el juego, en el save ni en las
capturas.

| Archivo | Uso | Qué hace |
|---|---|---|
| `tools/pes5/pes5-live-map.json` | `node tools/test-pes5-live-map.js` | Mapa máquina-legible de campos, codificaciones y bloques; el test lo valida y decodifica el save y una captura |
| `tools/pes5/live-lineup-read.py` | `python tools/pes5/live-lineup-read.py [--buscar \| --desde-bin <captura.bin>]` | Lee el registro del proceso (o de una captura) y lo imprime en JSON |
| `tools/pes5/live-map-analyze.js` | `node tools/pes5/live-map-analyze.js <carpeta> [--desde <label>] [--md <salida.md>]` | Compara capturas consecutivas y lista los bytes que cambian, con su campo |
| `tools/pes5/verify-live-map.js` | `node tools/pes5/verify-live-map.js --serie <carpeta>` | Comprueba fila por fila las notas de este documento contra las capturas y el save |
| `tools/pes5/live-unknown-scan.js` | `node tools/pes5/live-unknown-scan.js <carpeta> [--campo rec+642] [--zona rec+2900..rec+3200] [--md <salida.md>]` | Sigue un byte o rango en toda la serie y dice con qué captura cambia |
| `tools/pes5/live-copies-check.js` | `node tools/pes5/live-copies-check.js <carpeta> [--mem <volcados>] [--save <archivo>]` | Verifica c2, c3, la copia del save, el espejo de posiciones y las tablas float, y busca las 7 copias de laterales |
| `tools/test-pes5-live-map.js` | `node tools/test-pes5-live-map.js [--save <option file>] [--serie <carpeta>]` | Valida `pes5-live-map.json`, descifra el save (solo lectura) y decodifica `k_l5.bin` |

La carpeta de capturas es la serie etiquetada del coordinador (`index.json` +
`<label>.bin`, 0x30000 bytes desde `0x3940000`).

## Verificación de las notas del coordinador

`node tools/pes5/verify-live-map.js --serie <carpeta>` recorre las capturas y
comprueba byte a byte cada fila. Resultado con la serie entregada (125 capturas:
119 de la sesión original más las 6 de verificación extra `v000`…`v021`):

| Fila de las notas | Estado | Detalle |
|---|---|---|
| Nivel Ataq./Def. `rec+278` | **VERIFICADO** | p001..p005 = 2, 0, 1, 3, 2 |
| Sist. defensivo `rec+276` | VERIFICADO CON RESERVA | 0/1/2 confirmados, pero varias capturas leen la selección anterior y aparece un 3 tras el líbero |
| Línea defensiva `rec+279` | **VERIFICADO** | no cambia con el menú abierto; cambia al confirmar, con el valor del búfer `0x395886d` |
| Zona de presión `rec+280` | **VERIFICADO** | el búfer `0x395886e` barre 0→2→1→0 con `rec+280` quieto en e010..e013 (en `e011.png` la pantalla ya muestra C); al confirmar, `v000 → v001` escribe `rec+280` 0→2 |
| Fuera de juego `rec+281` | **VERIFICADO** | el búfer `0x395886f` vale 2, 1, 0, 2 en e020..e023 sin escribir el registro; `v000 → v001` lo escribe 2→1 |
| Contraataque `rec+282` | **VERIFICADO** | el búfer `0x3958870` vale 1, 0, 2, 1 en e030..e033 sin escribir el registro; `v000 → v001` lo escribe 1→0 |
| Orden `rec+4..35` + copias | **VERIFICADO** | copias exactas en `911` (`c2+4`, `A+0x38b`) y `4104` (`c3+4`, `A+0x1004`) |
| IDs del plantel `rec+36..99` | **VERIFICADO** | 32/32 iguales al plantel del save, en los dos clubes |
| Formación (prof/lat/pos) | **VERIFICADO** | 112..143 idénticos al save en p000 |
| Líbero `rec+277` | **VERIFICADO** | búfer 1→2→3 y escritura al confirmar |
| Códigos de posición y copia | **VERIFICADO** | recálculos 12→10, 26→28, 35→31, 36→38 y espejo desplazado una casilla |
| Estrategia manual `rec+100..103` | VERIFICADO CON RESERVA | offsets y dos reasignaciones comprobadas; solo se ven los códigos 2, 3, 4, 7, 8, 9 |
| Modo `rec+105` | VERIFICADO CON RESERVA | 0 Manual / 1 Semi-automático; el rótulo L2/AUTO1-3 es interfaz |
| Bandera `rec+661` | VERIFICADO CON RESERVA | cambia en t002, pero también en otros menús |
| Flechas `rec+147+8c` | **VERIFICADO** | orden de los 8 bytes confirmado en los índices 0, 2, 3, 4 y 6 |
| Actitud defensiva `rec+243+c` | VERIFICADO CON RESERVA | 0 Alto, 1 Normal, 2 Bajo; dos capturas con el valor anterior |
| Editar posición `rec+112/122+c` | **VERIFICADO** | 2→3 (profundidad) y 63→61 (lateral) al confirmar |
| Config. marcaje `rec+254/265+c` | VERIFICADO CON RESERVA | 0..3 (Marcaje / zonas / hombre normal / agresivo) y rival 10; en `m02` el tipo es 3 y en `m04`, 2. El rival se conserva al volver a zonas |
| Selec. posición `rec+133+c` | **VERIFICADO** | 7→9 en el bloque y en el espejo (rec+947) |
| Capitán `rec+111` | **VERIFICADO (índice)** | VIVO3: con la sustitución de Madsen (índice 9) por Bade (índice 11) el juego dejó `rec+111` = 11 y la pantalla muestra a Bade en la casilla 9; `rec+645` es la casilla del cursor de Lanzador/Capit, no una copia |
| Córner izquierdo `rec+106` | **VERIFICADO (índice)** | `k_l3 → k_l4`: `rec+106` 8→6; en `k_l4.png` la columna SE muestra **I** en Freier (índice 6) y **D** en Schneider (índice 8), y `rec+107` = 8. Con las casillas 7/8 intercambiadas el byte siguió en 7 (índice de Feulner) |
| Córner derecho `rec+107` | **VERIFICADO (índice)** | `rec+107` vale 8 en todas las capturas de lanzadores (`k_l0..k_l5`, nunca se movió) y en `k_l4.png` la **D** (Schneider, índice 8) coincide con ese 8; la **I** de Freier (índice 6) es el valor de `rec+106` |
| TL largo `rec+108` | **VERIFICADO (índice)** | 8→9 |
| TL corto `rec+109` | **VERIFICADO (índice)** | 8→7 |
| Penal `rec+110` | **VERIFICADO (índice)** | 10→9; con Bade por Madsen quedó en 11 y la pantalla lo muestra como lanzador de penales |
| `rec+104 = 1` | **VERIFICADO** | 1 en las 125 capturas, 0 en el save |
| Config. rápida | **VERIFICADO** | solo escribe `113..122`, `147..242`, `243..253`, `278..282` y `145` |
| Alineación auto. | **VERIFICADO** | solo el orden |
| Tabla de códigos | **VERIFICADO** | coherente con `labels/sheet.png` |
| Alineación → Cambio | VERIFICADO CON RESERVA | la vista previa escribe solo el espejo; la variante escribe prof/lat/pos y reinicia flechas y actitudes |
| Configuraciones A y B | **VERIFICADO** | la B escribe dentro de `454..624` y la A dentro de `283..453`, sin tocar la cabecera |
| Copiar a A/B | **VERIFICADO** | `v020 → v021` deja la A idéntica al principal escribiendo solo `283..453` (6 bytes); `v010 → v011` hace lo mismo con la B (`454..624`, 40 bytes). Sin diálogo de confirmación |
| Cambios en pausa | **VERIFICADO** | `rec-20` = 12, `rec-19` = 9, `rec-6` = 1 |
| Espejo de posiciones `rec+945..955` | **VERIFICADO** | el array empieza en `945` (= `c2+38`); `946..955` son las casillas 1..10 y `956` es `c2+49` |
| Cursor Lanzador/Capit `rec+644/645` | **VERIFICADO** | `644` = fila y `645` = casilla del cursor en `k_l0..k_l5` y `k_cap0/k_cap1` |
| Selector de c3 `rec+4138` | **VERIFICADO** | `b000` = 2, `b100` = 1, `b200` = 0 |
| Tablas float `rec+3622..3973` | **VERIFICADO** | `x = p·157/48` e `y = l·95/104` (diferencia ≤ 1,0·10⁻⁵), duplicado y espejo del rival |
| Configuración activa `rec-36` | **VERIFICADO** | `b000` = 2, `b100` = 1, `b200` = 0 |
| Zonas de interfaz | **VERIFICADO** | siete transiciones cambian solo `+2900..3200`/`+5486..5541`, sin tocar el registro |
| Copias de laterales de GAF | **VERIFICADO** | siete direcciones con el array del save; cambiarlas no mueve la línea de marcaje |
| Guaraní (GAF) | **VERIFICADO** | cabecera (salvo `rec+104`), ajustes y posiciones iguales al save del club 5 |

Resumen: 34 filas verificadas, 7 con reserva, ninguna refutada y ninguna sin
comprobar con estas capturas (las filas que dependen del option file, como IDs y
Guaraní, quedan sin verificar si no se puede leer el save).

### Comparación con el save

El registro en memoria y el del option file son el mismo objeto:

- **p000** (antes de tocar nada): el orden `4..35` (en FKC), `112..143`,
  `147..275`, `276..282` y los bloques A y B son **idénticos** al save de su
  club. Solo difieren el código del club (a `FF FF FF`), el tramo `36..99` (el
  save lo guarda a 0 y la memoria tiene los 32 ids del plantel), `rec+104`
  (0 → 1) y `rec+626..627`.
- En GAF el orden del banquillo (`+20..31`) sí difiere del save: la partida
  reordena los suplentes al montar el encuentro.
- Tras toda la sesión (**c001**, 127 bytes distintos del save en FKC) todos los
  bytes que cambiaron caen dentro de los tramos documentados: cabecera,
  profundidad/lateral/posiciones, flechas, actitudes, rival marcado, línea y
  orden. Ninguno fuera.
- Valores del save decodificados con la nota (lanzadores en el orden SE izq. /
  SE der. / TL largo / TL corto / PK):
  - FKC (club 42): botones □ Ataque centro, △ Ataque izqda, ○ Ataque drcha,
    ✕ Desborde DC; modo Manual; capitán 5; lanzadores 8/8/8/8/10; nivel Normal,
    sistema Normal, línea B, presión A, fuera C, contra B. Principal
    PT CT CT CT CT CCD MP SD ED DC EI; A y B `PT CT CT DD DI CCD CDR CIZ MP DC DC`.
  - GAF (club 5): botones □ Sin estrategia, △ Zona presión, ○ y ✕ Sin
    estrategia; modo Semi-automático; capitán 1; lanzadores 8/8/7/7/7; nivel
    Normal, sistema Normal, líbero 1, línea B, presión A, fuera B, contra C.
    Principal `PT CT CT DD DI CCD CC MP ED EI DC`; A y B
    `PT CT CT DD DI CC CC CDR CIZ DC DC`.

## Lector en vivo

`tools/pes5/live-lineup-read.py` (Python 3, solo `ctypes`):

```bash
python tools/pes5/live-lineup-read.py                    # PES5.exe abierto
python tools/pes5/live-lineup-read.py --buscar           # localiza los rec con el save
python tools/pes5/live-lineup-read.py --desde-bin captura.bin
python tools/pes5/live-lineup-read.py --equipo FKC --clubes FKC=42
```

- **Solo lectura:** `OpenProcess(PROCESS_VM_READ | PROCESS_QUERY_INFORMATION)`,
  `ReadProcessMemory` y `VirtualQueryEx`. No hay ninguna llamada de escritura y
  no abre el option file en modo escritura.
- Sin `--buscar` lee las direcciones por defecto de la tabla de arriba.
- `--buscar` toma del save los 3 primeros ids u16 del plantel del club, busca ese
  patrón en las regiones legibles del proceso y retrocede 36 bytes hasta el
  inicio del registro; descarta los candidatos cuyo orden no sea una permutación
  de 0..31 o cuyos 32 ids no coincidan con el plantel del save.
- `--desde-bin` decodifica una captura congelada (0x30000 bytes desde `--base`,
  por defecto 0x3940000) sin abrir el proceso.
- Si `PES5.exe` no está abierto sale con código 1 y un mensaje que remite a
  `--desde-bin`.
- JSON: `origen` (proceso/pid o archivo), y por equipo `rec`, `orden`
  (casilla → índice de plantel e id), `cabecera` (botones, modo, lanzadores
  `corner_izquierda_106`, `corner_derecha_107`, `tiro_libre_largo_108`,
  `tiro_libre_corto_109` y `penal_110`, y capitán; cada uno con
  `indice_plantel`, `id` y la `casilla` donde está ese índice), y
  `formaciones.principal/A/B` con los 11 slots (profundidad, lateral, código y
  sigla de posición, flechas de ataque, actitud defensiva, marcaje y rival) y
  los ajustes del bloque.

Probado el 24-11-2026 con `PES5.exe` abierto (pid 14832): las dos vías
(direcciones por defecto y `--buscar`) devuelven el mismo registro, coherente
con la última captura de la serie (`c001`), y `--desde-bin` reproduce `p000`.

## Cómo se verificó al final

```bash
node tools/test-pes5-live-map.js
node tools/pes5/verify-live-map.js --serie <carpeta de capturas>
python tools/pes5/live-lineup-read.py --desde-bin <captura>.bin
```

`test-pes5-live-map.js` valida el JSON y decodifica el save y `k_l5.bin` (debe
terminar en `PES5 LIVE MAP: OK`). `verify-live-map.js` lee `index.json` y los `.bin`, compara captura a captura el
byte o rango que cada nota atribuye a un ajuste y, aparte, descifra el option
file en memoria (`tools/pes5/pes5-crypt.js`) para comparar el registro byte a
byte con el save. No escribe nada.

Control en vivo (estado, lectura y escritura segura): [CONTROL_VIVO.md](CONTROL_VIVO.md).

## Catálogo de esquemas y variantes

El menú **Alineación → Cambio** ofrece 8 esquemas (`4-5-1`, `4-4-2`, `4-3-3`,
`3-6-1`, `3-5-2`, `3-4-3`, `5-4-1`, `5-3-2`; la lista de esquemas agrega
`Cancelar` y `Por defecto`) y, dentro de cada esquema, variantes agrupadas por
letra (`A-n`, `B-n`, `C-n`) y, al final, `Cancelar`.

El catálogo completo —los 11 puestos de cada variante con profundidad, lateral,
código y sigla— está en
[`tools/pes5/pes5-variantes.json`](../../tools/pes5/pes5-variantes.json). El
arquero (casilla 0) no tiene lateral y se guarda como `null`.

| Esquema | Grupos (A + B + C) | Variantes |
|---|---|---|
| 4-5-1 | 6 + 5 | 11 |
| 4-4-2 | 5 + 4 + 6 | 15 |
| 4-3-3 | 4 + 2 + 5 | 11 |
| 3-6-1 | 5 + 6 | 11 |
| 3-5-2 | 6 + 5 | 11 |
| 3-4-3 | 5 + 4 + 6 | 15 |
| 5-4-1 | 5 + 4 + 6 | 15 |
| 5-3-2 | 4 + 2 + 5 | 11 |
| **Total** | | **100** |

Cómo se obtuvo:

1. Se buscó una tabla estática de variantes con los valores de las dos muestras
   (A-1 y A-2 de 4-5-1) en el volcado de memoria de la partida y en `PES5.exe`:
   bytes consecutivos de profundidad/lateral/posición, pares `prof–lat`, orden
   por puesto, `u16`/`u32`, `float32` (coordenadas y valores crudos),
   desplazamientos ±1, multiconjuntos y lateral escalado. Las muestras solo
   aparecen en el registro vivo, así que la tabla no está en el ejecutable ni
   en el volcado y se pasó a la fase 2.
2. Se recorrió el menú en el juego, con el partido en pausa y la pantalla de
   alineación abierta (en el submenú, `0x39564da` = 1). Por cada esquema k y
   variante v: `x` (abrir la lista de esquemas), `down` × k, `x` (abrir la
   lista de variantes), `down` × (v−1) y `x` (aplicar). Después se leyeron los
   32 bytes del bloque —profundidad `rec+112..122`, lateral `rec+123..132` y
   códigos `rec+133..143`, con `rec = 0x3956f5e` (FKC local)— y se guardó una
   captura por variante.
3. X sobre `Cancelar` no aplica nada y devuelve a la **lista de esquemas** con
   el cursor en el esquema elegido; desde ahí, `down` + `x` abre las variantes
   del siguiente esquema. Esa es la vía para recorrer los 8 esquemas sin salir
   del submenú. Si un `x` deja el cursor en otra entrada (por ejemplo «Selec.
   posición»), una pulsación de △ (atrás) vuelve al submenú sin tocar el
   registro.
4. Las dos muestras del coordinador se reproducen exactamente: al elegir
   `4-5-1 A-1` y `A-2` los bytes leídos coinciden con los del informe. Además,
   ningún código de posición del catálogo es ≥ 41 y todos tienen sigla en la
   [tabla de códigos](#tabla-de-códigos-de-posición).

El script que hace el recorrido y regenera el JSON desde el progreso es
[`tools/pes5/pes5-variantes-scan.py`](../../tools/pes5/pes5-variantes-scan.py)
(`--desde-progreso` no toca el juego; el modo con teclas exige `--ejecutar`).

### Actitud y flechas al aplicar una variante

Elegir una variante no solo escribe profundidad, lateral y código de posición:
también deja **vacías las flechas de ataque** (`rec+147..234`, los 11 grupos de
8 bits) y **reescribe la actitud defensiva** (`rec+243..253`) de los titulares
según su posición (VARACT, 24-11-2026).

Cómo se obtuvo: se repitió el recorrido del catálogo —las 100 variantes, en el
mismo partido en pausa y desde el submenú «Alineación» con el cursor en
«Cambio»— aplicando cada una con `x`/`down` y leyendo, además de los 32 bytes de
formación, los 88 bytes de flechas y los 11 de actitud. Cada lectura se comparó
con el catálogo ya guardado (profundidad, lateral y código coincidieron en las
100) y se exigió leer lo mismo dos veces seguidas antes de darla por buena.
Antes de empezar y después de cada variante se comprobó `0x39564da` = 1
(submenú) y que ningún código de posición fuera ≥ 41.

| Sigla | Códigos vistos | Actitud | Puestos leídos |
|---|---|---|---|
| PT | 0 | 1 Normal | 100 |
| CT | 1, 3, 7 | 0 Alto | 263 |
| DI | 8 | 0 Alto | 63 |
| DD | 9 | 0 Alto | 63 |
| CCD | 10, 12, 14 | 0 Alto | 104 |
| DLI | 15 | 1 Normal | 17 |
| DLD | 16 | 1 Normal | 17 |
| CC | 17, 18, 19, 20, 21 | 1 Normal | 151 |
| CIZ | 22 | 1 Normal | 23 |
| CDR | 23 | 1 Normal | 23 |
| MP | 24, 26, 28 | 1 Normal | 87 |
| EI | 29 | 2 Bajo | 26 |
| ED | 30 | 2 Bajo | 26 |
| DC | 36, 38, 40 | 2 Bajo | 137 |

Las cuatro variantes que ya había mirado el coordinador (4-4-2 B-1, 4-4-2 A-1,
4-3-3 A-1 y 3-5-2 A-1) salen idénticas a su informe: CT/DI/DD/CCD Alto,
CIZ/CDR/MP/DLI/DLD Normal, EI/ED/DC Bajo y el arquero Normal.

La actitud depende **solo de la sigla** (la familia del código de posición):

- Ni el código exacto dentro de la familia, ni la variante, ni el esquema, ni la
  profundidad, ni el lateral, ni la casilla cambian el valor: los 26 códigos que
  aparecen en las 100 variantes dan siempre el mismo número, sin una sola
  lectura distinta en los 1100 puestos.
- **No** sigue a la casilla: la 10 sale siempre Bajo y las 1..3 siempre Alto,
  pero las 4..7 alternan Alto/Normal y las 8..9 Normal/Bajo según qué puesto
  ocupe cada variante.
- **Excepciones: ninguna.** En el JSON, `reglaActitud.excepciones` queda vacío.

Por línea: portero Normal; defensas (CT, DI, DD, CCD) Alto; medios y carrileros
(DLI, DLD, CC, CIZ, CDR, MP) Normal; delanteros y extremos (EI, ED, DC) Bajo.

Sin dato: `SD` (códigos 31..35) y `LIB` (4 y 5) no aparecen en ninguna de las
100 variantes, así que no hay lectura. Por vecindad, SD debería salir Bajo como
DC, pero no está comprobado (`varact.sinDato`).

Flechas: las 100 variantes dejan `rec+147..234` a 0. Como el recorrido es de
solo lectura no se pudieron dejar flechas puestas antes de cada variante, así
que aquí se comprueba que **quedan vacías**; que el juego las borre lo verificó
el coordinador aplicando una variante sobre flechas ya marcadas. Es coherente
con la fila «Alineación → Cambio» de [Lo que reescribe cada
menú](#lo-que-reescribe-cada-menú), que le atribuye el reinicio de `147..242`.

Arquero: `rec+243` vale 1 (Normal) en las 100 lecturas. Esa misma fila dice que
la variante escribe `244..253` (casillas 1..10), así que lo probable es que el
portero conserve su actitud y que ese 1 venga de antes; estas lecturas no
distinguen si la variante también lo escribe.

En el JSON, cada puesto lleva `actitud` y cada variante `flechas: "vacias"`; en
la raíz, `reglaActitud` (sigla → actitud, más `excepciones`) y `varact`
(procedencia, `variantesLeidas`, `variantesConFlechas`, `actitudPorCodigo` y
`sinDato`). El modo `--varact` del script repite el recorrido y `--varact-merge`
vuelca las lecturas en el JSON.

