# Reporte — #4 revisado (mando junto al marcador) + #3-lite (selector admin)

> Dos cambios sobre "Luis controla": #4 ajusta cómo se MUESTRA en público
> (revierte la versión anterior, mando en ambos equipos), #3-lite agrega un
> selector para SETEARLO en el admin. Van juntos porque uno escribe
> `luisTeam` y el otro lo muestra. #2 (PTS primero) no se tocó — verificado
> intacto al final. Verificación Nivel 1–2, cero escrituras,
> `window.__TSC_READONLY__=true` desde el inicio, según
> `PROTOCOLO_VERIFICACION.md`. **Nada de lo de abajo está commiteado.**

## #4 revisado — mando SOLO en el equipo de Luis, junto al marcador

Se revirtió la versión anterior (mando en ambos nombres de equipo, con
tooltip distinto por lado). Nuevo comportamiento en `scoreRow`
(`_pubRenderGroupsBroadcast`, `public.js`):

- El mando (`_FX_GAMEPAD_ICON`) va **solo** en el lado que controla Luis
  (`m.luisTeam===m.teamA` o `===m.teamB`) — nunca en el rival.
- Ubicación: dentro de `.score-nums` (el centro, junto al marcador/VS), no
  en los nombres — primer hijo (izquierda) si controla al local, último
  hijo (derecha) si controla a la visita. `.score-nums` ya es
  `display:flex;gap:12px`, así que el ícono queda espaciado del marcador
  sin CSS adicional.
- Un solo tooltip: **"Luis controla este equipo"** — se sacó "Enfrenta a
  Luis" (ya no aplica, no se marca al rival).
- Si `m.luisTeam==null`, nada (sin cambios respecto a antes).
- La vista admin (`matches.js:453-455`) no se tocó — ya mostraba solo el
  lado controlado.

## #3-lite — selector del equipo que controla Luis (admin, modal "Editar fecha")

Sistema simple, **sin validar el recorrido** (Luis ya verificó sus equipos
de Div 1 a mano; el modal solo tiene que poder registrarlos — a diferencia
de `pairingBlockReason`/`byeBlockReason`, que sí bloquean, `updateRondaLuis`
nunca rechaza nada).

Threading del campo `luis` (teamId o `null`) en el slot, en `matches.js`:

1. **Inicialización** (`openRondaModal`): el `forEach` que arma los slots
   desde los matches existentes ahora agrega `luis: m.luisTeam ?? null`; el
   padding de slots vacíos (`while(slots.length<slotsCount)...`) agrega
   `luis:null` también, para que TODO slot tenga el campo definido desde el
   arranque (nunca `undefined`).
2. **UI** (`renderRondaModalContent`, por slot): un `<select>` chico de 3
   opciones (`— / Local / Visita`) con el ícono de mando como affordance
   antes del select. Las opciones "Local"/"Visita" solo aparecen si
   `slot.a`/`slot.b` ya están asignados (`slot.a!=null`/`slot.b!=null`) —
   si el modal re-renderiza tras cambiar el par, las opciones se recalculan
   solas en la siguiente pasada. `option.selected` compara
   `slot.luis===slot.a` / `===slot.b`, no un string fijo, así que sigue el
   ID real aunque el par cambie de equipos.
3. **Handler** (`updateRondaLuis(slotIdx, value)`): `value` es `'a'/'b'/''`
   del DOM — se resuelve a `slot.a`/`slot.b`/`null` (nunca se guarda el
   string crudo), y re-renderiza. Mismo patrón que `updateRondaSlot`.
4. **Coherencia** (`updateRondaSlot`): al final, si `slot.luis` ya no es ni
   `slot.a` ni `slot.b` (el par cambió y el equipo de Luis salió del
   partido), se limpia a `null`. Si el par cambia pero el equipo de Luis
   sigue siendo uno de los dos lados, se preserva.
5. **Persistencia** (`saveRonda`, ambas ramas):
   - **update**: se agregó `luisTeam:sLuis` al objeto del `dbPut`. La
     condición que decide si el `dbPut` corre pasó de
     `m.teamA!==s.a || m.teamB!==s.b` a también comparar
     `mLuis!==sLuis` (`mLuis = m?.luisTeam ?? null`) — así un cambio de
     SOLO `luis` (par intacto) también dispara el guardado, que antes se
     perdía silenciosamente.
   - **create**: se agregó `luisTeam:sLuis` al objeto del `dbAdd`.

## Verificación — Nivel 1-2, readonly, fuente-vs-disco

`window.__TSC_READONLY__ = true` desde el inicio. **Cero llamadas reales a
`dbAdd`/`dbPut`/`dbDelete`** (confirmado no solo por el guard, sino porque
`saveRonda` nunca se ejecutó en esta sesión). Hash SHA-256 de las 6 funciones
tocadas (navegador vs. disco) — las 6 coincidieron exactas antes de correr
cualquier prueba: `_pubRenderGroupsBroadcast`, `openRondaModal`,
`renderRondaModalContent`, `updateRondaSlot`, `updateRondaLuis`, `saveRonda`.

| # | Criterio | Nivel | Resultado |
|---|---|---|---|
| a.1 | #4: exactamente 1 icono por partido con `luisTeam`, 0 en los demás | 2 | Datos reales, fase 11 (2da División): 32 matches con `luisTeam` → 32 `<svg>` dentro de `.score-nums` en los 112 `score-row` renderizados. 0 `<svg>` dentro de `.score-team` (nombre) en ningún caso |
| a.2 | #4: lado correcto (izq si controla local, der si controla visita) | 1/2 | 5 partidos reales muestreados por nombre de equipo (no por índice, para evitar falsos positivos entre grupos): los 5 coinciden exactos — `m.luisTeam===m.teamA` → ícono primer-hijo de `.score-nums`; `===m.teamB` → último-hijo. Ej.: match 848 (`FARAONES FUTBOL CLUB` vs `D. SIESTA`, `luisTeam=64=teamA`) → izquierda; match 839 (`LA TOCATA AS` vs `LOS NHUPIS`, `luisTeam=33=teamB`) → derecha |
| a.3 | Tooltip único | 2 | Los 32 iconos: `title="Luis controla este equipo"` — ninguno con "Enfrenta a Luis" (se sacó) |
| b.1 | #3-lite: inicialización desde `m.luisTeam` | 1 | `openRondaModal(11,0,1)` real (ronda con match #839, `luisTeam=33=teamB`): `slots.find(s=>s.matchId===839).luis === 33`; los 3 slots restantes (sin `luisTeam`) → `luis===null`. Los 4 slots tienen el campo `luis` definido |
| b.2 | UI: select por slot, ícono de mando, opción correcta preseleccionada | 2 | 4 `<select onchange="updateRondaLuis...">` en el DOM real del modal, cada uno con el ícono `<svg>` inmediatamente antes. Slot del match 839: opción `"b"` (Visita) `selected:true` — coincide con `luis=33=slot.b` |
| b.3 | `updateRondaLuis` setea y re-renderiza | 1 | `updateRondaLuis(1,'a')` → `slots[1].luis` pasó a `28` (=`slots[1].a`); el `<select>` del DOM (post re-render) refleja `value="a"` |
| b.4 | Coherencia: cambiar el par limpia `luis` SOLO si el controlado salió | 1 | `updateRondaSlot(1,'a','41')` (cambia el lado que SÍ tenía el control, de `28`→`41`) → `slots[1].luis` pasó de `28` a `null`. Contraprueba: `updateRondaSlot(0,'a','1')` (cambia el lado que NO tenía el control; slot 0 controlado por `b=33`) → `slots[0].luis` se mantuvo en `33` — no se limpia de más |
| c | #3-lite persistencia (saveRonda) | — | **Verificado por lectura de código, NO ejecutado** (readonly activo, y no corresponde escribir en prod desde esta sesión): rama `update` — `mLuis = m?.luisTeam ?? null`, condición `m.teamA!==s.a \|\| m.teamB!==s.b \|\| mLuis!==sLuis`, objeto del `dbPut` incluye `luisTeam:sLuis`. Rama `create` — objeto del `dbAdd` incluye `luisTeam:sLuis`. Ambas confirmadas en el archivo tras el hash fuente-vs-disco (mismo contenido que corrió en el navegador) |
| d.1 | #2 (PTS primero) sigue intacto | 2 | Colhead real: `Club, PTS, PJ, G, E, P, GF, GC` — sin cambios; `standings.js` (admin) no se tocó (confirmado por `git status`, sin diff) |
| d.2 | Consola limpia | 2 | Sin errores en toda la sesión (creación de fila sintética, apertura/cierre del modal real, `updateRondaSlot`/`updateRondaLuis` repetidos) |
| — | Estado final | 2 | Modal cerrado (`closeRondaModal()`, `_rondaModalState===null`); nodo de prueba (`#__test_scratch__`) removido; recarga final limpia; `window.__TSC_READONLY__===true` |

## Fuera de alcance (a propósito)

El guardado real end-to-end (setear el equipo de Luis en una fecha real y
confirmar que persiste + aparece el mando) queda para que el usuario lo
pruebe en su propia sesión — es una escritura real en producción y no
corresponde ejecutarla desde acá.

## Después

`graphify update .` corrido (2775 nodos, 7119 edges, 47 comunidades).
**Nada de lo anterior está commiteado.**
