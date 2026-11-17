# SAVE-1 · El save publicado: Luis sube, los presidentes descargan

**Rama:** `dev` (worktree `emparejar-80`). **Sin PR ni deploy.**
**Pedido por:** coordinador TSC Web (Luis sube el save; los presidentes lo descargan; se guarda solo el último).

## Qué hace

- **Subir (admin, Tool PES5):** botón «Subir save» junto a «Pausar mejoras». Sube el save que la Tool ya tiene abierto (lee el archivo de la carpeta ya elegida, sin pedirlo de nuevo). Antes de subir, confirm: «Reemplaza el save publicado del <fecha>». Después, toast y la fecha nueva visible en la barra. Sin save abierto, el botón queda deshabilitado con un hint.
- **Bajar (presidente, Mejoras):** barra arriba del editor con «Último save publicado: <fecha> · por <nombre>» y el botón «Descargar save». Sin save publicado, el botón queda deshabilitado con el texto «Aún no hay save publicado».
- **Almacenamiento:** una sola ruta fija, `pes5_save/actual` en Firebase Storage. Cada subida reemplaza a la anterior. Metadatos en `pes5_config/save` = `{subidoPor, subidoEn, tamano, nombreArchivo}`.

## Archivos

| Archivo | Cambio |
|---|---|
| `firebase/storage.rules` | `match /pes5_save/actual` antes del catch-all. Escritura: solo admin (`firestore.get(users/{uid}).data.role == 'admin'`) y `request.resource.size <= 4 MiB`. Lectura: sesión con rol `president` o `admin`. Anónimo no. |
| `firebase/firestore.rules` | **Sin cambios.** `pes5_config/{id}` ya permite leer con sesión y escribir solo al admin, así que `pes5_config/save` queda cubierto. |
| `firebase.json` | `emulators.storage.port = 9199` (puerto explícito; no toca 8080 ni 9099). |
| `tsc-src/js/save-publicado.js` (nuevo) | Módulo `SAVE_PUBLICADO`: `subirBlob(blob, datos)` (aislada para probarla con un Blob de prueba), `leerMeta`, `suscribir`, `descargar`, `montarBarra`. Storage se carga bajo demanda (`firebase-storage-compat` 12.14.0 desde gstatic) y apunta al emulador en modo local. |
| `tsc-src/js/pes5-admin.js` | Agrega `js/save-publicado.js` a la carga perezosa de la Tool, antes de `pes5-tool.js`. |
| `tsc-src/js/pes5-tool.js` | `renderPausaTool`: botón «Subir save» y línea «Save publicado». `ptSubirSaveClick` (confirm) y `ptSubirSaveConfirmado` (sube `PES5_SAVE.leer()`). `cargarSaveDesdeCarpeta` vuelve a pintar la barra para habilitar el botón. |
| `tsc-src/mejoras.html` | Contenedor `#mej-save-pub`, estilos de la barra, `<script>` de `save-publicado.js`. |
| `tsc-src/js/mejoras-page.js` | `_montarBarraSave()` al iniciar y en cada cambio de sesión (`tsc:auth`). En el panel no hace nada (no existe el contenedor). |
| `tsc-src/css/pes5-tool.css` | Estilos de acciones y hint de la barra de la Tool. |
| `functions/test/rules-storage.js` | Casos de SAVE-1: anónimo, sin rol, presidente y admin, en lectura, escritura, tope exacto (4 MiB) y tope + 1 byte, y borrado. Siembra `users/` en Firestore. |
| `functions/test/rules-pes5.js` | Bloque SAVE-1 sobre `pes5_config/save`: presidente no escribe, admin escribe, presidente y anónimo leen (anónimo no), presidente no reemplaza ni borra. |
| `functions/package.json` | `test:rules:storage` levanta `storage,firestore` (las reglas de Storage consultan el rol en Firestore). |
| `tsc-src/graphify-out/GRAPH_REPORT.md` | Regenerado con `graphify update .` (solo AST) y etiquetas de `scripts/graphify-label.py`. |

## Qué hay que desplegar a mano

1. **Reglas de Storage:** `firebase deploy --only storage`. Sin esto, la subida y la descarga fallan con permiso denegado.
2. **Reglas de Firestore:** nada. No cambiaron.
3. **Functions:** nada.
4. **Hosting:** lo hace el CI al mergear a `main`. No lo toqué.

## CSP

**No hace falta cambiarla.** Revisé `scripts/csp.mjs`:

- `script-src` ya incluye `https://www.gstatic.com`, de donde se carga el SDK de Storage.
- `connect-src` ya incluye `https://firebasestorage.googleapis.com`, que usan la subida, `getDownloadURL` y el `fetch` de la descarga.
- La descarga crea un `blob:` para el anchor, y eso no lo restringe la CSP.
- `node scripts/csp.mjs --check`: **OK** (firebase.json coincide con la política).

Solo en modo emulador (sandbox) hace falta que `connect-src` acepte `localhost:9199`, igual que ya acepta 8080/9099. No se agregó a la política de producción.

## Decisiones que conviene revisar

- **Nombre de la descarga sin extensión.** El save del juego no tiene extensión (`KONAMI-WIN32PES5OPT`). Pedí `TSC-save-<fecha>.<ext>`, pero sin extensión quedaría un punto final. La descarga se llama `TSC-save-AAAA-MM-DD_HHMM` y la barra avisa: «Para usarlo, ponlo en la carpeta del juego con el nombre KONAMI-WIN32PES5OPT». Si Jimbo prefiere otro nombre, se cambia en `nombreDescarga`.
- **Tope de 4 MiB.** El save real pesa 1.250.304 bytes. Así queda un margen de más de 3 veces.
- **`subidoPor` es el nombre visible del admin**, no el correo, porque la lee cualquier presidente.
- **La forma de `pes5_config/save` no la valida la regla.** La regla existente de `pes5_config` es permisiva para el admin, y como no se pueden cambiar reglas existentes, no se puede restringir ese doc con un `match` más específico (las reglas se suman). Solo el admin lo escribe.
- **Subida del save abierto:** `PES5_SAVE.leer()` vuelve a leer el archivo de la carpeta ya elegida (los bytes cifrados, tal cual están en disco). La Tool no guarda los bytes crudos, solo el texto descifrado, así que no podía reusar un buffer en memoria.
- **`tierClass99` no se tocó.** Es el color de la tarjeta por nivel (`v<=79`), no el costo.

## Verificación

**Lo que sí se verificó**

- `node --check` de `save-publicado.js`, `pes5-tool.js`, `mejoras-page.js`, `pes5-admin.js` y `yunacoins-rules.js`: sin errores.
- `node scripts/csp.mjs --check`: OK.
- `npm run test:rules:storage` levanta el emulador de Storage con las reglas nuevas y **compila** (el emulador arranca sin error de reglas).

**Lo que NO se verificó, y por qué**

- **El emulador de Firestore no arranca en esta máquina.** Falla con `java.net.SocketException: Invalid argument: connect` al abrir el selector de Netty (ruta `UnixDomainSockets` del JDK 21 en Windows). Lo probé con `JAVA_TOOL_OPTIONS=-Djava.net.preferIPv4Stack=true`, con `-Djava.io.tmpdir` corto y desde PowerShell, y falla igual. Como las reglas de Storage consultan el rol en Firestore, **los casos de admin y presidente de `rules-storage.js` y el bloque nuevo de `rules-pes5.js` no corrieron aquí.** Sí corren en el CI (Linux, `rules-tests.yml`). Hay que mirarlos ahí antes de desplegar.
- **Sandbox (UI):** no se levantó, porque depende del emulador de Firestore (el mismo problema). La subida de la Tool no es probable en automático (usa `showDirectoryPicker`). La descarga de Mejoras y la barra no se probaron en el navegador.
- **Descarga desde `firebasestorage.googleapis.com` con `fetch`:** no se probó contra el servicio real. Si Storage no devuelve CORS a ese origen, `fetch` fallará. En ese caso el fallback es abrir `getDownloadURL` directamente.

## SAVE-1b · ajustes de la auditoría

Cambios pedidos por el coordinador. Reemplazan lo descrito arriba sobre la descarga; lo demás sigue igual.

**1. Descarga sin `fetch` ni blob.** Antes, la descarga usaba `getDownloadURL` + `fetch` + blob. Eso necesita CORS en el bucket de Storage, y no lo vamos a configurar (`gsutil cors set`). Ahora:

- `subirBlob` sube con `contentType: 'application/octet-stream'` y `contentDisposition: 'attachment; filename="KONAMI-WIN32PES5OPT"'`. Esa cabecera hace que el navegador guarde el archivo ya con el nombre del juego.
- En Mejoras, la barra resuelve la URL con `getDownloadURL` y muestra un `<a href>` a esa URL. Es una navegación, así que no necesita CORS.
- Si `getDownloadURL` falla (por ejemplo, todavía no hay archivo), el botón queda deshabilitado con «No se pudo preparar la descarga».
- Texto de la barra: «Se descarga como KONAMI-WIN32PES5OPT: reemplaza el de la carpeta del juego (haz una copia del tuyo antes)».
- Eliminados `nombreDescarga`, `descargar`, `window.saveDescargarClick` y el código de blob. Ya no queda ningún `fetch` ni `Blob` de descarga en `save-publicado.js`.
- CSP: sin cambios. La navegación a la URL no pasa por `connect-src`.
- Consecuencia: el archivo que ya esté en Storage sin `contentDisposition` (si se subió antes de este cambio) no tendrá el nombre. Hay que volver a subirlo. SAVE-1 no está desplegado, así que no hay archivos viejos en producción.

**2. Tests de reglas: intento de levantar el emulador.**

- Configuración temporal en el scratchpad: Firestore en 8190 y Storage en 9199. No se usaron 8080 ni 9099.
- Desde el shell de este entorno (Bash y PowerShell) el emulador de Firestore vuelve a fallar. `java.lang.IllegalStateException: failed to create a child event loop` → `Unable to establish loopback connection` → `SocketException: Invalid argument: connect` en `UnixDomainSockets.connect`. Confirmado en aislamiento: un `Pipe.open()` de Java funciona, pero `Selector.open()` falla con el mismo mensaje. Es el selector de Netty/JDK, no el código del proyecto.
- En la terminal del usuario (fuera del sandbox) el CLI intentó descargar el emulador v1.22.0 (137 MB). La descarga iba al 9 % cuando la cancelé: es demasiado lenta para esperarla aquí. Por eso no pude correr `rules-storage.js` ni el bloque SAVE-1 de `rules-pes5.js`.
- **Estado: sin resultado de tests.** No hay PASS que reportar para `rules-storage.js` ni para el bloque SAVE-1 de `rules-pes5.js`. El coordinador puede correrlos con la configuración temporal de arriba.

## Pendientes

- **Tests de reglas, resultados:** corridos por el coordinador (no por mí). `test:rules:storage` (incluye `rules-storage.js`): **24/24**. `test:rules` (incluye el bloque SAVE-1 de `rules-pes5.js`): **99/99**.
- **Cómo correrlos en esta máquina:** el emulador de Firestore necesita el directorio de sockets AF_UNIX. Antes de correr los tests, exportar `JAVA_TOOL_OPTIONS="-Djdk.net.unixdomain.tmpdir=C:/Users/Administrator/.cache/firebase"` (igual que `scripts/emu-start.mjs`).
- Desplegar `firebase deploy --only storage` antes de probar con Jimbo.
- Jimbo prueba con el save real: subir desde la Tool y descargar desde Mejoras con un presidente. Hay que comprobar que el navegador guarda el archivo como `KONAMI-WIN32PES5OPT`.
