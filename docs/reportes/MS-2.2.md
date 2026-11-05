# MS-2.2 · Paridad `tsc-src` / `dist` · 2026-10-10

Hallazgo que cierra: H-20. Primera versión de Sonnet 5.5, revisada y
corregida por Opus 5.5 en la misma sesión: la prueba negativa original no
era válida (ver "Revisión").

## Cambios

- `scripts/smoke-parity.mjs` (solo desarrollo): reconstruye `dist/` con
  `build-web.mjs`, carga los `<script>` de `tsc-src` y de `dist` en el mismo
  orden dentro de un contexto `vm` con DOM simulado y Firebase ausente (como
  si `gstatic` estuviera bloqueado) y compara:
  - globales (function/var y let/const/class);
  - listeners registrados al cargar (`addEventListener` en window, document
    y elementos), como multiconjunto;
  - errores de carga.
  Sale con código 1 si algo difiere.
- `scripts/build-web.mjs`: acepta `--src=` y `--dest=` (relativos a la
  raíz). Sin ellos, igual que siempre (`tsc-src` → `dist`).
- `scripts/emu-dist.mjs` + config `tsc-emu-dist` en `launch.json`: la
  variante `dist` en el sandbox (ver MS-2.1, revisión).

## Resultado (código actual)

| Variante | Scripts | Globales | Listeners | Errores de carga |
|---|---|---|---|---|
| `tsc-src` | 38 | 902 | 26 | 0 |
| `dist` | 10 (9 bundles + inline) | 902 | 26 | 0 |

## Pruebas negativas

Un `throw` temporal en un archivo, revertido después de cada corrida:

| Dónde | Qué corta en `dist` | Resultado |
|---|---|---|
| Inicio de `nav.js` (2.º de `app-02`) | Los 6 archivos que le siguen en el bundle | **FALLA**: 16 globales faltan en `dist` (`COMP_TYPES`, `PHASE_TYPES`, `initPublicScrollShell`…) y un listener `document:DOMContentLoaded` |
| Final de `livematch.js` (1.º de `app-09`) | `apk-promo.js` | **FALLA**: 4 globales y el listener `document:tsc:boot-ready` |
| Final de `matches.js` (último de `app-02`) | Nada | OK, como corresponde |

## Revisión

- La primera versión citaba como prueba negativa un `throw` al final de
  `matches.js`. Ese archivo es el **último** de su bundle, así que no corta
  nada, y el script daba `PARIDAD: OK`. El reporte no lo decía. La prueba
  válida es la de `nav.js` de arriba.
- El único error de carga de la primera versión
  (`document.fonts.ready.then`) venía del stub y cortaba el script inline
  del splash en las dos variantes. El stub ahora devuelve una promesa para
  `fonts.ready` y un objeto para `new Image()`/`new Audio()`, y el inline
  corre entero (0 errores; por eso son 902 globales y no 900).
- Se quitó código muerto (`stubs`, `win`, `existsSync`).

## Puntos ciegos

- Un archivo que solo declara `function`: el navegador las define igual por
  hoisting, aunque el bundle se corte antes. No se detecta, pero tampoco
  rompe.
- El código que solo corre con el SDK de Firebase cargado: el smoke corre
  sin SDK.
- Errores que dependen del DOM real: el stub los absorbe. Para eso está
  `tsc-emu-dist`: probado con 9 bundles, modo emulador, 62 equipos de
  `:8080` y ninguna petición a Firestore ni a Functions de producción.
