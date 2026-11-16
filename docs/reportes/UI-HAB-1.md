# UI-HAB-1 · Estrella de Habilidades especiales

Pedido de Jimbo con captura: en «Habilidades especiales» (Mejoras, presidente, y el editor de la Tool, que comparte el componente), la estrella iba pegada al final del nombre y costaba acertarle.

## Cambios (`tsc-src/js/mejoras-page.js`, `tsc-src/css/mejoras-editor.css`)

- **Columnas:** cada celda es una grilla: nombre a la izquierda (se parte en líneas, no se corta), costo («+500») a la derecha, y la estrella en una columna fija de 44 px. Todas las estrellas quedan en la misma columna.
- **Estrella:** ícono Lucide de 24 px dentro de un `button` de 44×44 px (apto para mouse y dedo).
- **Toda la celda activa la habilidad:** un único handler en la fila (`toggleAbility`). El botón de la estrella no tiene handler propio, así que no hay doble disparo. Verificado: tocar el nombre activa una vez (costo +500); tocar la estrella desactiva una vez (costo 0).
- **Estado visual:** rellena y dorada si está activa, contorno si no; borde dorado en la celda activa. Agregados `:hover` y `:focus-visible`.
- **Accesibilidad:** `aria-pressed` en la estrella y `aria-label` «Pase: activar habilidad (+500)» (o «desactivar» si ya está activa). Solo `data-on*`, sin emojis.
- **Anchos:** a 517 px hay 2 columnas (la misma del desktop); a 375 px hay 1 columna, con los nombres completos (por ejemplo «Habilidades de regate», «Hab. portero penaltis» hacen wrap, no se cortan). Sin scroll horizontal en ninguno de los dos.

## Decisión sobre 375 px

El pedido decía «2 columnas a 517 px y funcionar a 375 px». A 375 px se usa 1 columna: dos columnas ahí dejarían los nombres demasiado angostos. Si se quiere 2 columnas también a 375 px, es un cambio de una línea en el CSS.

## Verificación en :3001

- Presidente (president@emu.test), FK TUPADRE, pestaña «Habilidades especiales», sin tocar la base.
- 517 px: capturas en `docs/reportes/capturas-UI-HAB-1/habilidades-517px.jpg`. Dos columnas, estrellas alineadas, sin scroll horizontal.
- 375 px: `docs/reportes/capturas-UI-HAB-1/habilidades-375px.jpg`. Una columna, nombres completos, sin scroll horizontal.
- Toggle por nombre y por estrella: una vez cada uno (costo y aria-pressed coherentes).
- `smoke-parity`: PARIDAD OK. `audit-wiring`: 0 rotos, 0 fuera de gramática, 0 duplicados.

## APK (respuesta sin cambios)

- Última release publicada en GitHub: **v2.1.0** (2026-11-11), marcada como «Latest».
- `capacitor.config.json` no define `server.url`: la APK carga el `www` empaquetado en el APK, no la web remota. Por eso estos cambios necesitan una APK nueva (build de `www`, `cap sync` y release) para verse en la app.
