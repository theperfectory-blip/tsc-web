# Macro Slice — Editor de save PES4 para Luis · 2026-07-26

> Estado al **2026-07-27**: formato del save descifrado por completo y
> **escritura confirmada dentro del juego** — PES4 carga un Archivo Opciones
> editado por nosotros y muestra los valores nuevos en pantalla. Los dos
> bloqueantes originales (mapa de atributos y checksum) están resueltos y
> validados.
>
> Lo que existe hoy son **scripts de investigación fuera del repo** más el
> artefacto [`pes4-map.json`](pes4-map.json). **Los slices A-E
> siguen sin implementar**: falta portar todo a los módulos del proyecto y
> construir la UI. Cada slice se ejecuta y cierra por separado — mismo
> protocolo que los macros anteriores.

## Objetivo

Una herramienta que Luis use solo, sin terminal, sin instalar nada y sin
ayuda técnica, para volcar al juego las mejoras que los suscriptores compran
con YuNaCoins: abre su memory card de PCSX2, ve el plantel, aplica los
cambios y guarda. El emulador arranca con los atributos nuevos.

**El juego es PES 4, no PES 5.** El save es `SLES-52760` (Pro Evolution
Soccer 4 PAL) y coincide con el ISO en uso (`PES4 - 100percent.iso`) y con el
único `gamesettings/SLES-52760_E7E55E7F.ini` de PCSX2. El prototipo actual se
titula "estilo PES5" — es solo la estética de la pantalla, todo lo de abajo
está verificado contra PES4.

## 0. Por qué esta arquitectura y no otra

Se evaluaron dos caminos para llegar al juego:

1. **Parchear el archivo de memory card** (elegido) — se reescribe el Option
   File dentro del `.ps2` con el emulador cerrado. Persiste, es reversible
   con backup y no depende de que el juego esté corriendo.
2. **Escribir la RAM del emulador en vivo vía PINE** — PCSX2 expone un socket
   para leer/escribir la memoria EE (su `PCSX2.ini` ya trae `EnablePINE` y
   `PINESlot = 28011`). Descartado como primer paso: **no persiste** (si el
   juego no guarda a la memcard, se pierde al cerrar), obliga a un puente
   local porque el browser no abre TCP, y exige relocalizar la tabla en RAM
   en cada arranque. Se puede sumar después *encima* de este mismo esquema si
   algún día quieren que el cambio se vea en pantalla durante el stream.

Y para la entrega, contra un `.exe`: la tool es **una página más del sitio que
ya está en Firebase Hosting**. Cero instalación, cero distribución, se
actualiza sola cuando ustedes despliegan, y el parseo del `.ps2` es JS puro
que corre igual en el browser. Se apoya en la File System Access API
(`showOpenFilePicker` + `createWritable`), que permite reescribir el archivo
elegido **en su lugar** — Luis no tiene que copiar nada de vuelta a la carpeta
de PCSX2. Requiere Chrome o Edge; Firefox no la implementa.

## 1. Lo que ya está verificado (evidencia de esta sesión)

Todo esto se comprobó ejecutando un parser sobre la memcard real, no es
suposición ni documentación de terceros.

### 1.1 El contenedor `.ps2`

Formato Sony estándar con ECC: página de 512 b de datos + 16 b de ECC = 528 b.
Superbloque leído: `pageLen 512`, `pagesPerCluster 2`, `clustersPerCard 65536`,
`allocOffset 265`, `rootDirCluster 0`. FAT indirecta vía `ifcList` en `0x50`.

La tarjeta tiene 21 saves. Los relevantes:

| Save | Tamaño | Qué es |
|---|---|---|
| `BESLES-52760PES4OPT` | 1.264.640 b | **el Option File** — el único que toca esta tool |
| `PES4000/010/080/090/160/170/200…270` | 514.048 b c/u | partidas |
| `PES4030/070/110` | 11.264 b c/u | estrategias/formaciones — **fuera de alcance** |
| `PES4320` | 760.832 b | partida |

### 1.2 El Option File

**Sin compresión ni cifrado.** Los nombres se leen en claro.

Tabla de jugadores: **base `0x7B50`, 4923 registros (4907 con nombre válido),
stride 124 bytes.** Es la base de datos completa de PES4, no solo el plantel
propio: editar un jugador **reemplaza en su lugar** a uno real del juego, así
que los jugadores de TSC están dispersos por todo el rango, no agrupados.

> Corrección: una primera lectura dio `0x4FE10` y 246 registros. Estaba mal —
> el recorrido hacia atrás aceptaba nombres vacíos y se metió en datos que no
> son jugadores. Los valores de arriba están validados con dos anclas
> independientes (`Michelo` en `0x54EF4` y `$Walter White` en `0x876C`, cuya
> diferencia es múltiplo exacto de 124).

Layout del registro (offsets relativos al inicio del registro):

| Offset | Ancho | Campo |
|---|---|---|
| `+0x00` | 32 b | nombre, UTF-16LE, terminado en `0000` (prefijo `$` = suscriptor, `#` = editado) |
| `+0x20` | 16 b | nombre de camiseta, ASCII (`_` = espacio) |
| `+0x30` | 8 b | sin identificar |
| `+0x34`..`+0x4D` | ~26 b | **los 26 atributos**, campos de 7 bits LSB-first — ver §1.5 |
| `+0x4E`..`+0x7B` | | sin identificar |

**El bloque de atributos empieza en `+0x34`, no en `+0x38`.** Una primera
lectura lo puso en `+0x38` y pasó la revisión porque los jugadores de la
plantilla base tienen los 26 atributos en 80: leyendo 4 bytes tarde en un
registro uniforme, igual salen todos 80. El error recién apareció al escribir —
Ataque, Defensa, Equilibrio y Resistencia quedaron sin tocar dentro del juego.

**Los campos NO están a intervalos regulares de 7 bits ni en el orden de la
pantalla.** El orden de almacenamiento difiere del orden de la UI (`Agilidad`
vive al final, en `+0x4C.7`; `Precisión` y `Potencia` están intercambiados), y
hay saltos de padding de 4 bits. No se puede derivar por aritmética: hay que
usar la tabla.

### 1.3 El equipo propio

**FK TUPADRE reemplaza a Hamburg SV**, sigla `FCK` (la misma que aparece en el
save de formaciones). Nombre editado en `0xC44A1`, nombre original preservado
a continuación. Su lista de convocados —32 índices `u16` a la tabla de
jugadores, que es el tamaño estándar de plantel en PES4— está en `0xA22EA`.

### 1.4 La ECC del contenedor

Resuelta y validada. Por cada bloque de 128 b: **byte 0** = paridad de columna
en dos tríos invertidos (bits 0-2 y 4-6, bits 3 y 7 sin usar), **bytes 1 y 2**
= grupos par e impar de paridad de línea, 7 bits invertidos cada uno. Un
bloque en ceros da `77 7F 7F`.

Validada contra las páginas reales de la tarjeta: **12.252 bloques, cero
fallos.** Gotcha: 109.632 de las 131.072 páginas están sin asignar y tienen
ECC de flash borrada (`FF FF …`) — hay que excluirlas del test o da falsos
negativos.

Hay **1 bloque con ECC inconsistente de fábrica**: página 1, bloque 0, con
`77 7F 7F` guardado sobre datos que no son ceros. Preexistente, presente en la
tarjeta original, benigno. No confundirlo con un error propio.

Y una confirmación independiente de que la lectura es correcta: **la plantilla
base sale con los atributos en 80 y los suscriptores en 85** — exactamente las
reglas que ya tiene codificadas `prototype-editor-jugador.html` (`base 80 +
mejoras`, suscriptores 85). Los nombres del save también son los del roster del
prototipo: Michelo, Huevito Rey, Elon Musk, Maradroga, Evo Morales, MASIVO BRO,
Putin, Zelenky, Bill Clinton, `$Saul Goodman`, `$JeffreyEpstein`.

### 1.5 El mapa de atributos — RESUELTO

Artefacto: **[`pes4-map.json`](pes4-map.json)**. Bit de inicio
de cada uno de los 26 atributos, relativo al comienzo del registro.

Se obtuvo por calibración in-game: en `MASIVO BRO` se pusieron los 24
atributos de la primera pantalla en valores **todos distintos** (70…93). Como
no se repite ninguno, cada valor identifica su campo sin ambigüedad, sin
depender de suponer el orden de almacenamiento.

`Prec. saq. falta` se ubicó aparte, buscando el único punto del registro que
cumple las tres condiciones a la vez (80 en el base, 87 en la calibración, 80
en nuestra escritura): `+0x4A.4`.

**Validado en los dos sentidos.** Primero en lectura, contra la calibración.
Después **en escritura**: se escribió un patrón discriminante —valores
distintos puestos justo sobre los campos de posición sospechosa, y 50 en todo
el resto para que cualquier cruce salte a la vista— y se confirmó contra la
pantalla del juego.

> **Esa segunda prueba encontró un error, y vale entender por qué.**
> `Cualidades de portero` y `Trabajo en equipo` estaban invertidos. En la
> calibración **los dos valían 80**, así que no había ningún dato que los
> distinguiera: se asignaron suponiendo que el orden de guardado seguía el de
> la pantalla, y esa suposición ya se sabía falsa para otros campos. La prueba
> de escritura, con 99 en uno y 10 en el otro, lo destapó de inmediato.
>
> Regla que queda: **un campo está mapeado solo si algún dato observado lo
> distingue de sus vecinos.** Validar lectura no valida escritura, y un valor
> repetido en la calibración no mapea nada. Los 4 campos de escala 1-8 que
> faltan tienen el mismo problema: valen todos 4.

**Sin mapear todavía:** `Regularidad en el juego`, `Estabilidad`, `Prec. pie
malo` y `Frec. pie malo` — son de escala 1-8, no 0-99, y necesitan su propia
calibración. No escribirlos a ciegas.

## 2. Los dos bloqueantes — los dos RESUELTOS

Ambos se resolvieron con calibración in-game y diff controlado. Ninguno queda
abierto. El slice C sigue teniendo sentido para automatizar el procedimiento
si en el futuro hace falta mapear los campos de escala 1-8 que faltan.

### 2.1 El checksum — RESUELTO

**No es del archivo entero: es por sección.** Por eso la búsqueda global no lo
encontraba (se descartaron sum8/16/32, xor8/16/32, CRC32 y sumas negadas, en
anchos 1/2/4, LE y BE, siete puntos de inicio, contra cada offset de los 19
saves — cero resultados).

```
checksum = suma de bytes desde 0x7B4D hasta ~0x9CB90, mod 256
guardado en UN byte en 0x7B4C  (4 bytes antes de la tabla de jugadores)
```

Cómo se encontró: se escribió una edición sin arreglar el checksum y PES4
rechazó el archivo (*"Ha habido un error. No se pudo cargar."*). El
**experimento de control** —cargar el backup sin modificar, que sí carga—
aisló la causa: no era la tarjeta, ni el filesystem, ni la ECC, ni el tamaño de
64 MB. Después, el diff de dos guardados hechos dentro del juego mostró que el
único byte que cambia fuera del registro del jugador es `0x7B4C`, y la fórmula
salió de la respuesta del checksum al cambio (el `+1` movió un byte en +16 y el
checksum en +16; la calibración movió la suma en +180 y el checksum en +180).

**Validada en 4 tarjetas** — las tres del juego (`0xF5`, `0x05`, `0xA9`) más una
escrita por nosotros (`0xF9`).

El final exacto de la región es indiferente: la cola es padding en ceros y 510
límites distintos dan la misma suma. **Para escribir se usa el método de
delta**, que es independiente de los límites:

```
checksum_nuevo = checksum_viejo + (suma de bytes nuevos - suma de bytes viejos)
```

Correcto siempre que los bytes tocados caigan dentro de la región, que es el
caso para cualquier edición de atributos.

> Nota: es muy probable que cada sección del option file tenga su propio byte
> de checksum con el mismo esquema. Si en el futuro la tool escribe fuera de la
> tabla de jugadores, hay que localizar el byte de esa sección igual que este.

### 2.2 Estado del camino de escritura — VERIFICADO EN EL JUEGO

**Cerrado end-to-end.** Filesystem, mapeo de offset de archivo a página física,
empaquetado de 7 bits, checksum de sección y ECC. Una escritura de prueba
(`MASIVO BRO`) produce una tarjeta donde:

- los atributos releídos a través del filesystem dan el valor escrito;
- el checksum guardado coincide con el calculado;
- la ECC de toda la tarjeta es íntegra salvo el bloque malo preexistente;
- el diff contra la original son 21 bytes de datos + 1 de checksum + 1 de ECC,
  y nada más en 69 MB;
- **y PES4 carga el Archivo Opciones y muestra los valores nuevos en pantalla.**

## 3. Orden y dependencias

| # | Slice | Tamaño | Riesgo | Bloqueante |
|---|---|---|---|---|
| **A** | Lectura de memcard en browser (`mc-fs.js`) | medio | bajo — formato ya verificado | — |
| **B** | Decodificador de jugadores (`pes4-players.js`) | chico | bajo — formato ya verificado | A |
| **C** | **Calibración**: diff de dos `.ps2` → mapeo + checksum | chico | bajo (solo lectura) | A, B |
| **D** | Escritura: reencode + ECC + reinyección | medio | **alto — toca el save** | C |
| **E** | UI para Luis (abrir, aplicar, guardar) | medio | bajo | D |

A, B y C son **de solo lectura**: no pueden romper nada y se pueden ejecutar
sin que Luis participe. C es el que desbloquea todo lo demás.

## 4. Los slices

### Slice A — Lectura de memcard

Puerto a browser del parser ya escrito y probado en Node. `Uint8Array` +
`DataView` en vez de `Buffer`; el resto es idéntico.

Expone: `openCard(arrayBuffer)` → `{ superblock, saves[] }`,
`readFile(save, nombre)` → `Uint8Array`.

**Verificación de cierre:** listar los 21 saves con nombre y tamaño exacto, y
extraer `BESLES-52760PES4OPT` con hash igual al de la extracción por Node.

### Slice B — Decodificador de jugadores

`decodePlayers(optBuffer)` → 246 objetos `{ idx, offset, nombre, camiseta,
attrs[24] }`. Solo lectura, sin mapeo semántico todavía — los atributos salen
como array indexado.

**Verificación de cierre:** los 246 nombres y el dump de Michelo,
IShowSpeed, Huevito Rey y `$JeffreyEpstein` coinciden con la tabla de §1.2.

### Slice C — Calibración

Página aparte (no la ve Luis). Se le dan dos `.ps2` — antes y después de una
edición hecha dentro del juego — y reporta:

- qué registros de jugador cambiaron y en qué slots
- **qué bytes cambiaron fuera de la tabla de jugadores** (→ checksum)
- un `pes4-map.json` sugerido a partir de los valores testigo

Salida: `pes4-map.json` (ya existe, ver §1.5), con los nombres de atributo
en orden y la respuesta de checksum. Es el artefacto que hace que la tool no
necesite un LLM nunca más.

### Slice D — Escritura

Tres cosas, en este orden:

1. **Reencode de los atributos** — inversa exacta del decode: agrupar de a 4,
   `u32 |= (valor & 0x7F) << (k * 7)`, preservando los 4 bits sobrantes de
   cada grupo tal como estaban. **Los bits sobrantes no se tocan** — no sé qué
   son y no hay razón para escribirlos.
2. **Reinyección en el `.ps2`** — el tamaño del archivo no cambia nunca, así
   que se sobrescriben los clusters existentes siguiendo la cadena FAT. Sin
   realloc, sin tocar directorios ni FAT. Es el caso más simple posible.
3. **Recalcular la ECC de cada página tocada.** El `.ps2` lleva 16 b de ECC
   por página de 512 b. PCSX2 tiende a ignorarla, pero el BIOS de PS2 no
   necesariamente, y una ECC inconsistente es exactamente el tipo de fallo que
   aparece tres semanas después. Se recalcula y listo.

**Verificación de cierre:** escribir un cambio conocido, releer el `.ps2` con
el slice A y confirmar que vuelve el valor esperado; después arrancar PCSX2 y
comprobarlo dentro del juego. Sobre un jugador de descarte, nunca sobre el
plantel real.

### Slice E — UI para Luis

Reusa `prototype-editor-jugador.html` como superficie — ya tiene el roster, la
grilla de atributos, el costo en YuNaCoins y las reglas de presupuesto.
Se le suman cuatro cosas:

- botón **"Abrir memory card"** (`showOpenFilePicker`)
- cruce del roster del save con el del prototipo, por nombre
- **backup automático**: antes de la primera escritura, ofrece descargar una
  copia del `.ps2` original con fecha. No es opcional, es el paso 1 del flujo.
- botón **"Guardar en la memory card"** con confirmación explícita y un
  resumen de qué jugador cambia de qué a qué

Standalone en esta etapa: el roster sale del propio `.ps2` y los saldos de
YuNaCoins se cargan a mano o por CSV. Conectar con el store `coins` de
Firestore queda como slice posterior — arrastra el gap que ya está
documentado en `STREAMLABS_YUNACOINS.md` (no existe el mapeo usuario↔equipo)
y no hace falta para que la tool funcione.

## 5. Dónde vive esto

Todo el material de investigación de esta rama está en
**`tsc-src/prototipo_yunas/`**:

```
prototipo_yunas/
├── MACRO_SLICE_EDITOR_PES4.md      # este documento
├── pes4-map.json                   # el mapa de atributos (artefacto validado)
├── prototype-editor-jugador.html   # el prototipo de UI
├── STREAMLABS_YUNACOINS.md         # exploración Streamlabs ↔ YuNaCoins
├── 1..4.webp                       # material de diseño
├── *.ps2                           # memcards de prueba — IGNORADAS por git (276 MB)
└── tools/                          # scripts de investigación (Node, fuera de la app)
    ├── memcard-fs.js               # abre un .ps2 y devuelve el option file
    ├── list-saves.js               # lista los saves de una tarjeta
    ├── extract-save.js             # extrae un save a disco
    ├── diff-cards.js               # compara option files entre tarjetas
    └── write-attrs.js              # escribe atributos + checksum + ECC
```

`tools/` es de investigación, no de producción: son scripts de Node que
corren desde la terminal. Los slices A-E portan esa lógica a los módulos del
proyecto (ver abajo), que corren en el browser.

Ejemplo de uso de `write-attrs.js`:

```bash
node tools/write-attrs.js entrada.ps2 "MASIVO BRO" salida.ps2 ataque=99 defensa=90 RESTO=80
```

## 6. Archivos de los slices

**Nuevos**

```
tsc-src/js/pes4/mc-fs.js            # slice A — filesystem de memcard PS2
tsc-src/js/pes4/pes4-players.js     # slice B — decode/encode de registros
tsc-src/js/pes4/mc-write.js         # slice D — reinyección + ECC
tsc-src/pes4-calibrar.html          # slice C — herramienta interna
tsc-src/pes4-editor.html            # slice E — la tool de Luis
```

**Modificados**

- `tsc-src/index.html` — entrada de navegación a la tool (solo admin)
- `.gitignore` — excluir `*.ps2` (ver riesgo 6.4)

**No se tocan:** `coins.js`, `firebase-config.js`, `cloudinary.js`, ni nada
del flujo actual de la web. Esta tool es aditiva.

## 7. Riesgos

| # | Riesgo | Mitigación |
|---|---|---|
| 6.1 | **PCSX2 abierto al guardar.** El emulador mantiene la memcard cacheada y la reescribe al cerrar, pisando el parche. | La UI abre con un aviso bloqueante: "cerrá PCSX2 antes de continuar". Es el error #1 que va a cometer Luis. |
| 6.2 | **Corromper el save.** | Backup obligatorio antes de la primera escritura + validación de que el archivo releído decodifica igual. Slices A-C son de solo lectura. |
| 6.3 | **Chrome bloquea la escritura en la carpeta de PCSX2.** La File System Access API veta directorios sensibles. `Documents/PCSX2/memcards` debería pasar, pero hay que comprobarlo. | Se verifica en el slice A, antes de construir nada encima. Si falla, el fallback es descargar el `.ps2` parcheado y que Luis lo copie — un paso más, no un bloqueo. |
| 6.4 | **La memcard de 69 MB quedó dentro del repo** (`tsc-src/prototipo_yunas/Memory64 MB.ps2`), sin trackear. | Agregar `*.ps2` al `.gitignore` en el slice A. No debe entrar nunca a git. |
| 6.5 | Mapeo de atributos mal fijado. | Es la razón de existir del slice C. D no arranca sin él. |

## 8. Qué se necesita de ustedes

Una sola cosa, y desbloquea todo:

1. **La sesión de calibración** (§2.1). Dentro de PES4, sobre un jugador de
   descarte, poner los 24 atributos en 24 valores distintos. Guardar a la
   memcard. Mandarme **las dos copias del `.ps2`** — la de antes y la de
   después.
2. Aparte, un save con **un solo** atributo cambiado en 1 punto, para aislar
   la pregunta del checksum (§2.2). Puede salir de la misma sesión.

Con eso corro el diff y sale el `pes4-map.json` definitivo.

## 9. Próximo paso

Aprobar (o corregir) este documento → ejecutar A, B y C, que no necesitan a
Luis ni tocan ningún archivo suyo → pedir los saves de calibración → recién
ahí abrir el slice D.
