# MS-7.4 · Assets sin referencias y mp3 · 2026-10-20

Estado: **CERRADO** (2026-10-20, Sonnet). Cierra H-24 (en lo que no es compresión de trofeos). Sin hallazgos de seguridad.

## Inventario

Se listaron los 55 archivos de `tsc-src/assets/` (sin `vendor/`) y se buscó cada nombre de archivo en todo el repo: `tsc-src` (HTML, JS, CSS, manifest), `scripts/`, `functions/`, `android/` (fuentes, no `res/` generado), `firebase.json` y `capacitor.config`. Los trofeos se arman por nombre (`copa_N.glb`, N = 1–11) y los 11 están referenciados.

## Borrado (11 archivos, 11 MB; `assets/` 41 MB → 29 MB)

Sin ninguna referencia en ningún lugar (solo había comentarios de CSS que los nombraban):

- `chibi/luisyuna-avatar.png`, `chibi/luisyuna-forget.png`, `chibi/luisyuna-ok.webp`, `chibi/LuisYuNa_nuevo.png` (el original grande de la mascota; el sitio usa sus derivados `_128.webp` y `_192.png`).
- `foco_derecho.png`, `foco_izquierdo.png`, `placa_dorada.png`, `sin_fondo.png`, `tsc_sin_fondo.png`: sus `.webp` son los que cargan `palmares.js`, `fixture-gen.js` y `index.html`.
- `fondo_completo.png`, `palmares.png`: sin uso.

Todo sigue recuperable desde el historial de git. Dos comentarios de `redesign.css` que nombraban `sin_fondo.png` ahora dicen `.webp`.

## mp3

`assets/sounds/palmares_theme.mp3`: 4,77 MB → 2,40 MB (ffmpeg, libmp3lame 96 kb/s estéreo, 44,1 kHz; se quitó la carátula incrustada y los metadatos). Misma duración (3:29,5), mismo nombre, y el reproductor (`palmares.js`, `loop = true`) no cambia. `drumroll.mp3` (60 KB) se deja.

## Verificación

- Un script comprueba que las 29 referencias `assets/...` de `js/`, `css/`, `index.html`, manifest y JSON existen en disco: todas existen.
- `smoke-parity` → PARIDAD: OK; `audit-wiring` → 0 rotos (reporte restaurado); `csp.mjs --check` OK; `build-web` y `build-www` sin error (`dist/assets` y `www/assets` pesan 29 MB).
- Sandbox, `dist`, panel oculto: se copió el mp3 nuevo al sitio del sandbox y se reconstruyó `sandbox/dist`. El navegador lo descargó (200), lo decodificó (209,52 s, 2 canales), las páginas Palmarés y Panel cargaron sin imágenes rotas ni errores, y no hubo ningún 404 de assets en las peticiones. Nota: el sandbox usa una copia recortada de `assets/` (emu-snapshot), así que el resto de los assets se verificó por referencias, no en pantalla.

## Pendientes / hallazgos nuevos

- Los 11 `.glb` de trofeos siguen en 1,3–2,5 MB (ya pasaron por `scripts/optimize-trophies.mjs`); comprimir más exigiría Draco/meshopt con revisión visual. Queda fuera de este slice.
- `chibi/*.png` de la secuencia del sorteo (8 × 350–460 KB) tienen PNG como único formato; convertirlos a `.webp` requiere tocar `sorteo.js`. Opcional.
- El `.mp3` quedó comprimido; no hay pendiente de herramienta.

Acción del dueño requerida: ninguna.
