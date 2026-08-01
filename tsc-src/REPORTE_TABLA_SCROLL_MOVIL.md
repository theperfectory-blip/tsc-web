# Reporte — Tabla de posiciones: más espacio para stats en móvil/APK

> Pedido directo del usuario (con captura de la APK real, 21:01, batería
> 52%): entre los nombres de equipo (sticky) y las stats casi no queda
> franja para agarrar el gesto de scroll. Propuesta acordada: sacar
> posición+escudo del bloque sticky (que solo quede fijo el nombre) +
> un pequeño "nudge" de scroll al mostrarse la tabla, como pista visual.
> Verificación Nivel 1–2, cero escrituras, `window.__TSC_READONLY__=true`
> desde el inicio, fuente-vs-disco antes de medir. **Nada de lo de abajo
> está commiteado.**

## Diagnóstico

`--stand-fix` (columna sticky: posición+escudo+nombre juntos) medía 236px
fijos, sin variante para móvil. A 375px de ancho eso dejaba solo ~101px de
franja visible para las 7 columnas de stats (medido y documentado ya en el
propio CSS) — la captura del usuario lo confirma: apenas PTS/PJ visibles,
el resto cortado. `position:sticky` no bloquea el gesto táctil (tocar y
arrastrar sobre la zona sticky igual scrollea el contenedor), pero
visualmente esa franja angosta desalienta el intento de deslizar.

## Cambio implementado

**`public.js`** (`_pubRenderGroupsBroadcast`): posición y escudo salieron
de `.st-fix` — ahora son hermanos sueltos ANTES de `.st-fix` (que quedó con
solo el nombre adentro). Mismo orden visual de siempre (pos, escudo,
nombre, PTS...), pero solo el nombre es sticky.

**`redesign.css`**: sin media query — el cambio es universal, pero solo se
nota donde hace falta (en desktop no hay overflow, así que sticky-o-no da
igual, nada se movía de todos modos).

- Grid de fila/colhead: `var(--stand-fix) repeat(7,...)` →
  `38px 32px var(--stand-fix) repeat(7,...)` (pos + escudo + nombre como 3
  tracks separados en vez de 1).
- `--stand-fix` bajó de `236px` (grupo completo) a `150px` (SOLO el
  nombre) — verificado que el nombre más largo real ("HALCONES SOLARES
  FC", 129px de texto) sigue entrando sin truncar (129px < 138px
  disponibles tras padding).
- `.st-pos`/`.st-crest`: perdieron `position:sticky` — quedan estáticos,
  viajan con el resto del contenido.
- `.st-fix`: sigue `position:sticky;left:0`, ahora envuelve solo el
  nombre.
- `.stand-fade.l` y `.stand-grid{min-width:...}`: recalculados con la
  misma fórmula (`38px + 32px + var(--stand-fix)`), única fuente de verdad
  igual que antes.
- Header "Club" (`.stand-colhead .st-fix`): `grid-column:1/4` para seguir
  abarcando visualmente las 3 columnas de la fila — sigue sticky entero
  (no tiene sentido "revelar" nada en un header de texto fijo).

**Resultado geométrico** (por qué funciona): en reposo (`scrollLeft=0`) se
ve idéntico a antes — mismo orden, mismos ~101px extra visibles de stats
sin tocar nada. Al deslizar más de 70px (ancho de pos+escudo), esos dos
elementos —no sticky— quedan completamente fuera de vista, y el nombre
"agarra" el borde izquierdo y se fija ahí: recién en ese momento se libera
ese ancho extra para las stats, que quedan con más columnas visibles a la
vez.

**Nudge** (`_pubStandNudge`, nueva): al terminar de armar la tabla, por
cada `.stand-card` con overflow real (`scrollWidth > clientWidth`, o sea
solo en pantallas angostas — en desktop nunca corre), un pequeño
peek-y-vuelta (`scrollTo(56) → 550ms → scrollTo(0)`, `smooth`). Guardado
por `data-nudge-key="${phaseId}-${gi}"` en un `Set` de módulo — UNA vez
por grupo, nunca en cada re-render (la suscripción en vivo puede refrescar
la tabla por datos ajenos mientras el usuario ya está navegando el scroll
a mano; repetir el nudge ahí pelearía contra ese gesto — mismo criterio ya
aplicado al centrado del Calendario en una ronda anterior). Respeta
`prefers-reduced-motion`/`MOTION.reduced()`.

## Verificación — Nivel 1-2, readonly, fuente-vs-disco

`window.__TSC_READONLY__ = true` desde el inicio. **Cero llamadas a
`dbAdd`/`dbPut`/`dbDelete`.** Hash SHA-256 de `_pubRenderGroupsBroadcast` y
`_pubStandNudge` (navegador vs. disco) — coincidieron exactos antes de
medir.

| # | Criterio | Nivel | Resultado |
|---|---|---|---|
| a | Reposo (375px, datos reales): mismo layout visual que antes | 1/2 | `pos` 0-38px, `crest` 42-68px, `.st-fix`(nombre) 70-220px, `pts` 220-262px, `pj` 262-304px — mismo orden, `posSticky`/`crestSticky`="static", `fixSticky`="sticky" |
| b | Al scrollear >70px, pos+escudo desaparecen y el nombre se fija | 1/2 | `scrollLeft=100` real: `pos` en `-100/-62` (fuera de vista), `crest` en `-58/-32` (fuera de vista), `.st-fix` en `0/150` (pegado al borde) — y ahora `GF` (330-372) queda parcialmente visible, cosa que en reposo no llegaba a asomar |
| c | Nombre más largo real no se trunca con el nuevo ancho | 2 | Los 18 nombres reales de un grupo, incluido "HALCONES SOLARES FC" (129px): `truncated:false` en todos — el `--stand-fix:150px` nuevo entra cómodo |
| d | Header "Club" sigue alineado sobre las 3 columnas | 2 | `.stand-colhead .st-fix`: `0-220px`, sticky, mismo ancho combinado que pos+escudo+nombre de la fila |
| e | Desktop sin regresión (nunca hubo overflow, sigue sin haberlo) | 2 | 750px de ancho: `scrollWidth===clientWidth` (706px), sin scroll, las 7 columnas visibles enteras — igual que antes del cambio |
| f | Nudge: guard de "una sola vez" | 1 | Tras el mount, `_pubStandNudged.size===2` (2 grupos con overflow real). Llamar `_pubStandNudge(el)` de nuevo (simulando un refresh en vivo) → tamaño sigue en `2`, no se repite |
| g | Nudge: la animación en sí | — | **Limitación de entorno, no del código**: la pestaña del Browser pane queda `document.hidden===true` en esta sesión (gotcha ya documentado en memoria de este proyecto — rAF/scroll-compositor pausados en pestaña oculta). `scrollTo({behavior:'smooth'})` no mueve `scrollLeft` mientras está oculta; el mismo `scrollTo({behavior:'auto'})` sí lo mueve al instante — confirma que el mecanismo de scroll en sí funciona, solo el EASING suave no se puede observar en este entorno. La lógica de guardado/una-vez (f) y la geometría resultante (a, b) sí están 100% verificadas con datos reales |
| h | Consola limpia | 2 | Sin errores en toda la sesión (móvil y desktop) |
| — | Estado final | 2 | Recarga final limpia; `window.__TSC_READONLY__===true` |

## Corrección — títulos de stat (PTS, PJ...) desaparecían antes de tiempo

Reportado por el usuario con captura real de la APK: al scrollear, los
títulos de columna (PTS, PJ) se ocultaban ANTES que los valores de esas
mismas columnas en las filas — desfasados entre sí.

**Causa raíz** (confirmada leyendo el CSS, no asumida): el header "Club"
quedó como UN SOLO elemento `.st-fix` abarcando los 3 tracks de pos+escudo+
nombre (`grid-column:1/4`), con posición natural ya en `x=0` — es decir,
sticky (`left:0`) desde el primer instante de scroll (`scrollLeft>0`), sin
transición. La fila, en cambio, tiene pos+escudo+nombre como 3 elementos
sueltos: el nombre (único sticky) recién "engancha" en `x=0` cuando
`scrollLeft` supera 70px (38+32, el ancho de pos+escudo) — antes de eso se
mueve con el resto del contenido, igual que pos y escudo. Entre
`scrollLeft` 0 y 70, el header (opaco, `z-index:2`, ya pegado y cubriendo
0-220px) y la fila (nombre todavía NO pegado, footprint real más chico)
dejaron de estar sincronizados: los títulos PTS/PJ del header, al haber
ARRANCADO a moverse con el scroll pero terminar tapados por el bloque
opaco del header ya fijo, se ocultaban antes que los valores numéricos
correspondientes de la fila.

**Fix**: el header ahora tiene la MISMA estructura que la fila — 2 celdas
vacías (tracks de pos/escudo, sin contenido) + `.st-fix`("Club") en el
track 3, sin `grid-column:1/4`. Con eso, header y fila enganchan su sticky
en el MISMO `scrollLeft` (70px) y con el MISMO footprint (150px) — cero
desfasaje en ningún punto del scroll.

**Verificación** (Nivel 1-2, datos reales, fuente-vs-disco repetido tras el
fix — hash de `_pubRenderGroupsBroadcast` coincidió exacto antes de medir):
medidas de `clubHdr` vs `nameRow` y `ptsHdr` vs `ptsRow` (y `pjHdr` vs
`pjRow`) en 7 puntos de scroll (`0,20,40,56,70,100,150`) — coinciden
PIXEL A PIXEL en los 7, incluida la zona de transición (20-56, donde antes
estaba el desfasaje). Consola limpia.

## Corrección 2 — el difuminado izquierdo caía en el medio de las stats

Reportado por el usuario con dos capturas reales (Chrome DevTools modo
responsive en celular): al scrollear, el difuminado que debería marcar el
borde del nombre fijo aparecía 70px más a la derecha de lo debido,
oscureciendo una columna de stats en el medio (el usuario lo notó en "E"
de empates).

**Causa raíz**: al mover posición+escudo fuera del bloque sticky (fix
anterior), dejé sin actualizar el cálculo de `.stand-fade.l` — seguía
usando `left:calc(38px + 32px + var(--stand-fix))` (=220px), que era el
ancho del bloque VIEJO completo (pos+escudo+nombre juntos, todo sticky).
Pero ahora solo el nombre es sticky, y su borde real (una vez enganchado
en `scrollLeft>70`) queda en `var(--stand-fix)` (150px), no en 220px. El
difuminado quedó "flotando" 70px de más, cayendo sobre una columna de
stats en vez de pegado al borde del nombre — invisible en mi verificación
anterior porque no medí explícitamente la posición de `.stand-fade.l`
durante el scroll (solo el layout de columnas).

**Fix**: `.stand-fade.l{left:var(--stand-fix)}` — vuelve a coincidir con
el borde real del único elemento que sigue siendo sticky.

**Verificación**: a `scrollLeft=100` (nombre ya enganchado), la posición
absoluta del fade (`150px`) coincide EXACTA con el borde derecho real del
nombre (`150px`, medido por `getBoundingClientRect`). La visibilidad
(`.more-l` → `opacity:1`) se confirmó con la transición desactivada
momentáneamente para lectura instantánea — la pestaña de prueba queda
`document.hidden`, y ahí las transiciones CSS también se frenan (mismo
gotcha ya documentado con `rAF`/`scrollTo({behavior:'smooth'})` en este
mismo slice). Consola limpia.

## Fuera de alcance

Ningún otro renderer de tabla (histórico, admin) usa `.stand-*` — es
exclusivo de `_pubRenderGroupsBroadcast` (público). No se tocó
`standings.js` (admin).

## Después

`graphify update .` corrido — última vez (2833 nodos, 7239 edges, 49
comunidades). **Nada de lo anterior está commiteado.**
