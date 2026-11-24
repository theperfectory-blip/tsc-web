# FV2 · Pestaña «En vivo» de la Formación — 2026-11-24

Estado: **LISTO** en la rama `feat/formacion-vivo`. Consume el puente local de
FV1 (`tools/pes5/live-bridge.py`, contrato en `tareas/API_PUENTE.md`); no toca
`tools/` ni las reglas de Firestore. Sin commits ni deploy.

## Qué se hizo

- **`tsc-src/js/formacion-vivo.js`** (nuevo, IIFE): expone
  `window.FORMACION_VIVO = { abrir, cerrar, montar, desmontar, consultar }` y
  los handlers `window.fv*` de sus `data-on*`.
- **`tsc-src/css/formacion-vivo.css`** (nuevo): solo las piezas propias del
  panel (conexión, capas sobre la cancha, pedido, hoja del esquema), con sus
  colores de modo claro. La cancha, la lista, la ficha y los botones son los
  del editor.
- **`tsc-src/js/pes5/pes5-variantes.json`** (copia del de `tools/pes5/`): los
  8 esquemas y 100 variantes que sirve el cliente. Va en `tsc-src` porque se
  baja en runtime (`fetch` al abrir «Esquema»).
- **`tsc-src/js/mejoras-page.js`**: botón **«En vivo»** junto a «Formación»
  en el editor (`ep-acc live` → `abrirFormacionVivo()`), y la cancha/reglas
  compartidas expuestas en `window.MEJORAS_EDITOR.vivo`.
- **`tsc-src/mejoras.html`**: `<link>` de `css/formacion-vivo.css` y
  `<script>` de `js/formacion-vivo.js` (después de `mejoras-page.js`).
- **`tsc-src/js/pes5-admin.js`**: la Tool carga el CSS y el módulo nuevos bajo
  demanda (después de `mejoras-page.js`).
- **`tsc-src/js/pes5-tool.js`**: pestaña **«En vivo»** (`renderVivoTab()` →
  `FORMACION_VIVO.montar(#pt-tabcontent)`), con corte del sondeo al salir de la
  pestaña o de la sección. En modo móvil la pestaña no aparece: el teléfono no
  tiene el puente.
- **`scripts/csp.mjs`** y **`firebase.json`**: `http://127.0.0.1:8765` en
  `connect-src`. Se tocó `firebase.json` porque `node scripts/csp.mjs --check`
  compara el header publicado con la fuente única: sin eso el chequeo falla
  (no es deploy, solo el texto del header en el repo).

## Reutilización (la regla de Jimbo)

No hay copias de la lógica de la Formación: `js/mejoras-page.js` expone en
`MEJORAS_EDITOR.vivo` (lectura, sin tocar el editor) la geometría de la cancha
(`pctX/pctY/rect` con la orientación explícita, `celdaDesdeCampo`,
`filaLateral`/`latDeFila`), el armado del campo (`cancha()` =
`pitchFieldHTML`), las reglas de posición (`posicionEn`, `bloque`,
`puedeAsignar`, `opcionesPosicion`, `contarLineas`, `lineaBajoMinimo`,
`validar`) y los topes del juego. El modal de Formación ahora usa ese mismo
armado de cancha, así que las dos pantallas no se pueden desincronizar. La
ficha y la comparación son `js/mejoras-cambio.js` (`htmlFicha` / `htmlPanel`).
Cancelar y Restablecer son los mismos botones y el mismo flujo de pedido.

## Cómo se abre

- **Presidente** (`mejoras.html`): editor → panel «Mi equipo» → botón
  **«En vivo»** (al lado de «Formación»). Se abre sobre la página, con la
  cancha horizontal en escritorio y vertical en el teléfono.
- **Admin** (Tool PES5 del panel): pestaña **«En vivo»**. Ahí hay además un
  selector **«Edito: Local / Visitante»**: el otro lado queda en solo lectura.

## Qué funciona

- **Conexión**: URL configurable (por defecto `http://127.0.0.1:8765`,
  guardada en `localStorage`), indicador **Conectado / Juego cerrado / Sin
  conexión al juego / Conectando…**, sondeo de `/estado` cada 1,5 s, relectura
  de `/leer?lado=ambos` cuando cambia el estado (o al abrir la alineación),
  botón **Reintentar**.
- **Estado del partido**: previa / jugando / pausa / entretiempo, con «Se aplica
  ya» cuando el puente dice que puede escribir y «En espera» si no.
- **Cancha**: por defecto el estado (flechas de condición, leídas del juego).
  Botones **Posición**, **Ataque**, **Defensa** (Alto azul larga, Normal celeste
  mediana, Bajo blanca corta) y **Marcaje** (sigla, puntos del rival y línea al
  marcado); tocar el botón activo vuelve al estado.
- **Lista**: titulares, banca y reservas (ocultas con el partido empezado,
  como en el juego), barra de resistencia (actual sobre el máximo del saque),
  estado por jugador y **«Supl. Res.»** en el encabezado.
- **Editar**: arrastrar el punto (mouse, dedo o lápiz) o moverlo con las
  flechas del teclado y el selector de posición, con las reglas de la
  Formación → op `mover`. Titular con titular → `intercambiar`. Titular con
  banca/reserva → comparación SALE/ENTRA y «Hacer el cambio» → `cambio`; con el
  partido empezado va a la cola y baja «Supl. Res.».
- **Esquema**: los 8 esquemas y 100 variantes del juego, vista previa en una
  cancha chica y **Aplicar** → op `variante` (escribe prof/lat/sigla, borra
  flechas y pone la actitud, como el juego).
- **Menús**: Ajustes equipo (nivel, sistema y líbero, línea, presión, fuera de
  juego, contraataque), Ajustes estrategia (modo y estrategia de los 4
  botones), Config. individual (flechas de ataque, actitud, marcaje y rival
  marcado), Lanzador/Capitán y Config. rápida. Todos son ops `campo` con los
  nombres del mapa del puente.
- **Pedido**: cada cambio es un renglón con **Deshacer**, **Restablecer**,
  **Enviar al juego** (`POST /aplicar` con todas las ops y `salieron`), los
  errores del puente se muestran **tal cual** y después de aplicar se relee.
  Si la alineación está cerrada, lo enviado queda «en espera» y sale solo
  cuando la pantalla de alineación se abre.
- **Rival**: cancha chica, esquema, «Supl. Res.» y los 11, todo de solo lectura.

## Diferencias con el prototipo (y por qué)

- **Config. rápida**: el juego guarda las Alineaciones A y B en bloques que el
  puente todavía no expone, así que «copiar A/B» no se puede implementar hoy.
  En su lugar hay tres presets (Ofensiva / Equilibrada / Defensiva) que
  escriben varios `campo` del mapa de una vez. Queda anotado como pendiente del
  puente.
- **«Alineación auto.»**: el puente no tiene esa operación; el botón queda con
  «Próximamente» (y avisa al tocarlo).
- **Nombres del rival**: el presidente solo puede leer la plantilla de su
  equipo (reglas de Firestore), así que el rival sale con su número de jugador
  (`#2386`) salvo en la Tool, donde el admin lee todas las plantillas
  publicadas y sí ve los nombres. Del mismo modo, el lado «mío» se reconoce
  por los ids del plantel publicado (funciona igual si el partido es local o
  visitante).
- **`salieron`**: el panel lleva su propia lista de los que salieron y la manda
  en cada `POST /aplicar`. Si el juego ya había hecho una sustitución que la web
  no vio, el puente rechaza la op con su mensaje y se muestra tal cual.

## Cómo probarlo

Necesitas el puente de FV1 en el mismo PC que PES5 (Chrome o Edge en la PC):

```
python tools/pes5/live-bridge.py --origenes http://localhost:3000,http://localhost:3001
npx serve tsc-src           # http://localhost:3000
```

1. Abre PES5 y entra a la **pantalla de alineación** (antes del partido, pausa
   o entretiempo).
2. `http://localhost:3000/mejoras.html`, inicia sesión como presidente y toca
   **«En vivo»**. Debe decir **Conectado** y mostrar tu alineación con los
   estados.
3. Arma un cambio (mueve un punto, un cambio titular↔banca, un ajuste), revisa
   el pedido y toca **Enviar al juego**. En el juego debe verse al salir de la
   pantalla de alineación.
4. Tool: panel admin → Tool PES5 → pestaña **«En vivo»**. Con la cancha en
   pausa, **Enviar** aplica; jugando, queda en espera y sale al pausar.

Si el puente no está, el panel igual abre: muestra **Sin conexión al juego** y
el error del `fetch`, sin romper la página.

**Ojo con la CSP y el origen**: la política solo permite
`http://127.0.0.1:8765`. Si corres el puente en otro puerto, agrega ese origen a
`scripts/csp.mjs` y al header de `firebase.json`. El puente, además, solo
acepta los orígenes de `--origenes` (por defecto `localhost:3000/3001`).

**Ojo con HTTPS**: la web publicada es HTTPS y el puente es HTTP en loopback.
Chrome permite el loopback, pero si el navegador bloquea el pedido por contenido
mixto, el mismo panel se usa desde `http://localhost:3000` (o desde la Tool en
la PC). No hay nada que configurar en el cliente.

## Comprobaciones

- `node --check` de `tsc-src/js/formacion-vivo.js`, `mejoras-page.js`,
  `pes5-tool.js`, `pes5-admin.js` y `scripts/csp.mjs`: **OK**.
- `node scripts/audit-wiring.mjs`: **rotos 0** (sin cambios en gramática,
  muertas, duplicados ni IDs respecto del reporte anterior).
- `node scripts/smoke-parity.mjs` (con `build-web` previo): **PARIDAD: OK**
  (0 globales y 0 listeners de diferencia).
- `node scripts/csp.mjs --check`: **firebase.json OK**.
- **Prueba de panel** con Chrome headless y un puente falso en memoria (mismo
  contrato, sin escrituras), en escritorio 1280×900 y teléfono 390×844 con
  `Emulation.setDeviceMetricsOverride`. Dos arneses temporales, todos en verde:
  - **Contrato**: `leer` con la forma exacta de `API_PUENTE.md` (lanzadores
    `{ckl,ckr,tll,tlc,pk}`, capitán, botones numéricos, `ajustes`, estado y
    resistencia por índice): 11 puntos, sistema Líbero con su selector, modo
    semi-automático con L2/AUTO, penal y capitán marcados, rival marcado,
    flecha de la brújula, iconos de estado, resistencia y un ajuste enviado
    con el nombre del mapa.
  - **Flujo**: 32 filas propias (11+12+9) y 11 del rival; sin ids duplicados;
    capas Marcaje con líneas; mover con el selector; comparación SALE/ENTRA de
    `mejoras-cambio`; `POST /aplicar` con `mover`, `cambio`, `intercambiar`,
    `campo` (incluida la cabecera) y `variante` (23 ops en 11 renglones);
    Deshacer/Restablecer; error del puente tal cual; partido empezado con
    reservas ocultas y sustitución en cola sin POST; envío automático al abrir
    la alineación; indicadores «Juego cerrado» y «Sin conexión»; sin desbordes
    a 390 px (cancha vertical).

  El arnés era temporal (carpeta `_cmp/`, excluida de los builds) y se borró al
  terminar.

## Pendientes / a revisar por el coordinador

- `docs/reportes/MS-2.3-cableado.md` se regeneró al correr el auditor (fecha y
  números de línea; el reporte anterior era del 2026-11-17).
- Arrastre y teclado comparten `moverACasilla` + `registrarMovimiento` con el
  resto del panel, pero la prueba automática no simula gestos de puntero: vale
  una pasada a mano en el teléfono.
- El puente todavía no expone los bloques A/B (Config. rápida) ni una op de
  «Alineación auto.».
