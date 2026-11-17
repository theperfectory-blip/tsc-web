# SYNC-1 · Sincronización save → web (Tool PES5)

Encargo del coordinador («Pedido de Jimbo»): simplificar la sincronización save → web en la Tool PES5 (`tsc-src/js/pes5-tool.js`). Rama `dev`, worktree `emparejar-80`. Sin PR ni deploy.

## Estado

**Implementado. Verificado con tests y lectura de código. No verificado de punta a punta en el sandbox** (ver «Lo que no se pudo probar»).

## Cambios

### 1. Barra de arriba: «Actualizar save»
- «Reconectar» y «Recargar» se juntan en un solo botón `ptActualizarSaveClick()` → `actualizarSaveClick()` en `pes5-tool.js`.
- Si `PES5_SAVE.permisoVigente()` da `true` (permiso vigente, sin diálogo), recarga. Si no, llama a `recuperarCarpeta()` (pide permiso) y después recarga.
- La recarga mantiene lo de antes: `cargarSaveDesdeCarpeta()` (que revisa las desactualizadas), `releerPlantillaAbierta()`, `renderEquiposTab()`.
- `pes5-save.js`: nueva función `permisoVigente()` (`queryPermission`, sin pedir permiso).

### 2. «Publicar save» (un solo botón)
- Reemplaza «Subir save» (barra de pausa), «Publicar ahora» (aviso amarillo) y «Publicar todos» (pestaña Pedidos). El botón por equipo individual se queda.
- Al confirmar, en este orden (`_ejecutarPublicarSave`):
  - **a)** relee el archivo de la carpeta (`cargarSaveDesdeCarpeta()`, que devuelve los bytes leídos);
  - **b)** publica las plantillas que cambiaron con `_escribirPlantillas()`, sobre todos los equipos TSC activos con `pes5ClubIdx` (incluye equipos sin presidente). `debeReescribirPublicacion` salta las iguales. Si un equipo sin plantilla publicada aparece como «Nunca», cuenta como cambiado;
  - **c)** sube el save a Storage con `SAVE_PUBLICADO.subirBlob()`, usando los **mismos bytes** que quedaron en memoria en el paso a;
  - **d)** si la casilla «Reanudar mejoras al terminar» está marcada (y solo aparece si las mejoras están pausadas) reanuda con `escribirPausaTool(false)`, que ahora devuelve `true`/`false`.
- Si un paso falla, se detiene. El diálogo de resultado lista «Quedó hecho» y «No quedó hecho». No se reanuda si algo falló antes.
- La confirmación muestra: N plantillas cambiadas, la fecha y el autor del save que se reemplaza, y la casilla de reanudar.

### 3. Guardas en la confirmación
- **Pedidos pendientes de equipos que cambian:** aviso «quedarán viejos». Se calcula con `PES5_PLANTILLA.pedidosDeEquipos()` sobre `pedidos_pes5` con `estado == pendiente`.
- **Save más viejo que el publicado:** aviso fuerte «Tu save es más viejo que el publicado…». Se calcula con `PES5_PLANTILLA.saveMasViejoQuePublicado(localLM, pub)`.
  - Con `pes5_config/save.lastModified` (subidas desde SYNC-1): compara contra ese valor, es decir, la fecha del archivo que se subió.
  - Sin ese campo (publicación anterior): compara contra `subidoEn`. Ojo: como `subidoEn` es la hora del servidor, **un save recién subido por código viejo sale como «más viejo» contra su propia subida**. Es un falso positivo que desaparece al volver a publicar con SYNC-1. Se decidió no omitir la guarda en ese caso.
- Con cualquier aviso, el botón dice «Publicar igual». Con el aviso fuerte, es rojo.

### Reglas y datos
- `pes5_config/save` guarda además `lastModified` (number, ms; `null` en subidas viejas). `save-publicado.js` lo escribe y lo lee (`_normalizar`).
- **No hizo falta cambiar `firestore.rules`:** `pes5_config/{id}` ya es escritura solo admin, sin allowlist por campo. Tampoco cambió Storage.

## Hallazgos
- **«Subir save» no funcionaba:** `ptSubirSaveClick` no estaba expuesto en `window`, así que el handler `data-onclick` fallaba. Se reemplazó por `ptPublicarSaveClick`, que sí está expuesto. No se pudo confirmar el fallo en el navegador (ver abajo).
- Quedan en el código los nombres `pt-status-actions`, `pt-aviso`, `pt-chk` y `pt-pub-save-ov`. Los estilos nuevos van en `tsc-src/css/pes5-tool.css` (bajo `.confirm-box`, porque el diálogo va en `body`).

## Tests y comprobaciones

| Comprobación | Resultado |
|---|---|
| `node --test tools/test-sync-1.js` (nuevo: `saveMasViejoQuePublicado` y `pedidosDeEquipos`) | **6/6 OK** |
| `node --test "tools/test-*.js"` (suite completa) | 1 falla: `tools/test-jugador-completo.js` («Berbatov encontrado en el save»). Lee el save real de la PC del admin (`Documents/KONAMI/…/folder1`) y no toca los archivos de este cambio. Es dependiente del dato local; no se corrió sobre la base para comparar |
| `node --check` sobre `pes5-tool.js`, `pes5-save.js`, `save-publicado.js`, `pes5-plantilla.js` | OK |
| `node scripts/audit-wiring.mjs` | rotos 0 · fuera de gramática 0 · muertas 3 · duplicados 0 · IDs 1 (las mismas categorías que antes) |
| `node scripts/smoke-parity.mjs` | **PARIDAD: OK** · 0 errores de carga en `tsc-src` y `dist` |

### Lo que no se pudo probar
- **Flujo completo en el sandbox (:3001 / emuladores):** la Tool necesita abrir la carpeta del juego (File System Access), que el navegador del panel no puede manejar. Tampoco hay Storage en el sandbox. Se copió el código al `sandbox/site` (gitignored), pero el navegador del panel no pudo navegar a `localhost:3002` («denied or failed»). Los puertos 8080 (Firestore, Java) y 9099 (Auth) ya los usa otro proceso, y el 3001 también; no se tocaron.
- No se probó: la subida a Storage, la reanudación real, el aviso de pedidos, el de save viejo, ni el resumen con errores a mitad de camino.

## Archivos que no son de este cambio
- `android/app/capacitor.build.gradle`, `android/capacitor.settings.gradle` y `docs/reportes/MS-2.3-cableado.md` ya estaban modificados (sin commitear) al entrar al worktree. **`scripts/audit-wiring.mjs` reescribió `docs/reportes/MS-2.3-cableado.md`** (fecha y conteos). Ese archivo no se commitea en este encargo.

## Para decidir o hacer a mano
- Probar en una PC con el save real: Actualizar save, Publicar save (con y sin cambios), la casilla de reanudar, y el aviso de save viejo.
- Decidir si el falso positivo de la guarda en publicaciones viejas (sin `lastModified`) se acepta hasta la próxima publicación.
