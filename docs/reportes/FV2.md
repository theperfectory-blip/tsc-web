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

## FV3 · «En vivo» sin partido cargado — 2026-11-26

Estado: **LISTO** en la rama `feat/formacion-vivo`. Sin commits ni deploy.

### Qué se hizo

- **Puente** (`tools/pes5/pes5_vivo.py`, `tools/pes5/live-bridge.py`):
  - `registro_cargado(mem, lado)` valida que el orden sea una permutación de
    0..31 y que el plantel tenga al menos 11 ids distintos de 0;
    `partido_cargado(mem)` devuelve verdadero si cualquiera de los dos lados
    tiene un partido cargado.
  - `estado()` agrega `partidoCargado` (también lo devuelven `/estado` y
    `/leer`).
  - Con `partidoCargado: false`, `/leer` devuelve `equipos: []` y
    `POST /aplicar` responde `ok: false` con «No hay un partido cargado en el
    juego» **sin escribir ningún byte**.
  - Pruebas: registro en ceros → `false`; registro válido → `true`; orden con
    un índice repetido → `false`; `/estado` y `/leer` sin partido; `/aplicar`
    sin partido no escribe. `test_live_bridge.py` pasa de 13 a 18 pruebas.
- **Página** (`tsc-src/js/formacion-vivo.js`, `tsc-src/css/formacion-vivo.css`):
  - Cuatro estados vacíos con ícono Lucide, sin cancha, lista, menú, pedido ni
    chip «En vivo»: sin conexión («No hay conexión con el juego · En el PC del
    juego tiene que estar corriendo el puente»), PES5 cerrado, PES5 abierto sin
    partido («Elige los equipos y entra a la pantalla de alineación») y
    conectando/leyendo.
  - La URL del puente ya no está en la vista normal. Un botón de engranaje
    **Conexión** (solo rol admin) abre un panel con la URL y **Probar**, que
    muestra si el puente responde, si PES5 está cerrado o si no hay partido.
  - Reconexión automática: si el puente no responde, el sondeo pasa a cada 3 s
    con el aviso discreto «Reconectando…»; **Reintentar ahora** aparece recién
    después de 3 fallos seguidos y se resetea al volver la conexión.
  - Al perder el partido (menú, cierre del juego, corte del puente) se olvidan
    equipos y selección, y el panel vuelve solo al estado vacío. Al volver el
    partido se relee la alineación sin intervención.

### Comprobaciones FV3

- `python -I tools/pes5/test_pes5_vivo.py`: **97 OK**.
- `python -I tools/pes5/test_live_bridge.py`: **18 OK**.
- `node --check tsc-src/js/formacion-vivo.js`: **OK**.
- `node scripts/audit-wiring.mjs`: **rotos 0** (0 no definidas, 0 sin window).
- `node scripts/build-web.mjs` + `node scripts/smoke-parity.mjs`:
  **PARIDAD: OK**.
- `node scripts/csp.mjs --check`: **OK** (sin cambios de CSP).
- **Lecturas contra el juego real** (PES5 abierto, pantalla de alineación en
  previa, solo `GET`): `/estado` → `partidoCargado: true`; `/leer?lado=ambos` →
  2 equipos, 11 slots y 32 ids por lado. No se hizo ninguna escritura.
- Arnés temporal fuera del repo (`DOM` simulado y respuestas falsas del
  puente), 7 escenarios en verde: sin conexión (URL oculta y sin engranaje para
  el presidente), juego cerrado, juego abierto sin partido, con partido (chip,
  cancha, lista, menú y pedido), admin (engranaje y panel con URL y «Probar»),
  tres fallos («Reintentar ahora») y reconexión sola a los 3 s.

### Pendientes

- `docs/reportes/MS-2.3-cableado.md` se regeneró al correr el auditor (fecha y
  números de línea; ya venía desactualizado desde FV2).
- Un puente que ya estaba corriendo antes de FV3 sigue con el código viejo (no
  devuelve `partidoCargado`): hay que reiniciarlo para que la web muestre los
  estados nuevos.
- Si PES5 está abierto, solo se probaron lecturas (`GET /estado`, `GET /leer`)
  contra el juego real; el resto se validó con `MemoriaFalsa`.
- El panel de conexión repinta con el sondeo salvo mientras el foco está en el
  campo de la URL, para no perder lo que se escribe.

## FV5 · Dibujar siempre a los 11, nombres de cualquier TSC, flecha del arquero y pedido sin repetidos — 2026-11-26

Estado: **LISTO** en la rama `feat/formacion-vivo`. Sin commits ni deploy. Solo
`tsc-src/js/formacion-vivo.js`, `tsc-src/css/formacion-vivo.css` y este
reporte; no se tocó el puente ni las flechas de ataque (quedan para FV6).

### Qué se hizo

- **Los 11 siempre en la cancha y en la lista**. `modeloDe` arma las 11
  casillas con `slots` del contrato o, si falta alguna, con `titulares` o los
  campos sueltos del registro; ninguna casilla se descarta por no tener nombre
  ni por no ser del plantel del presidente. El id del slot se completa desde
  `ids` por el índice de plantel si el puente no lo manda. `act` y `mark` se
  acotan a sus rangos (0..2 y 0..3). El esquema sigue saliendo de las siglas de
  los 11 slots (`esquemaTexto`).
- **Nombres de cualquier TSC**. `cargarNombres()` reúne, por registro (u16), los
  jugadores de: (1) el plantel que ya tiene el editor (`MEJORAS_EDITOR.vivo`,
  equipo del presidente en `mejoras.html` y equipo abierto en la Tool), (2) el
  documento `pes5_plantillas/{teamId}` del usuario y (3) **toda** la colección
  `pes5_plantillas` (la misma fuente que usa la Tool). Se busca al jugador del
  juego en ese mapa; si no aparece, la lista y la cancha muestran
  «Jugador #id». Con jugador encontrado se usan sus stats para la comparación
  SALE/ENTRA; con el fallback (sin stats) la comparación se oculta y el cambio
  sigue funcionando.
- **Edición según rol**. `puedeEditar()` deja editar al admin siempre y al
  presidente solo cuando el lado que se ve es el suyo: al menos 5 de los 11
  titulares del lado están en su plantel publicado (así tolera un plantel
  desactualizado sin confundir el equipo). Si no es su equipo (o no hay sesión
  de presidente), el panel queda en solo lectura: aviso «Este partido no es de
  tu equipo», puntos sin botón ni arrastre, lista sin tocar, sin menú, sin
  pedido y sin pie de edición; el chip de estado pasa a «Solo lectura». El admin
  conserva el selector Local/Visitante de la Tool y edita los dos lados. Todos
  los handlers de edición (`fvPunto`, `fvFila`, `fvCiclo`, `fvFlecha`,
  `fvEnviar`, etc.) comprueban el rol además de la UI.
- **Flecha defensiva del arquero**: la capa Defensa dibuja también la casilla 0,
  con la regla Alto azul larga / Normal celeste mediana / Bajo blanca corta.
  Las flechas de ataque no se tocaron.
- **Pedido sin repetidos**. Cada línea lleva una clave: `mover:casilla`,
  `flechas:casilla`, `ind:casilla:campo`, `rival:casilla`, `ajuste:campo`,
  `libero`, `modo`, `estrategia:k`, `lanzador:rol` o `esquema`. Si la clave se
  repite, la línea se reemplaza **en su mismo lugar** con el último valor y
  conserva el «Deshacer» de antes del primer cambio; si el último valor vuelve
  al original, la línea desaparece y se restaura ese estado. Intercambios y
  cambios de jugador no llevan clave y se listan uno a uno. Aplicar una
  variante descarta las líneas individuales de posición/flechas/actitud que esa
  variante ya reescribió. El `POST /aplicar` manda una sola op por dato (la
  última; las 8 flechas de un jugador son 8 datos distintos y viajan las 8), y
  al aplicar se limpian también las líneas viejas «en espera» de la misma
  clave.
- **CSS**: chip `ro`, tarjeta del aviso de solo lectura y puntos de cancha de
  solo lectura (sin cursor ni eventos). Todo con las variables del proyecto.

### Comprobaciones FV5

- `node --check tsc-src/js/formacion-vivo.js`: **OK**.
- `node scripts/audit-wiring.mjs`: **rotos 0** (no definidas 0 · sin window 0).
- `node scripts/build-web.mjs` + `node scripts/smoke-parity.mjs`:
  **PARIDAD: OK**.
- `node scripts/csp.mjs --check`: **firebase.json OK**.
- **Arnés temporal** (fuera del repo, `_cmp/`, borrado al terminar) con DOM,
  plantillas y puente falsos: **24 comprobaciones en verde**. Cubre: aviso y
  solo lectura cuando el partido no es del equipo; 11 puntos; esquema 4-4-2;
  nombres de otro TSC por id; «Jugador #id» cuando no hay plantel; 11 flechas
  defensivas (arquero celeste mediana); edición con el partido propio; nombres
  propios; Normal → Bajo → Normal → Bajo deja **una** línea con el último
  valor; al volver al original la línea desaparece; «Deshacer» devuelve al
  estado previo al primer cambio; dos campos distintos conviven y el mismo
  campo se reemplaza en su lugar; el `POST /aplicar` lleva una sola op de la
  actitud y una sola del nivel (la última).
- **Puente real, solo lectura** (PES5 abierto, previa, Junior vs otro equipo):
  `GET /estado` → `partidoCargado: true`; `GET /leer?lado=ambos` → 2 equipos,
  11 slots con `pos`/`prof`/`lat` (local empieza en el id 300). La página
  cargada contra `http://127.0.0.1:8765` dibujó **11 puntos**, esquema
  **4-3-3**, 32 filas y «Jugador #300» (sin plantel legible en esa prueba), con
  el aviso de solo lectura y sin pedido ni pie. No se hizo ningún `POST`.

### Pendientes / a revisar por el coordinador

- **Planteles ajenos y reglas de Firestore**: `firebase/firestore.rules` deja
  que un presidente lea **solo** `pes5_plantillas/{suTeamId}`; un `get()` de la
  colección completa se rechaza (y se verificó que las reglas publicadas son
  iguales al repo con `rules-drift`). Por eso el código pide siempre la
  colección completa, pero en una sesión de presidente el nombre de otros
  equipos TSC sigue cayendo en «Jugador #id» (el admin sí ve todos desde la
  Tool). Para que el presidente vea esos nombres hace falta ampliar esa regla
  (o publicar una copia pública de las plantillas), que queda fuera de los
  archivos de esta tarea.
- El auditor regenera `docs/reportes/MS-2.3-cableado.md` al correrlo (fecha y
  números de línea); esta vez se dejó como estaba en `HEAD` para no tocar
  archivos fuera de la tarea.
- El arnés no simula gestos de puntero: el arrastre en solo lectura y en
  edición conviene verlo a mano en el teléfono.

## FV6 · Flechas de ataque: rotar la cruz del juego a la cancha — 2026-11-26

Estado: **LISTO** en la rama `feat/formacion-vivo`. Sin commits ni deploy. Solo
`tsc-src/js/formacion-vivo.js` y este reporte; no hizo falta CSS.

### Qué se hizo

- **Conversión única cruz → cancha**. La tabla `VECTOR`, que se leía como
  direcciones de la pantalla, pasó a `CRUZ`: el vector de cada flecha en la
  cruz del juego, relativa al jugador y con la misma orientación del selector
  de Config. individual (`arriba` = 0,−1 = avanzar; `dcha` = 1,0).
  `vectorCancha(px, py, v)` la lleva a la cancha: horizontal (ataque a la
  derecha, banda izquierda arriba) `dx = −py, dy = px`; vertical (teléfono,
  ataque hacia arriba) sin cambio. La capa Ataque (`capaHTML`) la usa para los
  11 slots, arquero incluido.
- **Selector igual que el juego**. La brújula de Config. individual no cambió;
  debajo va el texto chico «↑ = hacia el arco rival. La cancha gira la cruz a
  su vista: en horizontal, la banda izquierda queda arriba.». La vista previa
  (capa Ataque de la cancha) usa la conversión.
- **Defensa sin cambios**. La flecha de actitud sigue apuntando al arco propio
  (izquierda en horizontal, abajo en vertical) con `rotar(−1, 0, v)`, que ahora
  queda documentado como giro de vectores ya expresados en la cancha.

### Comprobaciones FV6

- `node --check tsc-src/js/formacion-vivo.js`: **OK**.
- `node scripts/audit-wiring.mjs`: **rotos 0**.
- `node scripts/build-web.mjs` + `node scripts/smoke-parity.mjs`:
  **PARIDAD: OK**.
- **Arnés temporal** (fuera del repo, borrado al terminar) que extrae del
  archivo real `CRUZ`, `vectorCancha`, `rotar` y `flechaHTML`: **23
  comprobaciones en verde**. Casos: DI con `arriba` + `abajo` en horizontal →
  → ← (0° y 180°); CT con `izq` en horizontal → hacia arriba (−90°); `dcha` →
  abajo; diagonales; vertical sin cambio (arriba, abajo, izq y dcha); defensa
  horizontal izquierda y vertical abajo; el SVG sale con el ángulo convertido;
  `capaHTML` usa `CRUZ` + `vectorCancha`, no queda `VECTOR[]`, Defensa conserva
  `rotar(−1, 0, v)` y el texto del selector está en el archivo.

### Pendientes FV6

- Verlo a ojo en la Tool con el juego abierto (capa Ataque, escritorio y
  teléfono). El arnés no dibuja el DOM real.
- El auditor regenera `docs/reportes/MS-2.3-cableado.md` (fecha y números de
  línea). Ya venía modificado en la rama y quedó regenerado con el estado
  actual; no se editó a mano.
