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
| `node scripts/audit-wiring.mjs` (con el auditor ampliado, ver arriba) | rotos 0 · **sin window 0** · fuera de gramática 3 · muertas 9 · duplicados 7 · IDs 3. Antes de ampliarlo, sobre los archivos de `index.html`: 0 / 0 / 3 / 3 / 1 |
| `node scripts/smoke-parity.mjs` | **PARIDAD: OK** · 0 errores de carga en `tsc-src` y `dist` |

### Lo que no se pudo probar
- **Flujo completo en el sandbox (:3001 / emuladores):** la Tool necesita abrir la carpeta del juego (File System Access), que el navegador del panel no puede manejar. Tampoco hay Storage en el sandbox. Se copió el código al `sandbox/site` (gitignored), pero el navegador del panel no pudo navegar a `localhost:3002` («denied or failed»). Los puertos 8080 (Firestore, Java) y 9099 (Auth) ya los usa otro proceso, y el 3001 también; no se tocaron.
- No se probó: la subida a Storage, la reanudación real, el aviso de pedidos, el de save viejo, ni el resumen con errores a mitad de camino.

## Por qué audit-wiring no detectó «Subir save» (y cambio en el auditor)

Hubo dos huecos, y los dos explican el fallo:

1. **La Tool no se auditaba.** `scripts/audit-wiring.mjs` lee los `<script>` de `index.html`. `js/pes5-tool.js` no va ahí: lo carga a demanda `js/pes5-admin.js` con `createElement('script')`. Por eso el auditor nunca vio `pes5-tool.js`, ni `pes5-save.js`, `save-publicado.js`, `pes5-plantilla.js` ni `mejoras-page.js`.
2. **El auditor contaba como «definida» cualquier función de primer nivel.** `ptSubirSaveClick` existía dentro de la IIFE de `pes5-tool.js`, pero `js/events.js` resuelve `data-onclick` con `window[fn]`. Sin `window.ptSubirSaveClick =`, el click no hace nada. La sección 1 no lo ve porque sí está definida.

**Cambio en el auditor (SYNC-1):**
- Escanea también los archivos cargados a demanda: cualquier literal `'js/….js'` que aparezca en `tsc-src/js/`.
- Nueva sección **1a · «Handlers data-on* que no son window.<nombre>»**. Un nombre es de `window` si lo asigna `window.nombre =` en algún archivo, o si es `function`/`var` de primer nivel **fuera de un IIFE** (los rangos `(function(){ … })();` se miden por región, no por archivo).
- Resumen de consola: `… · sin window N · …`.

**Verificado:** sobre la versión de `pes5-tool.js` anterior a SYNC-1 (commit `8791eb5`), el auditor marca `ptSubirSaveClick` en `js/pes5-tool.js:2554`. Sobre el código actual: `sin window 0`.

**Hallazgos nuevos que el auditor ahora ve (no se tocaron en SYNC-1):**
- `js/mejoras-page.js:110`, `:2845`, `:2846`: handlers `data-onclick` fuera de la gramática de `events.js` (`if(event.target===this)…`, `${onDec}` con `stopPropagation`). Como no cumplen la gramática, no corren.
- Duplicados de nombres globales: `showToast`, `openModal`, `closeModal`, `toggleTheme`, `renderAuthUI` están en `ui-utils.js`/`auth.js` **y** en `mejoras-page.js` (de primer nivel). Si `mejoras-page.js` se carga después, pisa la versión global. Hay que confirmar si es un problema real en el panel admin.
- Muertas en la Tool: `costoJugador`, `costoTotalPendienteEquipo`, `_cambiosDe` (pre-existentes).
- Límite del auditor: las secciones 2 y 3 todavía cuentan funciones internas de IIFE como globales (p. ej. `montar`, `cargarReglasFirestore`). Son falsos positivos posibles; la sección 1a sí usa la región.

## Prueba con click real en el sandbox: no se pudo hacer

- El navegador integrado sirve `sandbox/site` solo en el puerto que informa el log del servidor (`localhost:61649` en esta corrida; `localhost:3002` lo bloquea). Con `?emu=1` la página carga sin errores de consola.
- El login admin del emulador falla con `auth/network-request-failed`: el navegador integrado no llega a `localhost:9099` (Auth) ni a `localhost:8080` (Firestore). Sin login no se llega a la página de la Tool.
- Por eso **no se hizo el click real de «Publicar save» ni de «Actualizar save»**. Lo que sí se verificó: el código está en `window` (sección 1a en 0) y `node --check` pasa.
- Pendiente: repetir el click real con un navegador que sí alcance los emuladores (p. ej. Chrome de Claude en Chrome, si Jimbo lo autoriza), o en la PC de Jimbo.

## SYNC-1b · auditor de cableado: IIFE y comentarios

Encargo del coordinador: que `audit-wiring` marque `ptSubirSaveClick` como roto con el código de antes de SYNC-1, y dé 0 rotos con el actual.

**Qué cambió en `scripts/audit-wiring.mjs`:**
- **IIFE por región, no por archivo.** Un IIFE de primer nivel va de `(function(){` o `(() =>` en columna 0 hasta el `})();` siguiente. Una `function`/`var` de primer nivel cuenta como global solo si está **fuera** de esos rangos (en `bracket.js` hay código de primer nivel después del IIFE, y eso sí es global). Solo `window.X =` cuenta siempre.
- **Sección 1a «sin window»** (ya existía desde SYNC-1): un `data-on*` cuyo nombre no es propiedad de `window`. `events.js` resuelve con `window[fn]`, así que esa función no se ejecuta.
- **Comentarios ignorados:** un `on…="…"` dentro de una línea de comentario (`//`, `/*`, `*`) no es un handler. Antes marcaba `mejoras-page.js:110`, que es texto de un comentario.
- **Placeholders de sentencia:** un `${…}` al inicio o tras `;` se toma como llamada, no como `0`. Así `event.stopPropagation();${onDec}` (`mejoras-page.js:2845-2846`) se parsea como lo que es en runtime (`adjustMain('k',-1)`). Antes daba un error falso «se esperaba id».
- **El total «rotos» suma las dos clases** (no definidas + sin window) y el desglose va entre paréntesis.

**Verificación:**

| Código | Resultado |
|---|---|
| Antes de SYNC-1 (`git show 8791eb5:tsc-src/js/pes5-tool.js` en un temporal, resto del código actual) | `rotos 1 (no definidas 0 · sin window 1)`. Marca **`ptSubirSaveClick`** en `js/pes5-tool.js:2554` |
| Actual (`2e3c191` + este cambio) | `rotos 0 (no definidas 0 · sin window 0) · fuera de gramática 0` |
| `node scripts/smoke-parity.mjs` | PARIDAD: OK |

**Hallazgos reales que salieron:** ninguno de tipo «roto» en el código actual. Los dos falsos positivos de `mejoras-page.js` (comentario y placeholder) ya no salen.

**Lo que el auditor sigue reportando, sin tocar (no es «roto» para el encargo):**
- Muertas (sección 2, 9): `costoJugador`, `costoTotalPendienteEquipo` y `_cambiosDe` en `pes5-tool.js`; `isPresident`, `liveAvailable`, `_formationKey`, `sectionKeyOfSlot`, `clearAuditLog`, `setPalmaresMedia`. Pueden usarse por nombre dinámico: verificar antes de borrar.
- Duplicados entre archivos (sección 3, 7): `showToast`, `openModal`, `closeModal`, `toggleTheme`, `renderAuthUI` en `mejoras-page.js` contra `ui-utils.js`/`auth.js`. Si `mejoras-page.js` carga después, pisa la versión global. Pendiente confirmar en el panel admin. `cargarReglasFirestore` y `montar` también aparecen dos veces, pero uno de los dos está dentro de un IIFE: falso positivo de la sección 3 (no usa la región).
- IDs (sección 4, 3): `bulk-${m}-btn` en `coins.js`, `mej-save-pub` y `mej-host` en `mejoras-page.js`. Heurística; no confirmado.

**Reporte generado:** `docs/reportes/MS-2.3-cableado.md` es la salida de esta corrida, así que va en el mismo commit.

## Archivos que no son de este cambio
- `android/app/capacitor.build.gradle` y `android/capacitor.settings.gradle` ya estaban modificados (sin commitear) al entrar al worktree. No son de SYNC-1 y no se commitean.
- `docs/reportes/MS-2.3-cableado.md` es ahora la salida del auditor en el último commit (ver SYNC-1b).

## Para decidir o hacer a mano
- Probar en una PC con el save real: Actualizar save, Publicar save (con y sin cambios), la casilla de reanudar, y el aviso de save viejo.
- Decidir si el falso positivo de la guarda en publicaciones viejas (sin `lastModified`) se acepta hasta la próxima publicación.
