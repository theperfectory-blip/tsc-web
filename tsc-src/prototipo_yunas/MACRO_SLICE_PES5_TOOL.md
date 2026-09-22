# Macro Slice — Tool PES5 unificada (save ↔ web) · 2026-09-15

> Rama `feat/yunacoins-pes5`, carpeta `tsc.web-yunacoins`. Leer antes
> `WORKFLOW_2.0.md` (raíz del repo) y `pes5/README.md`.
>
> **Roles:** Sonnet implementa, Opus supervisa. Protocolo por slice: Sonnet
> presenta (1) plan corto, (2) archivos a tocar, (3) riesgos, y **espera
> aprobación**. Al terminar entrega (1) diff summary, (2) pruebas con salida
> real pegada, (3) errores conocidos, (4) evidencia por `eval`/DOM (nunca
> screenshots). Tras tocar código: `graphify update .` dentro de `tsc-src/`.
> **No se avanza al siguiente slice sin aprobación explícita.**

---

## Objetivo

Reemplazar los cuatro HTML sueltos de `pes5/` (`admin-pes5`,
`admin-tool-luis`, `admin-vincular-equipos`, `test-browser-crypto`) por **una
sola página de admin**, `prototipo_yunas/pes5-tool.html`, que:

1. Lee el save de PES5 **directamente desde la carpeta del juego** (o la que
   el admin elija), sin subir el archivo a mano cada vez, y detecta cuando el
   juego lo vuelve a guardar.
2. Permite **elegir un equipo** (club de PES5 o equipo TSC vinculado) y ver a
   sus jugadores con **todas** las estadísticas reales del save: 27 atributos
   0-99, 4 de escala 1-8, 25 habilidades, edad, pie, lesiones, posiciones y
   **altura** (ya mapeada, ver 1.2).
3. Edita esos campos y **escribe el save** con backup automático.
4. Mantiene el flujo web ↔ juego en las dos direcciones:
   - juego → web: publicar plantillas a Firestore (`pes5_plantillas`), con
     altura real, para que el editor del presidente las muestre;
   - web → juego: aplicar los pedidos de mejora (`pedidos_pes5`) al save.

El editor del presidente (`prototype-editor-jugador.html`) **no se toca en
este macro** salvo un ajuste en el slice D: sigue siendo la página del
usuario; esta tool es la del admin.

---

## 0. Decisiones ya tomadas (no re-litigar)

| Tema | Decisión | Por qué |
|---|---|---|
| Acceso al save | **File System Access API** (`showDirectoryPicker`), handle persistido en IndexedDB. Fallback: `<input type="file">` + descarga, como hoy. | Es lo único que permite leer y escribir en la carpeta del juego desde el navegador. Solo Chrome/Edge y solo en `localhost` o `https`: los dos casos de uso reales. |
| Qué se elige | Una **carpeta**, no un archivo. Dentro se busca `KONAMI-WIN32PES5OPT`. | Hace falta la carpeta para crear los backups al lado del save. |
| Backups | Antes de cada escritura: `backups-tsc/KONAMI-WIN32PES5OPT.<YYYYMMDD-HHMMSS>.bak` en la carpeta elegida. Se conservan los últimos 20. | Nunca escribir sobre el save sin instantánea (regla del README). |
| Fuente de verdad | El **option file**. Firestore (`pes5_plantillas`) es una copia publicada. | Lo que vale es lo que el juego lee. |
| Detección de cambios del juego | Polling de `lastModified` cada 3 s mientras la pestaña está visible. Recarga con aviso; no re-publica sola salvo que el admin active "auto-publicar". | PES5 PC vuelca el archivo al guardar, no al cerrar (README). |
| Escritura con el juego abierto | No se detecta. La tool exige un checkbox "PES5 está cerrado" antes de escribir. | Si el juego guarda después, pisa lo escrito. |
| Módulos compartidos | Lógica nueva va a `tsc-src/js/pes5-save.js` (nuevo) y `tsc-src/js/pes5-editor.js` (ampliado). La página solo tiene UI. | Igual que el resto del proyecto: módulos globales sin bundler. |
| Datos estáticos | `pes5-keys.json`, `pes5-map.json`, `pes5-teams.json` se **mueven** a `tsc-src/js/pes5/` y las páginas los cargan desde ahí. | Hoy hay copias con rutas `./` vs `../../js/` que ya rompieron una vez. Una sola ubicación. |
| Nombre de la página | `tsc-src/prototipo_yunas/pes5-tool.html`, título "Tool PES5". | Una página, un nombre. |
| Estilo | Mismo look que `prototype-editor-jugador.html` (variables.css + components.css, Bebas/Barlow). Iconos SVG inline estilo Lucide, **nunca emojis**. | Regla del CLAUDE.md. |

---

## 1. Estado exacto al empezar

### 1.1 Lo que ya funciona (verificado 2026-09-15)

- `tsc-src/js/pes5-crypt.js`: `cargarClaves(baseUrl)`, `descifrar(bytes)`,
  `cifrar(bytes)`. Round-trip `cifrar(descifrar(x)) === x` verificado.
- `tsc-src/js/pes5-editor.js`: `cargarMapa`, `cargarNombresEquipos`,
  `leerCampoJugador`, `escribirCampoJugador`, `posicionesMarcadas`,
  `posicionRegistrada`, `nombreDeRegistro`, `buscarJugadorPorNombre`,
  `nombreEquipo`, `buscarEquipoPorNombre`, `leerPlantillaEquipo` (32 slots),
  `darDeBaja/darDeAlta/transferirJugador`.
- `pes5/admin-pes5.html`: vincular equipo TSC ↔ club (campo `pes5Club` en
  `teams`), cargar option file por `<input type="file">`, publicar
  plantillas. Carga bien en `http://localhost:3001/prototipo_yunas/pes5/admin-pes5`.
- Firestore: reglas `pedidos_pes5` y `pes5_plantillas` desplegadas
  (30/08). Solo 1 equipo vinculado hoy: FK TUPADRE → Middlesbrough.
- Presidente ↔ equipo se asigna en la web (`js/users-admin.js`, campo
  `users.teamId`). Esta tool solo lo **muestra**, no lo edita.

### 1.2 La altura SÍ está mapeada (el README está viejo)

`pes5-map.json` → `ajustes_basicos.Altura`: bit 704, `+0x58.0`, **6 bits**,
valor almacenado + 148. Verificado el 31/08 con los 4894 jugadores del save
real: campana centrada en ~180 cm, Puskas 172, Romario 169, Berbatov 188.
El bit 710 (`+0x58.6`) no es parte de la altura. El README dice "Sin mapear:
Altura" en tres lugares: **corregirlo en el slice A.**

### 1.3 Constantes del save (de `pes5-editor.js` y `pes5-map.json`)

| Cosa | Valor |
|---|---|
| Tabla de jugadores | base 36872, stride 124, 5000 registros |
| Roster por club | base 667458, stride 64, 32 slots de 2 bytes (id de jugador) |
| Tabla de clubes | base 803608, stride 140, 138 clubes |
| Nombre de jugador | `+0x00`, UTF-16LE, 15 chars |

**Gotcha:** un jugador es un registro único; si dos equipos lo tienen en su
roster (club + selección), editarlo lo cambia en los dos. La tool debe
avisarlo al editar.

### 1.4 Qué se reemplaza y qué se conserva

| Archivo | Destino |
|---|---|
| `pes5/admin-pes5.html`, `pes5/admin-tool-luis.html`, `pes5/admin-vincular-equipos.html`, `pes5/test-browser-crypto.html` | Se borran en el slice E, cuando `pes5-tool.html` cubra todo. |
| `pes5/tools/*.js`, `pes5/tools/OptionFile.java`, `pes5/README.md`, `pes5/key-256.bin` | Se conservan: investigación y tools de Node. |
| `pes5/pes5-keys.json`, `pes5-map.json`, `pes5-teams.json` | Se mueven a `tsc-src/js/pes5/` (slice A). Las tools de Node que los leen se actualizan a la ruta nueva. |
| `prototype-editor-jugador.html` | Se conserva. Slice D lo ajusta para leer altura real. |

---

## 2. Orden y dependencias

```
A (fuente del save + datos estáticos)  ──┐
B (lectura/escritura completa de jugador) ┴─> C (UI unificada) ─> C.1 ─> C.2 ─> [prueba en el juego: OK 15/09]
  ─> D.R (reglas YunaCoins + cobro) ─> D (sync: pedidos y publicar) ─> F (sección pública) ─> E (limpieza) ─> G (nivelación configurable, pendiente de Luis)
```

A y B son independientes entre sí y pueden hacerse en cualquier orden, pero
uno a la vez (protocolo). C necesita los dos. D necesita C. E al final.

---

## 3. Los slices

### Slice A — `pes5-save.js`: la fuente del save

**Archivos:** nuevo `tsc-src/js/pes5-save.js`; mover los 3 JSON a
`tsc-src/js/pes5/`; actualizar rutas en `pes5-crypt.js`, `pes5-editor.js`,
`pes5/admin-*.html`, `pes5/test-browser-crypto.html`, `pes5/tools/*.js`;
corregir README (1.2).

**Spec.** Módulo global `PES5_SAVE` con:

```
elegirCarpeta()            -> showDirectoryPicker(); guarda el handle en IndexedDB
                              (store 'pes5', key 'dirHandle'); devuelve {nombre, ok}
recuperarCarpeta()         -> lee el handle guardado; queryPermission/requestPermission
                              ('readwrite'); devuelve null si no hay o se denegó
tieneSoporte()             -> !!window.showDirectoryPicker
leer()                     -> Uint8Array cifrado + {nombre, tamaño, lastModified}
                              (busca KONAMI-WIN32PES5OPT en la carpeta; error claro si no está)
escribir(bytesCifrados)    -> 1) backup en backups-tsc/ (crea la subcarpeta si falta,
                              conserva 20), 2) escribe el save, 3) relee y compara
                              byte a byte, 4) devuelve {backup, verificado:true}
observar(cb, ms=3000)      -> polling de lastModified solo con document.visibilityState
                              === 'visible'; llama cb(meta) cuando cambia; devuelve stop()
fallbackDesdeInput(file)   -> Uint8Array desde un <input type="file"> (sin escritura;
                              la escritura en fallback es descarga, función descargar(bytes))
```

Todo el cifrado sigue en `PES5_CRYPT`; este módulo no descifra nada.

**Pruebas que Sonnet debe correr y pegar:**
1. En Node, `node pes5/tools/write-test.js` sigue pasando con los JSON en la
   ruta nueva.
2. En el navegador (`localhost:3001`), en una **carpeta de prueba** con una
   copia del save (nunca la del juego en este slice): `elegirCarpeta` →
   `leer` → `PES5_CRYPT.descifrar` → `PES5_EDITOR.nombreDeRegistro(bytes, 999)`
   devuelve `Ronaldinho`; `escribir(bytesSinCambios)` crea el backup, y el
   archivo reescrito es idéntico al original (`md5` desde Node).
3. `observar`: tocar el archivo desde Node (`fs.utimes`) dispara el callback.
4. Sin soporte (simular `window.showDirectoryPicker = undefined`):
   `tieneSoporte()` false y el fallback por input funciona.

**Riesgos:** permisos del handle expiran al cerrar el navegador (hay que
re-pedir con gesto del usuario: botón "Reconectar carpeta"); Firefox/Safari
no soportan la API (fallback obligatorio).

---

### Slice B — jugador completo en `pes5-editor.js`

**Archivos:** `tsc-src/js/pes5-editor.js`; nuevo test Node
`pes5/tools/test-jugador-completo.js`.

**Spec.** Agregar a `PES5_EDITOR`:

```
leerJugadorCompleto(bytes, id) -> {
  id, nombre, nombreCamiseta,
  atributos: { <27 claves 0-99 del mapa>: n },
  escala8:   { <4 claves 1-8>: n },
  habilidades: { <25 claves>: bool },
  edad, pieDominante ('der'|'izq'), lesiones ('A'|'B'|'C'),
  altura (cm), posiciones: [..marcadas], posicionRegistrada,
  contadorEdiciones
}
escribirJugadorCompleto(bytes, id, cambios) -> aplica solo las claves presentes
  en `cambios` (parcial), valida rangos (0-99, 1-8, 148-211 cm, edad 15-46),
  incrementa contadorEdiciones (+0x32) y devuelve la lista de campos escritos.
leerPlantillaCompleta(bytes, indiceClub) -> [leerJugadorCompleto(...)] para los
  slots ocupados, en el orden del roster.
equiposDelJugador(bytes, id) -> índices de todos los clubes que lo tienen (gotcha 1.3).
```

Las claves de `atributos`/`escala8`/`habilidades` son **exactamente** las del
`pes5-map.json`, sin renombrar, para que el mapa siga siendo la única fuente.

**Pruebas:**
1. `test-jugador-completo.js` sobre el save real (ruta en el README): Puskas
   172 cm, Romario 169, Berbatov 188; Ronaldinho id 999 con nombre correcto;
   distribución de alturas de los 4894 con nombre: min ≥ 148, max ≤ 211, sin
   valores fuera.
2. Round-trip: `escribirJugadorCompleto` con los mismos valores que devolvió
   `leer` deja los bytes idénticos salvo `+0x32`.
3. Escribir altura 190 a un jugador en una **copia**, releer 190, y
   `cifrar(...)` produce un archivo que el juego carga (verificación manual
   del usuario, igual que el 31/08: instalar la copia, abrir PES5, mirar al
   jugador).

**Riesgos:** los 16 bits `+0x34-0x35` y el bit 710 siguen sin identificar; no
tocarlos. `escribirJugadorCompleto` no debe escribir campos que no cambiaron.

---

### Slice C — `pes5-tool.html`: la UI unificada

**Archivos:** nuevo `tsc-src/prototipo_yunas/pes5-tool.html`. Carga
`../js/firebase-config.js`, `state.js`, `db.js`, `auth.js`, `pes5-crypt.js`,
`pes5-editor.js`, `pes5-save.js` (ruta `../js/`, **un** nivel, ver fix
`ce26933`).

**Spec.** Solo admin (`AUTH.role === 'admin'`); si no, gate con login como
en el editor. Layout: barra superior con estado del save + cuatro pestañas.

**Barra de estado del save (siempre visible):**
`[carpeta: …\save\folder1] [KONAMI-WIN32PES5OPT · 1.250.304 b · guardado hace 3 min] [Reconectar] [Recargar]`
Sin carpeta: botón "Elegir carpeta del juego" (sugerir en texto la ruta
`Documents\KONAMI\Pro Evolution Soccer 5\save\folder1`) y, si no hay
soporte, el input de archivo.

**Pestaña 1 · Equipos.** Tabla de los 62 equipos TSC: escudo, nombre,
presidente (de `users` con `teamId`, solo lectura; "sin presidente" si no
hay), selector del club PES5 (los 138 de `pes5-teams.json`), cupo del
roster (`n/32`). Guardar escribe `teams.pes5Club` como hoy. Filtro por texto.

**Pestaña 2 · Plantilla.** Selector de equipo (agrupado: "Equipos TSC
vinculados" arriba, "Todos los clubes PES5" abajo). Al elegir, tabla con
`leerPlantillaCompleta`: dorsal/slot, nombre, posición registrada, altura,
edad, pie y los 27 atributos como columnas con scroll horizontal dentro de la
tabla (la página nunca scrollea a lo ancho). Click en un jugador abre un
panel lateral con **todos** los campos editables (inputs numéricos con rango,
toggles para habilidades y posiciones). Badge "también en: <otros equipos>"
si `equiposDelJugador` devuelve más de uno. Botón "Escribir al save" habilitado
solo con cambios pendientes **y** el checkbox "PES5 está cerrado" marcado;
muestra el resumen de cambios antes de confirmar; al terminar, toast con el
nombre del backup.

**Pestaña 3 · Pedidos.** Se deja como esqueleto en este slice (lista vacía
con texto "slice D"). No conectar Firestore todavía.

**Pestaña 4 · Publicar.** Se deja como esqueleto (botón deshabilitado).

**Pruebas (por `eval` en `localhost:3001/prototipo_yunas/pes5-tool`):**
1. Sin login: gate visible, shell oculto. Con admin: 4 pestañas, barra de
   estado con la carpeta elegida.
2. Elegir FK TUPADRE → `document.querySelectorAll('.pt-row').length` = cupo
   del Middlesbrough y la fila de un jugador conocido muestra su altura real.
3. Editar altura +1 en una copia del save, escribir, recargar: el valor
   persiste y existe el backup. `md5` del backup = `md5` del original.
4. Intentar escribir sin el checkbox: botón deshabilitado.
5. Sin scroll horizontal del `body` a 1366 px y a 390 px (regla no-scroll).

**Riesgos:** volumen de DOM (32 jugadores × 60 campos): renderizar el panel
lateral solo al abrirlo. Iconos: SVG inline, nada de emojis.

---

### Slice C.1 — antes de probar en el juego: equipos activos, clubes desde el save, vínculo por índice

Decisión del usuario (2026-09-15): estos cuatro ajustes se hacen **antes** de
la prueba B.3, para que esa prueba cubra las dos direcciones de una vez:
renombrar un club dentro del juego y verlo en la tool, y editar en la tool,
instalar la copia y verlo en el juego. Sigue sin tocarse el save real:
copia en `test-save-copy/`.

**Archivos:** `pes5-tool.html`, `pes5-editor.js` (C1.4), y `pes5-tool.html`
para la migración de `pes5ClubIdx` (C1.3, escribe `teams` en Firestore real:
hoy un solo documento, FK Tupadre).

**C1.1 · Solo equipos activos (decisión del usuario, 2026-09-15).** En la tool,
la pestaña Equipos, el selector de la pestaña Plantilla ("Equipos TSC
vinculados") y el bucle de Publicar consideran únicamente equipos con
`status !== 'INACTIVO'` (si el campo falta, cuenta como activo, igual que en
`teams.js`). Un inactivo no aparece para vincular ni se le publica plantilla;
si ya tenía `pes5Club`, el dato se conserva en Firestore, solo deja de
listarse. **Alcance: exclusivamente esta tool.** El admin de usuarios de la
web (`js/users-admin.js`, asignar equipo a presidente) está en producción y
**no se toca** en este macro.

**C1.2 · Los clubes salen del save, nunca de una lista fija (decisión del
usuario, 2026-09-15).** Sin save cargado, la pestaña Equipos no ofrece ningún
club (selector deshabilitado con el aviso "Cargá el save para ver los clubes")
y la pestaña Plantilla no lista nada. Con save cargado, los 138 clubes se leen
con `PES5_EDITOR.nombreEquipo(bytes, i)` **cada vez** que se carga o recarga
el archivo; si el admin renombra un club dentro del juego, la tool muestra el
nombre nuevo al siguiente guardado. `pes5-teams.json` deja de usarse para
poblar selectores (queda solo como referencia histórica; `cargarNombresEquipos`
no se llama desde la tool).

**C1.3 · El vínculo se guarda por índice, no por nombre.** Hoy `teams.pes5Club`
guarda el nombre ("Middlesbrough") y se rompe si el club se renombra. Nuevo
campo `teams.pes5ClubIdx` (entero 0-137) como fuente del vínculo; `pes5Club`
se sigue escribiendo solo como etiqueta informativa con el nombre vigente al
vincular. Al cargar la tool, si un equipo tiene `pes5Club` pero no
`pes5ClubIdx`, se resuelve una vez buscando el nombre en el save
(`buscarEquipoPorNombre`) y se guarda el índice; si no se encuentra, se marca
"vínculo roto: revinculá" y no se publica. El editor del presidente y
`pes5_plantillas` usan `pes5ClubIdx`. Hoy hay un solo vínculo (FK Tupadre),
así que la migración es trivial.

**C1.4 · Contador de ediciones.** `escribirJugadorCompleto` debe saltar los
campos cuyo valor nuevo es igual al actual y no incrementar `+0x32` si no
escribió nada real.


**Pruebas (eval en `localhost:3001/prototipo_yunas/pes5-tool`, logueado como admin):**
1. Sin save: selector de clubes deshabilitado con el aviso; Plantilla vacía.
2. Con save (copia): 138 clubes leídos del archivo. Renombrar un club en la
   copia desde Node (escribir el nombre en la tabla de clubes, base 803608,
   stride 140) y "Recargar": la tool muestra el nombre nuevo.
3. Un equipo con `status:'INACTIVO'` (usar uno real que ya lo esté, o no
   crear ninguno) no aparece en Equipos ni en Plantilla.
4. FK Tupadre queda con `pes5ClubIdx` numérico y `pes5Club` como etiqueta;
   leer el doc desde Firestore y pegarlo.
5. `escribirJugadorCompleto` con valores iguales devuelve `[]` y no cambia
   `+0x32` (agregar el caso a `test-jugador-completo.js`).

**Después de C.1 → prueba B.3 ampliada (la hace el usuario):** editar la
altura de un jugador en la tool sobre la copia, instalar la copia como save,
abrir PES5, confirmar el valor; dentro del juego renombrar un club, guardar,
"Recargar" en la tool y confirmar el nombre nuevo y que el vínculo de FK
Tupadre sigue resolviendo al mismo club.

### Slice C.2 — correcciones tras la primera prueba en el juego (2026-09-15)

Resultado de la prueba del usuario: **juego → tool funciona** (renombrar club
y editar jugadores en PES5 se ven bien al recargar). **Tool → juego NO se
pudo probar**: al aceptar el diálogo de "Escribir al save" no se generó
nada. Evidencia en disco: la copia en `test-save-copy/` conserva el mtime
previo y no existe `backups-tsc/` en ninguna carpeta, o sea que
`PES5_SAVE.escribir` nunca llegó a escribir (falló antes o el error se
perdió en un toast). Tres arreglos, un solo slice, una aprobación.

**Archivos:** `pes5-tool.html`; `js/pes5-save.js` solo si hace falta para C2.3.

**C2.1 · Diálogo de confirmación mínimo.** El texto antes de escribir muestra
solo **equipo y jugadores** afectados, nada de campos:
`Equipo: <nombre club del save>
Jugadores: <nombre1>, <nombre2>

Se crea backup automático. ¿Confirmar?`
El detalle campo por campo ya se ve en el panel (resaltado `changed`).

**C2.2 · Editar no debe re-renderizar todo.** Hoy `onCampoAttr`/`onCampoSimple`/
`onCampoHabilidad`/`onCampoSelect` llaman `renderPlantillaBody()`, que
reconstruye tabla + panel + botón + checkbox: se pierde el foco, el scroll
vuelve arriba y se pisa el estado del checkbox "PES5 está cerrado". Cambiar
a actualización en el lugar: (a) el input editado solo cambia su clase
`changed`; (b) la celda correspondiente de la fila del jugador en la tabla
se actualiza por `id` (`data-jugador`/`data-campo`) sin tocar el resto;
(c) el contador de cambios pendientes y `actualizarBotonEscribir()` se
llaman aparte. Enter en un input no debe hacer nada más que `blur`
(no hay `<form>`; verificar que no lo haya). El panel lateral se
reconstruye **solo** al cambiar de jugador o de equipo. Además, (d) un campo
entra en `CAMBIOS_PENDIENTES` **solo si su valor difiere del original** del
save, y sale de ahí si vuelve al original; el diálogo del usuario (captura
15/09) listó 11 campos para un jugador al que editó uno o dos, señal de que
hoy se registran cambios en campos no tocados (probable disparo de
`onchange` en la reconstrucción del panel). Verificar y pegar la causa.

**C2.2 bis · Rango real de altura: 148–205 cm (dato del usuario, 15/09).**
Los 6 bits del campo permiten hasta 211, pero el editor de PES5 solo admite
hasta 205 y ese es el tope que vale: la tool no debe poder escribir un valor
que el juego no permite. Cambiar el máximo a 205 en `escribirJugadorCompleto`
(`pes5-editor.js`), en los inputs de altura de `pes5-tool.html`, en el test
Node (`altura maxima <= 205` sobre el save real, que hoy da 203) y anotar en
`pes5-map.json > ajustes_basicos.Altura` una nota `rango_juego: "148-205"`.
Confirmar con el usuario si el mínimo del juego también es 148 o es mayor.

**C2.3 · La escritura falla en silencio: hacerla visible y robusta.**
1. Justo antes de escribir, dentro del mismo gesto del click, pedir el
   permiso de escritura explícitamente: `PES5_SAVE.asegurarEscritura()`
   (nuevo en `pes5-save.js`: `queryPermission({mode:'readwrite'})` y, si no
   es `granted`, `requestPermission({mode:'readwrite'})`; devuelve `true`/`false`).
   Si devuelve `false`, mostrar el error y no continuar.
2. Los errores de `escribirAlSave` dejan de ser un toast de 2 s: se
   muestran en un **panel de error persistente** dentro de la pestaña
   Plantilla, con `e.name` y `e.message` y el nombre de la carpeta activa,
   hasta que el admin lo cierre. También se loguean con `console.error`.
3. Tras un éxito, el panel muestra ruta relativa del backup y tamaño
   escrito, y se mantiene visible (no solo toast).
4. `renderPlantillaBody` **no** debe vaciar `#pl-log` ni el panel de error.
5. **CAUSA DEL SILENCIO, confirmada en el código (15/09):** `showToast` en
   `pes5-tool.html` es un stub: `function showToast(msg){ console.log('[toast]', msg); }`.
   Ningún aviso de éxito ni de error se mostró jamás en pantalla; el error
   real de la escritura está en la consola del navegador (el usuario usa
   Chromium; no apareció burbuja de permiso). Reemplazar el stub por un
   toast real (mismo estilo que `showMiniToast` del editor) y, para errores,
   el panel persistente del punto 2. Antes de arreglar, leer la consola con
   el usuario o reproducir para capturar la excepción exacta.
6. **CAUSA RAÍZ, verificada por Opus en el navegador del usuario (15/09):**
   el navegador es **Brave** (userAgentData: Brave 153 / Chromium 153).
   Brave desactiva de fábrica la File System Access API:
   `typeof window.showDirectoryPicker === 'undefined'` aun en contexto
   seguro. `PES5_SAVE.tieneSoporte()` da `false`, la tool entra en modo
   fallback (input de archivo) y `escribirAlSave` → `PES5_SAVE.escribir` →
   `_fileHandleDelSave` lanza "no hay carpeta elegida", que solo llegó a la
   consola por el stub del punto 5. **Arreglo en dos frentes:**
   (a) en modo fallback, "Escribir al save" debe generar el archivo
   reescrito con `PES5_SAVE.descargar(cifrado, 'KONAMI-WIN32PES5OPT')` y
   dejar claro en el panel que el archivo original queda como backup y que
   hay que copiarlo a mano a la carpeta del juego; el botón pasa a decir
   "Descargar save editado"; (b) el aviso de "navegador sin soporte" debe
   nombrar Brave y decir cómo habilitarlo:
   `brave://flags/#file-system-access-api` → Enabled → relanzar, o usar
   Chrome/Edge para la tool. No se debe detectar Brave por userAgent para
   decidir nada: la decisión sigue siendo `tieneSoporte()`.
7. **Dato del usuario (15/09, segunda vuelta):** al aceptar no apareció
   NINGÚN toast, ni de éxito ni de error, y `showToast` sí existe en la
   página. Eso descarta una excepción (habría entrado al `catch`) y apunta
   a un `await` que nunca resuelve dentro de `escribirAlSave`. Sospechoso
   principal: `createWritable()` en `PES5_SAVE.escribir` disparando la
   burbuja de permiso de Chrome ("¿Permitir que el sitio edite archivos?")
   **después** del `confirm()`, cuando la activación del click ya venció:
   la burbuja queda esperando sin que la página muestre nada. Arreglo: pedir
   el permiso (punto 1) **antes** del `confirm()`, en el mismo click; y
   además instrumentar `escribirAlSave` con una línea en `#pl-log` por cada
   paso (`aplicando cambios`, `cifrando`, `pidiendo permiso`, `backup`,
   `escribiendo`, `verificando`) para que un cuelgue diga en qué paso está.
8. Punto menor: la barra de scroll horizontal de la tabla de Plantilla es
   visible (captura del usuario). Regla del proyecto: ocultarla y usar fade
   en los bordes, el contenedor sigue siendo scrolleable.
9. Reproducir el fallo antes de arreglarlo: en Chrome, con la carpeta
   `test-save-copy/`, capturar la excepción real (`e.name`) y anotarla en el
   reporte. Sospechosos por orden: permiso `readwrite` no concedido
   (`NotAllowedError` en `createWritable`), `cifrar()` lanzando por bytes
   inválidos, `escribirJugadorCompleto` lanzando por un valor fuera de rango
   que el clamp de `onCampoAttr` dejó pasar (p. ej. `escala8` con `0`).

**Pruebas (eval en `localhost:3001/prototipo_yunas/pes5-tool`, admin, carpeta `test-save-copy/`):**
1. Editar tres campos de un jugador con Enter entre cada uno:
   `document.activeElement` sigue siendo el input editado, `scrollY` no
   cambia, el checkbox "PES5 está cerrado" conserva su estado, la fila de la
   tabla muestra el valor nuevo con clase `changed`.
2. Click "Escribir al save" → el `confirm` contiene solo equipo y nombres.
3. Aceptar → aparece `test-save-copy/backups-tsc/KONAMI-WIN32PES5OPT.<ts>.bak`
   con el md5 del archivo previo, y el save de la copia tiene el md5 nuevo
   (verificar desde Node y pegar). `leerJugadorCompleto` sobre el archivo
   reescrito devuelve el valor editado.
4. Forzar un fallo (revocar el permiso desde el candado de Chrome, o
   `PES5_SAVE.escribir = async()=>{throw new Error('x')}` en consola) →
   el panel de error queda visible con nombre y mensaje.

**Después de C.2:** repetir la prueba tool → juego (instalar la copia
reescrita como save, abrir PES5, ver la altura editada).

---

### Slice D.R — reglas YunaCoins compartidas y cobro desde la tool (pregunta del usuario, 15/09)

**Por qué antes de D.** Las reglas de costo viven hoy **solo** en
`prototype-editor-jugador.html` (`bandCost99`, `costRange99`, `HEIGHT_CAPS`,
bono suscriptores, `canAfford`). El saldo vive por equipo en `teams.yunacoin`
y cada movimiento se registra en la colección `coins`
(`{teamId, teamName, mode:'add'|'sub', amount, reason, note, before, after, season, date}`,
ver `js/coins.js > saveCoinsTransaction`). Si Luis edita un jugador desde la
tool, el cobro tiene que salir de las **mismas** reglas y dejar el **mismo**
rastro que un pedido del presidente; si no, admin y público divergen.

**Archivos:** nuevo `tsc-src/js/yunacoins-rules.js`; `prototype-editor-jugador.html`
(pasa a usar el módulo, sin cambiar comportamiento); `pes5-tool.html`.

**Spec.**
1. `YUNACOINS_RULES` (módulo global, sin DOM): `costoAtributo(desde, hasta)`,
   `costoHabilidad(nombre)`, `costoAltura(...)` si aplica, `HEIGHT_CAPS`,
   `bonoSuscriptor(...)`, `costoCambios(jugadorOriginal, cambios)` → `{total, lineas:[{campo, de, a, costo}]}`,
   y `puedePagar(saldo, total)`. Los valores son **exactamente** los del
   editor de hoy: portarlos, no reinterpretarlos. Test Node
   `pes5/tools/test-yunacoins-rules.js` con 5 casos calculados a mano desde
   el editor actual.
2. El editor del presidente llama al módulo y **no cambia ningún número**
   (verificar con los mismos 5 casos en el navegador).
3. **Regla de cobro (decisión del usuario, 15/09): se cobra si y solo si el
   equipo tiene presidente.** "Tiene presidente" = existe un usuario con
   `users.teamId == team.id` (lo que la tool ya muestra en la columna
   Presidente). No depende de que el club esté vinculado ni de que el equipo
   esté activo.
   - **Con presidente:** el panel muestra costo por campo, total
     (`costoCambios`) y saldo del equipo (`teams.yunacoin`). Al escribir el
     save se registra en `coins` una transacción `mode:'sub'`,
     `reason:'mejora PES5 (admin)'`, `note:` = resumen de líneas, y se
     actualiza `teams.yunacoin`, **igual que `saveCoinsTransaction`**. Si el
     saldo no alcanza, no se escribe: aviso con el faltante. No existe
     "sin cobro": todo cambio a un equipo con presidente sale de su
     presupuesto.
   - **Sin presidente** (club PES5 sin equipo TSC, o equipo TSC sin usuario
     asignado): edición libre, sin cobro y sin transacción. Es el caso de
     uso de Luis para preparar el juego antes de asignar presidentes.
   - El panel indica siempre en qué modo está: badge "Se cobra a <equipo>
     · saldo N" o "Sin presidente · edición libre".
3 bis. **Nivelar plantillas:** se saca de D.R y se diseña completo como
   slice **G** (perfil de nivelación configurable), al final del plan, pendiente de que Luis confirme la regla. D.R solo
   deja el gancho: la acción existe únicamente para equipos sin presidente.
4. Las escrituras a `coins`/`teams` exigen `isAdmin()` en las reglas: probar
   logueado como admin y **borrar** las transacciones de prueba.
5. **Mapeo de los dos presupuestos del editor a datos reales (hueco detectado
   por el supervisor, 15/09).** El editor maneja `presidentWallet`
   (coins acumuladas), `budgetGeneral` (tope de gasto general por temporada)
   y `budgetSubscribers` (bono exclusivo para jugadores suscriptores, se
   habilita al agotar el general). En la web solo existe un saldo real:
   `teams.yunacoin`. Mapeo fijado:
   - `presidentWallet` = `teams.yunacoin` (dato real, nunca hardcodeado);
   - `budgetGeneral` y `budgetSubscribers` son **constantes de regla** (hoy
     50000/25000 en el módulo); quedan en `DEFAULT_RULES` hasta F, donde
     pasan a configuración editable por el admin;
   - **RESUELTO por el usuario (15/09): el bono es parte del saldo.** Modelo
     definitivo, con su ejemplo: el presidente tiene 400.000 yunas
     acumuladas (`teams.yunacoin`). Por temporada puede gastar en mejoras
     hasta un **tope general** (ej. 100.000) sobre cualquier jugador, más un
     **bono de suscriptores** (ej. 20.000) que solo se puede gastar en
     jugadores suscriptores. **Todo descuenta del saldo real**: la
     transacción en `coins` lleva `amount = fromGeneral + fromSub`.
     Orden de consumo:
       · jugador **suscriptor**: primero el bono; agotado el bono, sigue
         con el tope general sin problema;
       · jugador **no suscriptor**: solo el tope general.
     Así un suscriptor puede terminar por encima del nivel base del resto:
     es el incentivo buscado.
     **Esto invierte la lógica actual del editor** (`fromGeneral = min(cost,
     general)` primero y el bono "cuando el general llega a 0"): el módulo
     compartido implementa el orden nuevo y el editor lo hereda; el test
     de 5 casos se calcula con la regla nueva, no con la vieja.
     `puedePagar` = saldo real ≥ total **y** los topes de temporada no se
     exceden (general para todos; bono solo para suscriptores).
   - **Dónde vive lo gastado en la temporada:** no se agregan campos a
     `teams`; se deriva del libro `coins` filtrando `season` actual y
     `reason` que empiece con `'mejora PES5'`. Cada transacción de mejora
     lleva además `pes5: {playerId, playerName, subscriber, fromGeneral,
     fromSub, lineas}` para poder recomputar los topes y mostrar el
     historial en F. Los valores de los topes (`budgetGeneral`,
     `budgetSubscribers`) siguen como constantes de regla hasta F.
   - **Flag `subscriber` (dato del usuario, 15/09): un jugador es suscriptor
     si su nombre en el save empieza con `$`** (ej. `$TheRationalUser`). Es
     la convención que Luis ya usa dentro del juego. `leerJugadorCompleto`
     expone `subscriber: nombre.startsWith('$')` y la tool y el editor lo
     leen de ahí (la plantilla publicada lo hereda). El `$` se muestra tal
     cual en nombres, nunca se recorta ni se escribe de vuelta modificado.

**Pruebas (Node + eval en `localhost:3001`, admin):**
1. `test-yunacoins-rules.js`: 5 casos calculados a mano desde el editor
   viejo (costo de subir un atributo dentro de banda, cruzando banda, una
   habilidad, una altura dentro de cupo, y un caso que no alcanza el saldo).
2. Editor del presidente sobre la copia del save: los mismos 5 casos dan
   los mismos números antes y después del cambio (pegar valores).
3. Tool, equipo **con** presidente (FK Tupadre): editar un atributo →
   panel muestra costo, total y saldo; escribir → aparece una transacción
   `sub` en `coins` con `reason:'mejora PES5 (admin)'`, `teams.yunacoin`
   baja exactamente `total`, y el badge dice "Se cobra a …". Borrar la
   transacción y restaurar el saldo al terminar (producción).
4. Tool, saldo insuficiente (bajar `yunacoin` a 0 en la prueba): no escribe,
   aviso con el faltante, save de la copia con md5 intacto.
5. Tool, club **sin** presidente: badge "edición libre", escribir no crea
   ninguna transacción (`coins` cuenta igual antes y después).
6. `users-admin.js`, `firebase-config.js`, `cloudinary.js` sin diff.

---

### Slice D — sync bidireccional

**Archivos:** `pes5-tool.html` (pestañas 3 y 4), `prototype-editor-jugador.html`
(solo `cargarPlantillaReal` y la altura), `pes5-editor.js` si hace falta un
helper de serialización.

**Spec.**

*Juego → web (pestaña Publicar).* Para cada equipo TSC con `pes5Club`,
escribir `pes5_plantillas/{teamId}` con
`{ teamId, pes5Club, indiceClub, publicadoEn, hash: md5 del save, jugadores: [leerJugadorCompleto…] }`.
Incluye altura real. Toggle "auto-publicar al detectar guardado del juego"
(off por defecto). Mostrar por equipo la fecha de la última publicación y si
está desactualizada respecto del save actual (comparar `hash`).

*Web → juego (pestaña Pedidos).* Lista de `pedidos_pes5` con `estado ==
'pendiente'`, agrupados por equipo: jugador, líneas `label from → to`, costo,
fecha, presidente. Botón "Aplicar seleccionados": para cada pedido,
`escribirJugadorCompleto` con los cambios; un solo `PES5_SAVE.escribir` al
final; luego `update({estado:'aplicado', aplicadoEn, aplicadoPor: uid,
backup})` en cada pedido. Si un pedido no se puede aplicar (jugador ya no
está en el roster, valor fuera de rango), se marca `estado:'rechazado'` con
`motivo` y no se toca el save por ese pedido. Después de aplicar, ofrecer
"Publicar ahora" para cerrar el ciclo.

*Editor del presidente.* `cargarPlantillaReal` toma `altura` del documento
publicado (ya no un valor estimado) y el bloqueo de altura sigue igual.

**Pruebas:**
1. Publicar FK TUPADRE → leer el doc desde el editor del presidente
   (`localhost:3001/prototipo_yunas/prototype-editor-jugador`, cuenta con
   `teamId` 61) y ver la misma altura que la tool.
2. Crear un pedido de prueba desde el editor (cuenta presidente), aplicarlo
   desde la tool sobre una **copia** del save, verificar en la tool el valor
   nuevo y en Firestore `estado:'aplicado'`. Borrar el pedido de prueba al
   final (es producción).
3. Un pedido con jugador inexistente → `rechazado` con motivo, save intacto
   (md5 igual).
4. Cambiar el save desde Node mientras la tool está abierta → aviso de
   "guardado detectado"; con auto-publicar on, el doc se actualiza solo.

**Riesgos:** `localhost:3001` escribe en el Firestore **real**; usar equipo y
pedidos de prueba y limpiarlos. Las reglas exigen `isAdmin()` para
`pes5_plantillas` y para `update` de pedidos: probar logueado como admin.

---

### Slice F — sección pública: el presidente mejora a sus jugadores

**Cuándo.** Después de D, cuando el circuito admin cierra de punta a punta
(pedido → aplicar → save → publicar). Es la respuesta a "¿en qué momento
pasamos a la sección pública?": **F, antes de la limpieza E.**

**Qué es.** El editor del presidente deja de ser un prototipo suelto y se
integra como sección de la web 2.0 (overlay/página dentro de `index.html`,
misma navegación y auth que el resto), usando `YUNACOINS_RULES` (D.R) y
`pes5_plantillas`/`pedidos_pes5` (D). Contenido mínimo:
- saldo del equipo, bono de suscriptores y **reglas visibles** (tabla de
  precios por banda, cupos por altura, qué se puede y qué no);
- plantilla real con altura y estadísticas actuales, edición con costo en
  vivo y envío del pedido;
- historial del equipo: pedidos pendientes/aplicados/rechazados y las
  transacciones de `coins` (incluidas las hechas por el admin desde la tool,
  que aparecen con su `reason`).
Spec detallada se escribe al cerrar D, con lo aprendido.

---

### Slice E — limpieza

**Archivos:** borrar `pes5/admin-pes5.html`, `pes5/admin-tool-luis.html`,
`pes5/admin-vincular-equipos.html`, `pes5/test-browser-crypto.html`
(mover el test de round-trip a un botón "Diagnóstico" en la barra de estado
de la tool). Actualizar `pes5/README.md` (sección "Cómo se usa ahora" que
apunte a `pes5-tool.html`) y la tabla §7 de `WORKFLOW_2.0.md`.

**Pruebas:** `grep -r 'admin-pes5\|admin-tool-luis\|admin-vincular' tsc-src`
sin resultados; la tool sigue pasando las pruebas de C y D; `graphify update .`.

---

### Slice G — nivelación configurable (perfil de reglas de temporada) · PENDIENTE DE LUIS

**Estado:** diseñado, **no se implementa hasta que Luis confirme cómo quiere la regla** (decisión del usuario, 15/09). Va al final, después de E.

**Pedido del usuario (15/09).** Al arrancar una temporada, Luis empareja
todos los equipos. La regla no es fija ("todo a 80"): la última idea es
*"lo que está por encima de 80 baja a 80; lo que está por debajo queda en
79"*, para que el presidente vea cuáles eran los jugadores destacados, y
las habilidades especiales se pierden todas. Va a cambiar. Por eso la tool
no implementa una regla: implementa un **editor de perfiles de nivelación**
y un botón para aplicarlos, con previsualización obligatoria.

**Archivos:** `pes5-tool.html` (pestaña nueva "Nivelación"), nuevo
`tsc-src/js/pes5-nivelacion.js` (lógica pura, sin DOM, testeable en Node),
test `pes5/tools/test-nivelacion.js`, reglas Firestore (colección nueva
`pes5_reglas`, lectura pública, escritura admin) → desplegar a mano.

**Modelo del perfil (JSON, guardado en `pes5_reglas/{id}`):**

```
{
  id, nombre, actualizadoEn, actualizadoPor,
  atributos: {                       // los 27 de escala 0-99
    modo: 'bandas',                  // 'mantener' | 'fijo' | 'bandas'
    fijo: 80,
    bandas: [                        // cubren 0-99 sin huecos ni solapes
      { desde: 81, hasta: 99, resultado: 80 },
      { desde: 80, hasta: 80, resultado: 80 },
      { desde: 0,  hasta: 79, resultado: 79 }
    ],
    excepciones: ['Cualidades de portero']   // campos que NO se nivelan
  },
  escala8:     { modo: 'mantener' | 'fijo', fijo: 4 },
  habilidades: { modo: 'mantener' | 'quitar_todas' | 'conservar_lista', conservar: [] },
  altura:      { modo: 'mantener' | 'fijo' | 'tope', valor: 180 },
  edad:        { modo: 'mantener' },        // v1: solo mantener
  pieDominante:{ modo: 'mantener' },        // v1: solo mantener
  lesiones:    { modo: 'mantener' | 'fijo', valor: 'B' },
  posiciones:  { modo: 'mantener' },        // v1: solo mantener (ver problema 3)
  alcance: {
    soloSinPresidente: true,               // fijo en true, no editable
    soloClubesVinculadosATSCActivos: true, // si false: los 138 clubes
    jugadoresCompartidos: 'saltar' | 'aplicar'   // ver problema 2
  }
}
```

`PES5_NIVELACION.aplicar(bytes, perfil, contexto)` es pura: recibe los
bytes descifrados, el perfil y `{clubesObjetivo:[idx], equiposDelJugador}`,
devuelve `{bytes, resumen}` sin escribir nada. `previsualizar(...)`
devuelve solo el `resumen`:
`{ clubes: n, jugadores: n, porCampo: {campo: {cambiados: n}}, compartidos: [{id, nombre, clubes:[...]}], ejemplos: [{nombre, antes, despues}] }`.

**UI (pestaña Nivelación):**
1. Lista de perfiles guardados + "Nuevo" + "Duplicar". Editor de perfil con
   un bloque por tipo de campo. Las bandas se editan en una tabla chica con
   validación en vivo: deben cubrir 0-99 sin huecos ni solapes, si no, no se
   puede guardar. Perfiles precargados la primera vez: "Todo a 80" y
   "80/79 sin habilidades" (la regla actual de Luis).
2. "Previsualizar": muestra el resumen (clubes, jugadores, cambios por campo,
   10 ejemplos antes → después, lista de jugadores compartidos) **sin tocar
   el save**. Botón de exportar el resumen a CSV para que Luis lo revise
   fuera de la tool.
3. "Aplicar": exige previsualización hecha en esta sesión sobre el save
   actual (si el save cambió, hay que previsualizar de nuevo), checkbox
   "PES5 está cerrado", confirm con el resumen corto, un solo
   `PES5_SAVE.escribir` con backup. Registra en el perfil
   `ultimaAplicacion: {fecha, backup, resumen}`. Sin cobro: por definición
   solo toca equipos sin presidente.
4. El perfil aplicado queda marcado "vigente" para que F (sección pública)
   pueda mostrar "esta temporada se niveló con: …".

**Problemas que ya se ven y cómo se resuelven (decisiones tomadas):**
1. **Cualidades de portero.** Nivelar ese atributo a 80 en todos convierte a
   cualquiera en arquero utilizable y a los arqueros en mediocres. Por
   defecto va en `excepciones`. Regla general: `excepciones` existe para
   esto.
2. **Jugadores compartidos** (club + selección, o dos clubes): un registro
   único; nivelar el club nivela también la selección. Por defecto
   `'saltar'` y la previsualización los lista con nombre y clubes. Luis
   elige `'aplicar'` a conciencia.
3. **Posiciones.** Escribir posiciones implica reindexar la posición
   registrada (ya excluido en B). En v1 `posiciones` solo admite
   `'mantener'`; si Luis quiere tocarlas, se abre un slice propio con spec de
   reindexado.
4. **Altura con cupos.** El editor del presidente tiene cupos por franja de
   altura (`HEIGHT_CAPS`); si la nivelación fija alturas puede dejar un
   equipo violando los cupos. La previsualización avisa por equipo si el
   resultado viola `HEIGHT_CAPS` del módulo de reglas (D.R).
5. **Equipos con presidente en el medio.** Se saltan siempre y aparecen en
   el resumen como "saltado: tiene presidente". Nunca se editan por esta vía.
6. **Reversibilidad.** El backup automático es la vuelta atrás. Además, el
   resumen aplicado queda guardado. No hay "deshacer" dentro de la tool en
   v1.
7. **Bandas mal definidas.** Validación dura al guardar el perfil; el test
   Node cubre huecos, solapes y bordes (0, 79, 80, 81, 99).
8. **Alcance.** Por defecto solo los clubes vinculados a equipos TSC activos;
   los 138 clubes solo si Luis lo desmarca, y el resumen lo dice en grande.

**Pruebas:** test Node sobre una copia del save real con el perfil
"80/79 sin habilidades": ningún atributo fuera de {79,80} en los clubes
objetivo salvo `excepciones`, habilidades todas en 0, escala8/altura/edad/
pie/lesiones/posiciones idénticas, jugadores compartidos intactos con
`'saltar'`; `md5` del save real intacto; previsualizar no modifica bytes
(`md5` del buffer antes y después); en el navegador, aplicar sobre
`test-save-copy/` crea el backup y `leerPlantillaCompleta` devuelve los
valores nivelados.

**Orden:** D.R → D → F → E → **G**. Depende de D.R (`HEIGHT_CAPS`) y de las
reglas Firestore de `pes5_reglas`.

---

## 4. Riesgos globales

- **Escribir el save del juego.** Solo en el slice D se toca el save real, y
  siempre con backup verificado. Hasta entonces, copias.
- **Producción.** `localhost` pega contra `tsc-web-yuna` real. Cualquier
  doc de prueba se borra al terminar la prueba.
- **Navegador.** File System Access API solo en Chrome/Edge. La APK
  (WebView Android) no la tiene: la tool es de escritorio; no hace falta
  que funcione en la app.
- **Rutas.** Un nivel de `../` de más ya costó una pantalla negra. Todas las
  páginas de `prototipo_yunas/` usan `../js/`; las de `pes5/` (mientras
  existan) `../../js/`.

## 5. Qué se necesita del usuario

- Aprobar cada slice antes de que Sonnet empiece (protocolo).
- Para B.3 y D: abrir PES5 con la copia editada y confirmar que carga y que
  el jugador muestra el valor nuevo.
- Para D.1 y D.2: una cuenta presidente de prueba con `teamId` vinculado
  (hoy: FK TUPADRE, `teamId` 61).

## 6. Próximo paso — primera iteración: slices A, B y C juntos

Decisión del usuario (2026-09-15): como A, B y C **no tocan el save del
juego** (solo copias en una carpeta de prueba), van en **una sola iteración**
de Sonnet:

1. Sonnet presenta **un solo** plan con archivos y riesgos para A+B+C y espera
   **una** aprobación.
2. Implementa A, luego B, luego C, en ese orden. Al cerrar cada slice entrega
   diff summary, pruebas con salida real y evidencia, y **sigue sin esperar**
   al siguiente. Opus revisa cada cierre por su cuenta y puede frenar la
   iteración si algo no cierra.
3. La prueba B.3 (abrir PES5 con una copia editada) se hace **después de C**,
   con la tool ya armada, para no interrumpir la iteración.
4. Regla que no cambia: en A-C, la carpeta que se elige en `PES5_SAVE` es una
   **carpeta de prueba con una copia** del save. La del juego recién en D.

**Estado 2026-09-15:** A+B+C commiteados (`ce25234`). C.1 commiteado (`23e3d37`) y probado en el juego: juego → tool OK; tool → juego falló (ver C.2). C.2 commiteado (`4787c0b`) y prueba tool → juego OK (15/09). Sigue **D.R** (reglas compartidas + cobro), luego **D**, luego **F** (sección pública), **E**, y **G** (nivelación configurable) cuando Luis confirme la regla. Un slice por aprobación.
