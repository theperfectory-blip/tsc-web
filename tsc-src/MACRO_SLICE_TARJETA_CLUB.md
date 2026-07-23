# Macro Slice — Tarjeta del club + Ficha de club · 2026-07-22

> Especificación del **supervisor (Opus)**, con cada afirmación técnica
> verificada leyendo el código. **Nada de este documento está implementado.**
> Cada slice se ejecuta, se verifica y se cierra por separado — no se avanza
> al siguiente sin aprobación.
>
> Verificación limitada a **Nivel 1–2** del [PROTOCOLO_VERIFICACION.md](PROTOCOLO_VERIFICACION.md)
> (ver riesgo #1: esta es la zona que el guard de `db.js` no cubre).

## Objetivo

1. La tarjeta del perfil muestra **lo que el club ganó**, no solo cuántos
   partidos jugó.
2. **Arreglar "Ver el historial de mi club"**: hoy ese botón
   ([profile.js:683](js/profile.js#L683)) precarga `_histState.qA` con el
   nombre del club y navega a la página global de Partidos/Tabla histórica.
   Entrás pidiendo *lo mío* y aterrizás en *todo, filtrado* — y el filtro
   queda pegado en `_histState` cuando navegás a otro lado.

## 0. Decisiones ya tomadas (y por qué)

- **Las fotos NO van inline en la tarjeta** (decisión del usuario). Abren en
  un modal aparte. Esto evita dos problemas de una: que la tarjeta quede
  desbordada en móvil, y que se vea un bloque vacío mientras no haya
  galerías cargadas.
- **Subir fotos es solo admin**, ver miniaturas es para todos. No es una
  preferencia: las reglas de Firestore lo imponen (riesgo #2).
- **Dos slices de entrega**, mismo alcance total. Un slice que toca dos
  superficies, agrega un visor nuevo y una agregación nueva es demasiada
  área para verificar de una pasada con las manos atadas a Nivel 1–2.

## 1. Lo que YA existe (reusar, no recrear)

Ningún dato nuevo hay que modelar. Todo lo del mock ya está en la base.

| Recurso | Dónde | Qué da |
|---|---|---|
| `aggregatePalmaresByTeam()` | [palmares.js:492](js/palmares.js#L492) | `Map teamId → {compKey: n, _total}` |
| `PALMARES_COMPS` | [palmares.js:11](js/palmares.js#L11) | `{key, label, short, trophy, color}` por competición |
| `PALM_IMPORTANCE` | [palmares.js:23](js/palmares.js#L23) | orden de importancia de copa |
| `renderTrophy(key, size)` | [palmares.js:411](js/palmares.js#L411) | SVG del trofeo |
| `record.gallery` + `_palmGallerySafeItems()` | [palmares.js:1448](js/palmares.js#L1448) | `[{url, alt}]`, máx 12, por título |
| `openPalmaresGallery(recordId)` | [palmares.js:1541](js/palmares.js#L1541) | gestor de subida admin **ya hecho** (drag & drop, alt, orden) |
| `_loadTeamStats(teamId, team)` | [profile.js:279](js/profile.js#L279) | `{W,D,L,GF,GA,P}` — **ya contempla `previousNames`**, aguanta renames |
| `_getResolvedRecords()` | usado por `_loadTeamStats` | filas del histórico resueltas |
| `_statsHTML`, `form-strip`, `_donutSVG` | [profile.js:320](js/profile.js#L320) | bloques visuales de la tarjeta |
| `openModal` / `closeModal` / `showToast` | `ui-utils.js` | infra de modales |
| `_profileTrapKeydown` | [profile.js:87](js/profile.js#L87) | precedente de trampa de foco + Esc |

**Lo único que se construye de cero:** el visor de imagen ampliada (barrido
hecho: no existe ninguno en toda la app, ni para el collage de la sala) y la
agregación de rivalidades.

## 2. Slice A — Vitrina en la tarjeta del perfil

**A.1 — Contador de títulos en el header.** Junto al crest, `×N` con el
`_total` del Map. Si el club no tiene títulos, no se renderiza (nada de
`×0`).

**A.2 — Bloque VITRINA.** Un chip por competición ganada: trofeo (mismo
`renderTrophy`, tamaño chico) + label + `×N`. Ordenados por
`PALM_IMPORTANCE`, no por orden de columnas. Color del chip = `comp.color`.

**A.3 — Botón "Fotos de campeón"** dentro del bloque → abre el modal de la
sección 4. **Nunca miniaturas inline.**

**A.4 — Estados vacíos.** Club sin títulos → el bloque entero no existe.
Club con títulos pero sin fotos → el bloque se ve, el botón de fotos no.
Ningún placeholder vacío ocupando espacio.

**Criterios de aceptación (medibles):**
- Con un club con títulos: `N` chips = `N` competiciones distintas ganadas,
  y la suma de los `×n` = `_total` del contador del header.
- Con un club sin títulos: `document.querySelectorAll('.pp-vitrina').length === 0`.
- Altura de la tarjeta a 375×812 **antes vs después**: la tarjeta no puede
  pasar a necesitar scroll si antes no lo necesitaba (ver riesgo #4).

## 3. Slice B — Ficha de club (el arreglo del botón)

Nueva superficie. Hoy **no existe ninguna vista de detalle de equipo** en
toda la app: `renderPubTeams` es solo una grilla.

> **Requisito de arquitectura, no negociable:** la ficha se construye
> `openClubDossier(teamId)` — **parametrizada por equipo desde el día uno**,
> nunca como "mi club". El Slice C la abre para cualquier equipo desde la
> grilla pública; si se escribe atada al club propio, hay que reescribirla.
> Lo único que cambia entre las dos entradas es de dónde sale el `teamId`.

Contenido, en este orden:

1. **Cabecera** — escudo, nombre, colores del club.
2. **Récord histórico** — PJ/G/E/P, GF/GC, % de victorias. Sale de
   `_loadTeamStats`, ya escrito y ya a prueba de renames.
3. **Palmarés del club** — todos sus títulos con trofeo, competición y
   temporada. Es el bloque que más paga: es exactamente lo que el botón
   promete hoy y no cumple.
4. **Rivalidades** — top 5 rivales por partidos jugados, con balance
   (G-E-P). **De la misma pasada** que el récord histórico (riesgo #5).
5. **Temporada actual** — posición en su grupo + próximo partido.
6. **Salida** — "ver todos sus partidos": recién ahí se hace lo de hoy
   (setear `_histState.qA` + navegar), como puerta de salida y no como
   destino. **Al cerrar la ficha, el filtro se limpia** — el bug de hoy es
   justamente que queda pegado.

**Criterios de aceptación:**
- El botón ya no llama a `goPublicPage('historial')` directamente.
- Tras abrir y cerrar la ficha sin usar la salida, `_histState.qA` queda
  como estaba (comprobado leyendo el objeto, no navegando).
- El récord histórico de la ficha coincide con el de la tarjeta (misma
  fuente, no dos cálculos que puedan divergir).

## 3-bis. Slice C — La ficha desde la grilla pública de equipos

Decisión del supervisor (el usuario delegó). **Sí se hace**, por tres
motivos concretos:

1. **Los datos ya están cargados.** `renderPubTeams` ya calcula
   `_pubTeamStats` y `_pubTeamTitles` (`aggregatePalmaresByTeam`) antes de
   pintar la grilla ([teams.js:621](js/teams.js#L621)). No hay fetch nuevo.
2. **Convierte un número muerto en una puerta.** Hoy la tarjeta muestra
   `Títulos: 3` ([teams.js:534](js/teams.js#L534)) sin forma de ver *cuáles*.
   Con la ficha detrás, ese número pasa a ser una promesa que se cumple.
3. **Resuelve estructuralmente el "sobran/faltan datos"** de las tarjetas
   públicas: la tarjeta se queda como anticipo (escudo, nombre, 3 números,
   forma) y todo el detalle vive en la ficha — en vez de seguir apretando
   datos dentro de una tarjeta de grilla.

**Alcance real del slice:** hacer la tarjeta accionable →
`openClubDossier(t.id)`. Es chico *solo si* el Slice B respetó la
parametrización. Se cierra por separado, después de B.

**Criterios:** la tarjeta es alcanzable por teclado (no solo click), tiene
rol/label accesible, y abrir la ficha de un equipo ajeno muestra sus datos,
no los del club propio (la prueba de que la parametrización es real).

## 4. Modal de fotos de campeón (compartido por A y B)

- **Miniaturas agrupadas por título** (cada foto pertenece a un
  `palmares.{id}`, no al club suelto).
- **Admin:** botón que abre `openPalmaresGallery(recordId)`, el gestor que
  **ya existe**. No se duplica el uploader ni se escribe uno nuevo.
- **No admin:** solo miniaturas, sin controles de subida (riesgo #2).
- **Ver en grande:** visor nuevo. Esc cierra, foco atrapado (precedente:
  `_profileTrapKeydown`), sin scroll de página detrás.

## 5. Riesgos y límites

1. **`profile.js` es la zona que el guard de `db.js` NO cubre** — escribe
   directo a Firestore sobre `users` ([profile.js:735](js/profile.js#L735)).
   Verificación **Nivel 1–2 exclusivamente**. Un accidente acá toca el
   perfil real del usuario.
2. **Un presidente no puede subir fotos.**
   `match /palmares/{id} { allow write: if isAdmin(); }`
   ([firestore.rules:29](../firebase/firestore.rules#L29)). Existe el
   precedente de una excepción acotada por dueño en `teams/{teamId}`
   (líneas 36-39), así que se *podría* permitir que un presidente edite
   solo el campo `gallery` de los títulos de su propio club — pero es un
   cambio de reglas de seguridad, no se puede verificar en local y hay que
   desplegarlo a mano. **Fuera de este macro**, decisión aparte.
3. **Las fotos locales de `assets/galeria/` no sirven como están.**
   `_palmGallerySafeItems` filtra a `https://` ([palmares.js:1454](js/palmares.js#L1454)),
   un path relativo se descarta en silencio. Ese filtro es una defensa
   contra URLs `javascript:`/`data:` — **no se toca**. Las fotos se suben
   por el gestor admin (va a Cloudinary).
4. **Regla de no-scroll del proyecto.** La tarjeta ya tiene header + stats +
   forma + 3 filas. Medir altura a 375×812 antes y después; si no entra, la
   vitrina va colapsada por defecto.
5. **Perf:** `_loadTeamStats` ya recorre todo el histórico en cada apertura.
   Las rivalidades salen de esa misma pasada, no de un segundo escaneo.
6. **Orden de carga:** `profile.js` (script 586) carga **antes** que
   `palmares.js` (script 607). Lo del palmarés solo se toca dentro de
   funciones, nunca en el nivel superior del archivo.
7. **Iconos:** SVG inline estilo Lucide. Nunca emojis (CLAUDE.md).
8. **`innerHTML`:** todo dato externo pasa por `_pfEsc` (o el helper del
   módulo). Las URLs de foto van en atributo → escapado de atributo.

## 6. Verificación exigida

Por slice, con números medidos, no "se ve bien". Cada fila declara su nivel.

- Nivel 1 para toda la lógica de agregación (títulos, rivalidades):
  invocar las funciones con datos sintéticos, incluidas las ramas que los
  datos reales de hoy no cubren (club sin títulos, título sin fotos).
- Nivel 2 para altura de la tarjeta, estados vacíos y el visor.
- **Cero escrituras.** Si algo solo se puede probar escribiendo, se para y
  se pregunta.

## 7. Fuera de alcance (a propósito)

- Cambiar las reglas de Firestore para que presidentes suban fotos (#2).
- Tocar el filtro `https://` de las galerías (#3).
- Migrar las 9 imágenes de `assets/galeria/` — es material fuente, se sube
  por el gestor cuando el usuario decida a qué título pertenece cada una.
- **Rediseñar la tarjeta pública de equipo** (qué números sobran y cuáles
  faltan). El Slice C la hace accionable, pero no le cambia el contenido:
  qué se muestra en una tarjeta de grilla es una decisión de diseño que
  merece su propia pasada, con el criterio ya fijado de que la tarjeta es
  anticipo y la ficha es el detalle. Candidato a Slice D.
