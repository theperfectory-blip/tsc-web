# FIX-HAB · La ficha no llega hasta el final

## Síntoma
En la formación, con el primer jugador y con el segundo, el scroll de la ficha no llegaba a las últimas habilidades especiales: quedaban cortadas bajo la barra de Restablecer, Cancelar y Confirmar.

## Causa
- La ficha tenía su propio scroll anidado: `max-height: min(44vh, 380px)` con `overflow-y: auto`, dentro del scroll del modal. Dos scrolls superpuestos: el usuario tenía que bajar el modal y después la ficha, y en el teléfono el último tramo quedaba cubierto.
- La altura del modal y del overlay usaba `100%` y `vh`. En un teléfono, `vh` incluye la barra del navegador, así que el borde inferior queda bajo la pantalla visible y la barra de acciones se corta.
- La barra de acciones no sumaba `env(safe-area-inset-bottom)`.

Lo que sí medí: en la emulación (sin barra del navegador) la ficha llegaba al final. Por eso la falla depende del teléfono real y no se reproduce del todo en el navegador de escritorio.

## Cambio
- La ficha fluye dentro del scroll del modal: se quita `max-height` y `overflow` de `#ep-form-stats`. Queda un solo scroll.
- La barra de acciones suma `env(safe-area-inset-bottom)` en telefono.
- Alto del overlay y del modal con `100dvh` en telefono (dentro de `@supports`). En escritorio no cambia.
- `_formAjustarAlto` no cambió: sigue midiendo solo la cancha (la ficha no le resta alto).

## Verificación (sandbox, con el primer jugador y con el segundo, bajando el modal hasta el final)

| Pantalla | Última habilidad (Hab. saque largo) | Barra de acciones (borde superior) | Visible |
|---|---|---|---|
| 375×667 | bottom 513 px | 598 px | sí |
| 375×812 | bottom 658 px | 743 px | sí |
| Escritorio 1024×768 | bottom 543 px | 629 px | sí |

- Scroll horizontal de la página: ninguno (375 px).
- Capturas: [capturas-FIX-HAB](capturas-FIX-HAB/): `movil-375x667-ficha-final.jpg` y `escritorio-ficha-final.jpg`.

## Pruebas
- `tools/test-pes5-formacion.js`: TODO OK.

## Límite
- No pude probar en un teléfono real con barra del navegador. Lo que sí verifiqué es que el scroll llega al final en tres tamaños y que el cambio de CSS afecta solo a telefono (la media query) y al modo `dvh`.
- Si el corte persiste en un teléfono, lo siguiente a revisar es el overlay (`inset: 0`) y el safe-area del teléfono concreto.
