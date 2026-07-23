# Reporte — H2H de la sección 06 (Historial)

> Bundle de dos cambios sobre el buscador **cara-a-cara** de la sección
> 06 (`_pubH.pickA/pickB`, inputs `#h2h-a`/`#h2h-b`) — no el filtro de
> lista (`_histState.qA/qB`, inputs `hist-qa`/`hist-qb`), que es un
> buscador distinto y no se tocó. Verificación Nivel 1–2, cero escrituras,
> según `PROTOCOLO_VERIFICACION.md`. **Nada de lo de abajo está commiteado.**

## Qué se implementó

### CAMBIO 1 — Logos reales en el crest del H2H (bug #6)

`_pubDrawH2H` (`history.js`) y el render de sugerencias de
`_pubSetupH2H` (`.h2h-ac-crest`) mostraban siempre iniciales
(`${_esc(iniA)}`/`${_esc(iniB)}`), nunca miraban `.logo` — a pesar de que
`pickA`/`pickB` salen de `_pubH.teamList`, que es un spread (`{...t}`) de
`_histTeams` (`dbGetAll('teams')` sin filtro de campos), así que `.logo`
viaja igual que `.color`/`.ini` cuando el equipo lo tiene.

Fix: `<img>` cuando `pickA.logo`/`pickB.logo`/`t.logo` existe (mismo
patrón usado en standings/calendar/palmarés: `_esc` en el atributo `src`,
`object-fit:cover`, contenedor con `overflow:hidden`), iniciales como
fallback. El fallback es necesario y alcanzable: `_pubHTeamMeta` (línea
468) crea equipos **sintéticos** para nombres del histórico sin equipo
real asociado — `{ id:'_'+name, name, ini, color, color2, search }`, sin
campo `.logo` en absoluto. Se agregó `overflow:hidden` a `.h2h-crest` y
`.h2h-ac-crest` en `redesign.css` (ninguna de las dos lo tenía).

Incluido también el fix opcional del crest de autocompletado
(`.h2h-ac-crest`, mismo patrón, misma data ya cargada — no hubo que traer
nada nuevo).

### CAMBIO 2 — El botón de la ficha cae en el H2H, no en la lista (pedido #1)

`histH2HShow(qA, qB)` (línea 1516) exigía los dos equipos
(`if(!ta||!tb) return;`). Se extendió para aceptar `qB` opcional: si no
viene, `_pubH.pickB` queda `null`, `#h2h-b` queda vacío, y el foco se
mueve a `#h2h-b` para que el usuario tipee el rival. No hubo que tocar
`_pubDrawH2H`: ya sabía dibujar el estado "falta un equipo" (oculta el
cuadro de resultado, muestra el hint, lista "Últimos partidos") — es el
mismo camino que ya se recorre hoy cuando un usuario teclea solo el
equipo A a mano en el buscador.

`_clubDossierViewAllMatches` (`profile.js`, Slice B) pasó de setear
`_histState.qA` (el filtro de LISTA) a llamar
`await histH2HShow(_clubDossierTeam.name)` (sin segundo argumento) después
de navegar a Historial — reusando el `await renderPubHistory()` que
`histH2HShow` ya hace internamente si `#h2h-a` todavía no existe (la
navegación recién montó la vista). No se re-implementó nada de eso.

**Label del botón cambiado** (avisado, no silencioso): "Ver todos sus
partidos" → **"Ver mano a mano"**. El destino real cambió — antes
aterrizaba en una lista de todos los partidos del club, ahora aterriza en
el comparador H2H con el club en la casilla A — dejar el texto viejo
hubiera sido engañoso sobre a dónde lleva el botón.

## Verificación

`window.__TSC_READONLY__ = true` desde el inicio. **Cero llamadas a
`dbAdd`/`dbPut`/`dbDelete`.** Fuente-vs-disco por hash SHA-256 (Node sobre
el archivo en disco vs. `.toString()` en el navegador) para
`_pubDrawH2H`, `histH2HShow` y `_clubDossierViewAllMatches` — los 3
coincidieron exactos antes de correr cualquier prueba.

| # | Criterio | Nivel | Resultado |
|---|---|---|---|
| a | H2H con equipo con logo (MALVINAS JR) y equipo sin logo (LA BOLSA FC, real) | 2 | Crest A: `<img>` con URL real de Cloudinary. Crest B: sin `<img>`, iniciales "LBF" — 1 de 2 con imagen, 1 de 2 con iniciales, exacto según el dato real de cada equipo |
| b | Recorte del `<img>` dentro de `.h2h-crest` | 2 | `overflow` computado: `hidden`. Rect del crest: 54×54px, rect del `<img>`: 54×54px — llena el contenedor sin desbordar |
| — | Autocompletado (`.h2h-ac-crest`), equipo con logo | 2 | 1 sugerencia, `hasImg:true` |
| c | Flujo completo: ficha del club real #37 (admin, sesión con club propio #61) → botón "Ver mano a mano" | 1/2 | `#h2h-a` = "ATL. JUNIOR YOSHUA", `_pubH.pickA.name` = "ATL. JUNIOR YOSHUA", `#h2h-b` = `""`, `_pubH.pickB === null`, foco en `#h2h-b` (`document.activeElement === inB`); ficha y drawer cerrados. Tipear "FK TUPADRE" en B: `_pubH.pickB.name` = "FK TUPADRE", `#h2h-result` pasa a `.show` |
| d | Abrir y cerrar la ficha (#37) SIN usar el botón, con un H2H previo ya dibujado (MALVINAS JR vs LA BOLSA FC) | 2 | `_pubH.pickA`/`pickB` idénticos antes y después (`unchanged:true`) — no se ensucia por abrir/mirar/cerrar |
| e | Regresión: clicks de blowout/mostGoals (`hito-blowout`/`hito-mostgoals`, dos equipos reales cada uno) | 2 | Ambos siguen resolviendo los 2 equipos (`INDEP. CORDERO` vs `SOY TRONCO FC` en los datos actuales) y mostrando el cuadro de resultado — sin regresión por el `qB` ahora opcional |
| f | Consola durante toda la sesión | 2 | Sin errores, revisada en 3 puntos distintos |
| — | Estado final | 2 | `AUTH` público/sin sesión; `_pfEscStack.length===0`; `window.__TSC_READONLY__===true` |

## Fuera de alcance (a propósito)

Filtro de lista (`_histState.qA/qB`) — deliberadamente no tocado, es el
otro buscador de la misma sección. Slice C de la ficha de club. Cualquier
otro renderer de crest fuera de la sección 06.

## Después

`graphify update .` corrido (2768 nodos, 7095 edges, 48 comunidades).
**Nada de lo anterior está commiteado.**
