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
B (lectura/escritura completa de jugador) ┴─> C (UI unificada) ─> D (sync bidireccional) ─> E (limpieza)
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

### Slice D — sync bidireccional

**Archivos:** `pes5-tool.html` (pestañas 3 y 4), `prototype-editor-jugador.html`
(solo `cargarPlantillaReal` y la altura), `pes5-editor.js` si hace falta un
helper de serialización.

**Spec.**

*D.0 · Solo equipos activos (decisión del usuario, 2026-09-15).* En la tool,
la pestaña Equipos, el selector de la pestaña Plantilla ("Equipos TSC
vinculados") y el bucle de Publicar consideran únicamente equipos con
`status !== 'INACTIVO'` (si el campo falta, cuenta como activo, igual que en
`teams.js`). Un inactivo no aparece para vincular ni se le publica plantilla;
si ya tenía `pes5Club`, el dato se conserva en Firestore, solo deja de
listarse. **Alcance: exclusivamente esta tool.** El admin de usuarios de la
web (`js/users-admin.js`, asignar equipo a presidente) está en producción y
**no se toca** en este macro.

*D.0 bis · Contador de ediciones.* `escribirJugadorCompleto` debe saltar los
campos cuyo valor nuevo es igual al actual y no incrementar `+0x32` si no
escribió nada real.

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

### Slice E — limpieza

**Archivos:** borrar `pes5/admin-pes5.html`, `pes5/admin-tool-luis.html`,
`pes5/admin-vincular-equipos.html`, `pes5/test-browser-crypto.html`
(mover el test de round-trip a un botón "Diagnóstico" en la barra de estado
de la tool). Actualizar `pes5/README.md` (sección "Cómo se usa ahora" que
apunte a `pes5-tool.html`) y la tabla §7 de `WORKFLOW_2.0.md`.

**Pruebas:** `grep -r 'admin-pes5\|admin-tool-luis\|admin-vincular' tsc-src`
sin resultados; la tool sigue pasando las pruebas de C y D; `graphify update .`.

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

D y E vuelven al protocolo normal: un slice por aprobación.
