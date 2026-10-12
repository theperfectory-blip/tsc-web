# MS-4.1 a 4.9 · Modo público, sección por sección · 2026-10-11

Hallazgos que cierra: H-26 (la ruta `competiciones` es inalcanzable: código muerto, va a 7.2) y los nuevos H-40 y H-41. Abre H-42. La segunda pasada cierra además H-43.

Cómo se verificó (todo en el sandbox: emuladores de Firestore y Auth, nunca producción):

- `tsc-src` servido en `:3001` (modo emulador) y la variante `dist` con `node scripts/emu-dist.mjs` (9 bundles). Base: la copia real de `sandbox/backup.json` (62 equipos, 422 partidos, 5 competiciones, 79 eventos de sorteo).
- El navegador integrado de la app queda con el panel oculto y no corre `requestAnimationFrame`, así que las pruebas de scroll y animación se hicieron en Chrome. Móvil y tablet: la ventana de Chrome no se puede achicar, por eso se cargó la web en dos `iframe` de 390 y 768 px (los media queries responden al ancho del `iframe`). Tema claro y oscuro.
- Consola: trampa de `error`, `unhandledrejection` y `console.error` más el lector de consola de Chrome. Cero errores en `tsc-src` y en `dist` tras recorrer las 6 secciones, la Sala 3D, el H2H, el login y el perfil.
- Paridad: `node scripts/smoke-parity.mjs` → `PARIDAD: OK` (905 globales y 26 listeners iguales, 0 errores de carga). `node scripts/audit-wiring.mjs` → 0 handlers rotos (sin cambios).
- Prueba de «temporada vacía» (C2): con `STATE.season = 99` se vuelven a montar las 6 secciones. La encontró el fallo de H-41; tras el arreglo, 0 errores.

## 4.1 · Shell y arranque

Cambios:
- `js/redesign-shell.js`: al recargar, la sección guardada en `localStorage` se marcaba en la barra pero el scroll quedaba arriba (Palmarés): la barra decía «Equipos» y se veía Palmarés, y el observador no corregía porque ninguna sección cambia de estado. Ahora `initPublicScrollShell` baja a la sección guardada sin animar (`scrollToPublicSection(..., {instant:true})`) **(H-40)**.
- `js/nav.js`: `renderPubSidebarComps` insertaba `c.name`/`p.name`/`c.color` sin escapar en `innerHTML`; ahora van por `escHtml`/`escAttr`. Hoy el contenedor está oculto (sidebar retirado) y los nombres los escribe el admin: higiene.

Verificado: recarga con `equipos` e `historial` guardados (`?t=…` para evitar la restauración de scroll del navegador) queda en la sección correcta, con la barra coherente; tema claro/oscuro persistido; `setSoundOn`, selector de estela, modal de ajustes (cierra con Esc), `onSeasonChange`. Las suscripciones en vivo se reemplazan sin acumularse: `_liveUnsubs` va de 4 a 5 a 1 a 3 y a 0 al recorrer las secciones.

Revisado sin cambios: `sounds.js` (pausa en segundo plano y reanudación simétrica), `cursor-fx.js` (inerte en táctil, respeta movimiento reducido), `motion.js`. El arranque (`ui-utils.js`) ya tolera pasos que fallan (MS-2.4).

## 4.2 · Palmarés / Sala de Trofeos

Sin cambios de código. Revisado entero el lado público de `palmares.js` (vitrina, Sala, 3D, collage, audio, listeners): todo dato va escapado, los colores se validan como hex, y el cierre de la Sala deja el estado limpio.

Verificado en Chrome: abrir la Sala con Three/GLTF/Draco (1 canvas), cambiar de competición con `→` y de campeón con `↓`, cerrar con Esc: 0 canvas, `body.sala-open` quitado, `keyHandler`/`clickHandler`/`resizeHandler` en `null`, foco devuelto a `.mv-stage`. En `dist` igual. Móvil y tablet: vitrina bien. La rama SVG de la Sala (táctil) no se ejercitó en un dispositivo real.

## 4.3 · Panel, competiciones y fases, tablas de grupos, vivo

Sin cambios de código. Se revisó `public.js` completo (carruseles, staging atómico, paginador de fechas, ticker) y `live.js`.

- **H-26 resuelto:** `goPublicPage` y `focusPublicSection` redirigen `competiciones` a `panel`, así que `renderPubComps` (`phases.js:805`), `#page-competiciones`, `#pub-comps-content` y el `case 'competiciones'` de `nav.js:263` nunca se alcanzan. Código muerto → 7.2.
- Verificado: el carrusel cambia de competición y de fase con arrastre real (el ratón sobre el riel), y las marcas «Fecha N» paginan. Con 390 px el título «Fase Final 1ra División» quedaba cortado contra el borde (sin scroll de página): arreglado en `css/redesign.css` (en ≤560 px la fase baja a su propia fila).
- Observación sin cambio: el color del carrusel lo manda `competitions.color`; una competición con un color oscuro (en el sandbox, un azul puro) se lee mal sobre el fondo oscuro. Es un dato del admin, anotado para 5.3.

## 4.4 · Bracket y playoff públicos

Cambios:
- `js/public-bracket.js`: el pager móvil esperaba `transitionend` para asentar el panel; con movimiento reducido (`transition:none`), con la pestaña oculta o si el evento burbujeaba de un hijo, el bracket se quedaba en el riel doble sin asentar ni fuegos del campeón. Ahora solo cuenta el `transitionend` del propio riel y hay un respaldo por tiempo (520 ms) que dispara una sola vez.
- `js/bracket.js` (fuegos del campeón): ignoraban el sonido global (`SFX.enabled === false` seguía sonando), y el `click` que los cancela quedaba pendiente al terminar solos, de modo que el primer click mucho después cancelaba los fuegos de **otra** fase. Ahora respetan el sonido global y quitan el listener al terminar.

Verificado: en móvil, flecha siguiente/anterior (con y sin transición): el riel queda asentado (`gbr-mobile-rail`), los títulos y los botones deshabilitados cambian bien. Desktop: árbol completo en 768 px y en escritorio.

## 4.5 · Equipos

Cambio: `js/teams.js` `_refreshPubTeams`: si al montar no había equipos activos («Sin equipos activos») no existe la grilla, y un equipo nuevo que llegaba en vivo no se mostraba hasta recargar. Ahora vuelve a montar la vista.
Verificado: grilla, «Cargar más», tarjeta → ficha del club; 2 columnas en 390 px.

## 4.6 · Calendario

Cambio: `js/calendar.js` y `js/profile.js`: «hoy» se calculaba con la zona del dispositivo, pero los encabezados de día usan la zona elegida en Configuración (`_pfViewerTimezone`). Si las dos zonas difieren, «hoy/pasado» se clasificaba con un día de diferencia. Nuevo `_calViewerTodayStr()` para la vista pública (`_calTodayStr` queda para el admin, que lo manda a la función de «stream de hoy»).
Verificado: hero «Sin partidos» y lista de días pasados en 390/768; la cuenta atrás y el radar se cierran en cada re-render (revisado en código). El hero con un partido en vivo o próximo no se pudo ver: la base no tiene partidos futuros.

## 4.7 · Sorteo

Cambio: `js/sorteo.js` `loadState`: en la vista pública, si la temporada no tiene registro `sorteo`, intentaba crearlo (`dbAdd`), y la regla lo rechaza a un visitante: `SORTEO.init` fallaba con `PERMISSION_DENIED`. Ahora solo el admin lo crea **(H-41)**.
Verificado de punta a punta: con la sección visible en el navegador se escribió con el Admin SDK en el emulador un sorteo (documento `sorteo` + `sorteoEvents/89` + contador, como hace la transacción de `drawNext`): el público animó la bola (`reveal-card in/out`, «AC ANGELES ROJOS»), quedó 9/22 sorteados y 0 errores.

## 4.8 · Historial, H2H y tabla histórica

Cambio: `js/history.js` `resolveHistoryRecord`: para registros `live` de una temporada pasada sin campos congelados, el render **escribía** (`dbPut`) para congelarlos; un visitante no puede, y el rechazo tumbaba todo el historial («No pudimos cargar el historial») y, por arrastre, dejaba la sección Equipos con 0 partidos. Ahora solo congela el admin y el resultado se devuelve igual **(H-41)**. Se reprodujo viendo una temporada sin datos propios (hoy pasaría con T3 cuando exista T4 y nadie con sesión de admin haya abierto antes el historial).
Verificado: H2H (`MALVINAS JR vs ESCARLATAS FC`: 2 duelos), cambio a Tabla histórica (64 filas) y vuelta, hitos con conteo al entrar en el viewport. `data/historial-seed.json`: 2389 filas, ids únicos, sin goles inválidos, sin HTML, sin `pen` incompleto.

## 4.9 · Cuenta

Cambios:
- `js/profile.js`: el presidente podía escribir un nombre de club de más de 40 caracteres o con `<`/`>`; `saveProfile` guardaba antes foto, nombre y usuario y recién al final la regla rechazaba el equipo (genérico «permission-denied», perfil a medias). Ahora valida antes de escribir nada, con las mismas reglas que `validTeamName`, y el campo lleva `maxlength=40`. Cierra la parte de cliente de H-01.
- `js/auth.js`: Enter en el modal de acceso no enviaba (los campos no están en un `<form>`); y un alta fallida dejaba `_pendingSignupName` para el perfil de otra cuenta.

Verificado con la cuenta de presidente del emulador (login por Enter, perfil, guardar con 41 caracteres y con `<b>`: aviso claro y sin escritura; nombre válido guardado y restaurado; cierre de sesión). `push.js` y `updater.js` solo existen en la APK: revisados en código (el plugin nativo ya limita la URL de descarga al host permitido); la prueba en teléfono real de 6.3 sigue siendo la referencia.

## Segunda pasada: lo que no se había cubierto

Mismo sandbox (emuladores) y las dos variantes; partidos de prueba escritos en el emulador con el Admin SDK (`match.cjs`, fuera del repo).

- **Hero del Calendario, próximo:** con un partido de mañana (20:00 de Lima) aparece «Próximo partido», con cuenta atrás que avanza y los equipos correctos.
- **Hero del Calendario, en vivo:** al marcar el partido en vivo el hero pasa a «En vivo» con el marcador, el radar arranca y se detiene al salir de la sección; el día de hoy queda como ancla del metro.
- **Zona horaria:** con la zona elegida en Configuración distinta de la del dispositivo (Auckland, Los Ángeles) la hora y el día del hero se convierten bien (20:00 de Lima → martes 13, 14:00 en Auckland) y `_calViewerTodayStr()` usa la zona elegida.
- **H-43 (nuevo, cerrado):** el ticker de resultados solo se pintaba al entrar en modo público y al cambiar de temporada; un partido que pasaba a «en vivo» o un resultado nuevo no aparecía hasta recargar (visto al probar el hero en vivo). `js/public.js`: suscripción propia a `matches` (comparte el listener del espejo), con debounce, solo en modo público y cerrada al pasar a admin; si los datos no cambian no se toca el DOM, para no reiniciar la marquesina. Verificado en `tsc-src` y en `dist`: el partido en vivo aparece primero, con su punto rojo, sin recargar y sin acumular clones de la marquesina.
- **Sala en táctil (390 px):** abre con la rama SVG (sin Three ni canvas), el deslizar a la izquierda cambia de competición, el deslizar hacia arriba cambia de campeón y el botón de cerrar restaura el estado. Los toques son simulados.
- **Alta de cuenta de punta a punta (emulador de Auth):** nombre con `<` rechazado con aviso; email ya usado, con aviso y sin dejar el nombre pendiente (`_pendingSignupName` en `null`); alta correcta enviando con Enter: perfil creado como presidente, sin equipo y con edición bloqueada; el perfil muestra «Aún no tienes un club vinculado»; guardar nombre y @usuario reserva `usernames/qa_nuevo`; cerrar sesión.
- **`updater.js` y `push.js` con Capacitor simulado:** `node scripts/smoke-native.cjs` (nuevo, 14 comprobaciones): misma versión, 1.10.0 contra 1.9.0 por versionCode, manifiesto como objeto o texto, 404, JSON inválido, sin versionCode, sin red, build no numérico, descarga concurrente y URL vacía; permiso denegado, token registrado con `arrayUnion`, invitado sin escrituras, `arrayRemove` al cerrar sesión, `disable` y `handleNotificationData` con entradas raras. Todas pasan.
- `smoke-parity` sigue en OK (905 globales, 26 listeners) y 0 errores de consola.

## Pendientes / hallazgos nuevos

- **H-40** (media, **cerrado en 4.1**): la sección guardada se marcaba pero no se mostraba al recargar.
- **H-41** (media, **cerrado en 4.7 y 4.8**): la vista pública escribía en Firestore y fallaba para un visitante (sorteo de una temporada sin registro; historial con registros `live` de temporadas pasadas sin congelar).
- **H-42** (baja, abierto, va a 5.4 o a reglas con Opus): cuando el presidente renombra su club desde el perfil no se guarda `previousNames` (la regla solo deja `name` y `logo`), así que el historial, que enlaza por nombre, pierde el vínculo con el club. El admin sí lo guarda.
- Código muerto para 7.2 (C7): `#pub-sidebar` y su cadena (`togglePubSidebar`, `closePubSidebar`, `_applyPubSidebar`, `_initPubSidebarHover`, `renderPubSidebarComps`, `renderPubSidebarHistorial`, `#pub-menu-btn`, el indicador de `motion.js:_initChrome`); `renderPubComps` y la página `competiciones` (H-26); `_TROPHY_STORAGE_BASE` (palmares); `liveAvailable`. Copias del helper de escape: `_esc` ×8 más `_tkEsc`, `_pbEsc`, `_pfEsc`, `_authEsc`, `_updEsc` (7.1).
- Lo que quedó fuera de la primera pasada se cubrió después (sección siguiente). Sigue sin probarse en un dispositivo real: la Sala 3D dentro de la APK (en la APK la Sala usa 3D aunque el ancho sea chico) y las notificaciones y la actualización con el teléfono (referencia: 6.3).

Acción del dueño requerida: ninguna. Los cambios van en `tsc-src` y salen con el merge a `main` (deploy de hosting por CI); no tocan reglas ni funciones.
