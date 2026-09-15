# PES5 PC — captura y análisis del option file

## Qué es esto

El save de PES5 PC vive en:
`C:\Users\Administrator\Documents\KONAMI\Pro Evolution Soccer 5\save\folder1\KONAMI-WIN32PES5OPT`

Está **ofuscado**: XOR con una clave repetida de 256 bytes (confirmado — el
porcentaje de ceros al descifrar se estanca exacto en periodo 256). La clave
parece generada por fórmula: el nibble bajo depende solo de `i mod 16`.

**No hace falta romper la ofuscación para analizarla ni para editar.** Al ser
XOR posicional, comparar dos estados del mismo archivo cancela la clave:

```
C1 = P1 XOR K
C2 = P2 XOR K
C1 XOR C2 = P1 XOR P2      <- la clave desaparece
```

Y para escribir vale lo mismo: `C' = C XOR (P XOR P')`.

## Flujo de trabajo

Cada vez que hagas un cambio dentro del juego:

1. Editá en PES5 y **guardá desde el juego**.
2. Cerrá el juego (si queda abierto puede no haber volcado el archivo).
3. Capturá el estado con una etiqueta descriptiva:

```bash
node tools/snapshot.js "fulham-todos-80"
```

Si el archivo no cambió respecto de una instantánea previa, el script lo
detecta y no guarda un duplicado.

4. Comparar dos estados cualesquiera:

```bash
node tools/xor-diff.js snapshots/00-baseline.bin snapshots/01-fulham-todos-80-....bin
```

La columna `XOR` de la salida es **el cambio real del texto plano**, ya sin
ofuscación.

## Instantáneas

- `00-baseline.bin` — estado antes de cualquier edición nuestra.
  md5 `9df2f13150517584b1d813f9a1af61b8`, 1.250.304 bytes.
  Es el option file distribuible (camisetas, logos, datos) tal como lo importó
  el usuario; el juego todavía no había escrito encima.

## Reglas

- **Nunca escribir sobre el save del juego** sin tener antes su instantánea.
- Etiquetas descriptivas: la etiqueta es lo único que después dice qué cambió.
- Una edición conocida por instantánea. Dos cambios mezclados en una captura
  valen mucho menos que dos capturas con un cambio cada una.

---

# ESTADO 2026-08-27 — el cifrado esta ROTO

## El algoritmo (resuelto)

Sale de [PES5-OF-Decrypter de lazanet](https://github.com/lazanet/PES5-OF-Decrypter),
derivado a su vez del PESFan Editor de purplehaze. Implementado en
`tools/pes5-crypt.js` (descifra y cifra). Son dos capas:

```
1) capa PC     : XOR byte a byte con keyPC, 256 bytes, ciclica
2) capa comun  : por bloques, sobre palabras de 32 bits little-endian
                 plano = (cifrado - key[j] + 0x6C371625) XOR 0x6C371625
                 key[] de 367 palabras, ciclica, reiniciada en cada bloque
```

**La trampa que costo una hora:** el constructor de `OptionFile.java` le suma
`1815543808` (= `0x6C370000`) a cada elemento de `key[]` antes de usarla. Sin
ese ajuste se descifra bien la mitad baja de cada palabra de 32 bits y mal la
alta — salen los caracteres pares de cada nombre y los impares no.

Al leer: primero la capa PC, despues la de bloques. Al escribir: checksums,
bloques, capa PC.

## Estructura verificada

| Cosa | Valor |
|---|---|
| Tamaño del archivo | 1.250.304 bytes exactos |
| Bloques | 9, con offsets en `block[]`/`blockSize[]` de `OptionFile.java` |
| Checksums | suma de 32 bits, guardada 8 bytes antes de cada bloque |
| Tabla de jugadores | bloque 4: base **36872** (`0x9008`), 620.000 b |
| Registro de jugador | **124 bytes**, 5000 registros |
| Nombre | `+0x00`, UTF-16LE, 15 caracteres (30 b) |
| Nombre de camiseta | `+0x20`, ASCII |
| Contador de ediciones | `+0x32`, sube +1 por edicion |
| Bloque de atributos | `+0x34` .. `+0x59` (mas `+0x6e`) |

Verificado descifrando: 4627 nombres legibles de 5000. Ronaldinho #999,
Zidane #205, Nedved #2932, Shevchenko #701, Vieira #190, y la plantilla del
Arsenal completa alrededor de #1480-#1492.

## Mapa de atributos — INCOMPLETO

Solo 4 atributos quedaron sin ambiguedad, filtrando por "el valor nuevo
coincide Y el valor viejo es plausible (1-99)":

| Atributo | bit | offset | antes -> despues |
|---|---|---|---|
| Respuesta | 480 | `+0x3C.0` | 82 -> 22 |
| Vel. pase corto | 519 | `+0x40.7` | 80 -> 30 |
| Precision | 544 | `+0x44.0` | 77 -> 37 |
| Resistencia | 690 | `+0x56.2` | 10 -> 42 |

Los otros 22 tienen entre 2 y 8 posiciones candidatas cada uno. **No elegir
una al azar** — ya nos paso en PES4 con dos atributos invertidos.

Las habilidades especiales no se pudieron ubicar: se esperaba un bloque de
~23 bits pasando de 4 encendidos a ~23, y la mejor ventana del registro da
+9. No estan en otro bloque del archivo (el diff completo solo muestra
cambios en el bloque 4 y el checksum).

## Por que quedo incompleto y como se termina

La calibracion mezclo en UN solo guardado: nombre, 30 atributos, 30
habilidades, altura, edad, pie dominante, resistencia a lesiones y
posiciones. Alcanzo para romper el cifrado y fijar la estructura, pero los
campos se estorban entre si a la hora de separarlos.

**Lo que falta son calibraciones aisladas: un tipo de cambio por guardado.**
Ver la seccion de flujo de trabajo mas arriba — la regla de "una edicion
conocida por instantanea" estaba escrita desde el principio y no se siguio.

## Mapa del registro — COMPLETO (2026-08-29)

`pes5-map.json` tiene los **53 campos** ubicados y verificados: 26 atributos de
escala 0-99 (7 bits), 4 de escala 1-8 (3 bits, guardan valor-1) y 23
habilidades especiales (1 bit).

Layout: **4 campos de 7 bits por cada palabra de 32 bits**, en los bits 0-27;
el **nibble alto** de cada dword se usa para banderas de habilidad. Los dwords
van de `+0x38` a `+0x50`. Antes de `+0x38` la estructura es irregular: `Ataque`
en `+0x36.0` y `Defensa` en `+0x36.7`, con 2 bits de relleno antes del dword de
`+0x38`. Los 16 bits de `+0x34`-`+0x35` todavia no estan identificados.

El dword de `+0x50` es el mas denso: `Trabajo en equipo` (640-646), los cuatro
campos de 3 bits (647-658), 2 bits libres, y las ultimas 11 habilidades
(661-671).

**Como se obtuvo:** calibraciones aisladas, un solo cambio por jugador. Las 23
habilidades con la seleccion de Austria (registros #1-#23, un bit cada uno) y
los 7 campos restantes con Belgica (#24-#30). Verificacion 23/23 y 7/7.

**Gotcha util:** PES5 PC vuelca el archivo **al guardar**, no al cerrar. No hace
falta salir del juego para capturar una instantanea (a diferencia de PCSX2 con
las memcards de PS2).

Quedan sin mapear en este punto (2026-08-29): edad, altura, pie dominante,
resistencia a lesiones y posiciones — todos resueltos en las secciones
siguientes (edad/pie/resistencia/posiciones el 2026-08-30, altura el
2026-08-31, ver mas abajo).

## Mapa del registro — AMPLIADO (2026-08-30)

Se agregaron a `pes5-map.json`: Edad (`+0x6d.5`, 5 bits, valor+15), Pie
dominante (`+0x34.0`, 1 bit), Resistencia lesiones (`+0x52.3`, 2 bits), las
12 posiciones (1 bit c/u, estrella amarilla = jugable) y el indice de
posicion registrada (circulo O, `+0x35.5`, 2 bits) — que resulto ser el
rango 0-based de esa posicion entre las marcadas, ordenando por bit
ascendente (de abajo hacia arriba en pantalla), no un ID fijo por posicion.

**Gotcha de esta ronda:** jugadores del roster real suelen venir con varias
posiciones ya marcadas de fabrica — usar solo jugadores con **una sola
posicion** de base para aislar el bit de una posicion nueva, si no el diff
sale con varios rangos de bits mezclados (paso con el primer lote de
Belgica, se soluciono cambiando a jugadores de una sola posicion).

Altura: mapeada el 2026-08-31, ver seccion siguiente.

## Escritura probada end-to-end (2026-08-31)

`tools/write-test.js` hace el ciclo completo: descifrar -> editar un campo
via bits -> `cifrar()` (que recalcula checksums y vuelve a cifrar). Probado
instalando el resultado como save real y cargandolo en PES5 sin problemas.

**Bug real encontrado y corregido en `pes5-crypt.js`** (antes de tocar el
save real — se detecto comparando el round-trip `cifrar(descifrar(x))` contra
`x` sin editar nada, y no coincidia):

- El orden estaba invertido. `OptionFile.java` (`saveXPS`) llama
  `encrypt()` y **despues** `checkSums()` — el checksum se calcula sobre los
  dwords ya cifrados, no sobre el texto plano.
- `checkSums()` en Java arranca en `i=0` (10 bloques, 0..9). `encrypt()`/
  `decrypt()` arrancan en `i=1` (el bloque 0 nunca pasa por el cifrado de
  bloques, pero si tiene su propio checksum en `block[0]-8`).

Con el fix, `cifrar(descifrar(x))` reproduce `x` byte a byte cuando no se
edita nada — verificado.

## Altura — mapeada (2026-08-31)

`pes5-map.json` → `ajustes_basicos.Altura`: bit 704, `+0x58.0`, **6 bits**,
valor almacenado + 148. Verificado el 31/08 con los 4894 jugadores del save
real: campana centrada en ~180 cm, Puskas 172, Romario 169, Berbatov 188. El
bit 710 (`+0x58.6`) no es parte de la altura (es un flag sin relacion que se
colaba en la lectura con el ancho anterior de 7 bits y generaba una
distribucion bimodal de 100-250cm).

## Como se usa ahora

Los 3 JSON estaticos (`pes5-keys.json`, `pes5-map.json`, `pes5-teams.json`) se
movieron a `tsc-src/js/pes5/` (antes vivian en esta misma carpeta) — es la
unica ubicacion; las paginas de `pes5/` y las tools de Node de esta carpeta
los cargan desde ahi.
