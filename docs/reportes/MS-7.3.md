# MS-7.3 · CSS sin uso · 2026-10-20

Estado: **CERRADO** (2026-10-20, Sonnet). Sin hallazgos de seguridad. Sin cambios de JS ni de reglas.

## Método

El plan pedía medirlo con la cobertura del navegador. La cobertura de una visita solo ve el estado que se alcanzó en ese recorrido (estados de hover, modales, rol, tema, datos vacíos), así que borrar por cobertura es arriesgado. Se hizo al revés, más conservador:

1. Un analizador propio recorre las 7 hojas (reglas, `@media`, `@keyframes`) y, para cada regla, extrae los nombres de clase e id de sus selectores.
2. Un nombre cuenta como **usado** si aparece como texto en cualquier `index.html`, `js/*.js`, `data/*.json` o script de build (búsqueda por subcadena, no por palabra) o si aparece su prefijo seguido de una concatenación (`'cal-' + x`, `` `cal-${x}` ``), para cubrir clases armadas por string.
3. Solo se borra una regla si **todos** los selectores de su lista tienen al menos un nombre sin uso. Un `@keyframes` se borra solo sin ninguna referencia en CSS ni JS. Las reglas con selectores de atributo o sin clases/ids no se tocan.
4. Se descartó lo que documenta `DESIGN.md` como primitivas del sistema de diseño (`.btn-quiet`, `.chip-today`, `.chip-soon`, `.team-crest`, `.team-band`, `.hero-eyebrow/-title/-sub`): se dejan aunque nadie las use hoy.
5. Se limpiaron los comentarios sueltos que quedaban pegados a las reglas borradas y los `@media` vacíos.

## Qué se borró

Unas 460 líneas (4.692 → 4.230):

- `calendar.css` (−301): todo el calendario público anterior, `.cal-pub-*` (días, tarjetas, resumen) y la línea de tiempo `.cal-tl-*`; el calendario público actual usa `.hm-*` y `.cal-pub-empty*`, que se conservan.
- `redesign.css` (−126): `.pub-cnav*`/`.pub-pnav*`, prototipo de palmarés (`.palm-*`, `.amb-btn`, `.s-champ*`, `.sala-panel*`), `.tb-enter`, `#proto-badge`, `.proto-section`, `.pp-donut .pd-c`, `.pp-bars .pb-*`, `.hist-pub-tabs`, `.hist-pane[hidden]`, `.dossier-winpct`, `.metro-rest`, `.club-pres`, `.hm-crest`, `.gbr-top`/`.gbr-rh` y los `@keyframes gbrRoundIn`/`gbrCardIn`.
- `components.css` (−8): `.btn-icon`, `.badge-red`, `.grid-3`, `.grid-auto`, `.drag-handle`.
- `layout.css` (−9): `.tb-enter` (móvil), `.auth-avatar`. `palmares.css` (−9): `.palm-vig-sel`. `sorteo.css` (−9): `.side-body.scrollable`, `.side-foot-row`, `.side-foot-help`.
- Nota: las clases de `#page-competiciones` (borrada en 7.2) no tenían CSS propio.

## Se deja a propósito

- Primitivas de `DESIGN.md` (punto 4).
- Variables CSS (`variables.css`): no se analizaron; son baratas y algunas se leen desde JS.
- Reglas con selectores de atributo (`[data-…]`, `[class*=…]`) y cualquier regla con al menos un selector que sí se usa.

## Verificación

- Las 7 hojas siguen balanceadas (llaves) y sin `@media` vacíos; `smoke-parity` → PARIDAD: OK; `audit-wiring` → 0 rotos (reporte restaurado); `csp.mjs --check` OK; `build-web` (7 CSS → 1) y `build-www` sin error.
- Sandbox, `dist`, panel del navegador oculto: recorrido anónimo por las 6 páginas públicas y, con sesión admin, 14 páginas admin. En cada página se consultaron los 47 selectores borrados (más `[class*='cal-pub-']` y `[class*='cal-tl']`): **cero elementos** coinciden en todo el recorrido. Cero errores no capturados; en consola solo el 400 del arranque sin sesión que ya existía.
- Apariencia (segunda pasada, Opus, sandbox `tsc-src`), con las hojas de antes de 7.3 servidas aparte:
  - **Estilos calculados:** en la misma página se toman unas 50 propiedades de cada elemento y de sus `::before`/`::after`, se cambian las hojas por las de antes y se vuelve a medir. Resultado idéntico en las 6 páginas públicas (escritorio y 375 px, tema oscuro y claro), en las 14 páginas admin y con los modales del generador de fechas, de editar fecha y de editar resultado abiertos. Las únicas diferencias fueron animaciones en curso (ticker, chibi) y el menú lateral en plena transición, que desaparecen al repetir. Control: una regla agregada a propósito sí se detecta.
  - **Capturas** con Chrome headless (6 páginas públicas en 1280 px y 3 en 375 px, antes y después): iguales salvo el orden de las tarjetas de Equipos, que se baraja en cada carga, y el ticker y el brillo animado.

## Pendientes / hallazgos nuevos

- Sin hallazgos nuevos. Si más adelante se quiere afinar con cobertura real (hover, modales, móvil), queda el analizador como guía; no se commitea porque vive fuera del repo.

Acción del dueño requerida: ninguna.
