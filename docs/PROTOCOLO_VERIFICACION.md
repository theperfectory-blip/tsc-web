# Protocolo de verificación contra producción · regla permanente

> Desde 2026-07-21. Aplica a **cualquier** verificación en este proyecto —
> `localhost:3000` no tiene sandbox, pega directo contra Firestore de
> producción (`tsc-web-yuna`). Este documento es la referencia; no se
> repite el razonamiento completo en cada reporte de slice, solo se cita.

## Por qué existe

Verificando el reorder de campeones del palmarés (ver
`REPORTE_FIX_LOGOS_NOMBRES.md`, parte 2), se parcheó `_palmPersistOrder`
por un no-op temporal para probar el flujo real sin escribir en la base, y
se restauró al final. Funcionó, pero el método tenía un agujero real: si
salta una excepción entre el parche y el `restore`, la función queda
anulada para el resto de la sesión — el usuario, usando el panel admin en
esa misma pestaña después, pierde sus escrituras **en silencio** (sin
error, sin toast). Auditar después si eso pasó fue posible solo de forma
indirecta (releer el registro y comparar), porque no hay ningún campo
`updatedAt` que deje rastro forense de una escritura fantasma — la
ausencia de rastro no prueba la ausencia de escritura.

## Parte 1 — Guard de solo-lectura (`db.js`)

`_assertWritable(op, store)` ([db.js:25-29](tsc-src/js/db.js#L25)), llamado
como primera línea de las 5 funciones de escritura
(`dbAdd`/`dbAddMany`/`dbDeleteMany`/`dbPut`/`dbDelete`,
[db.js:110-220](tsc-src/js/db.js#L110)): si `window.__TSC_READONLY__` está
en `true`, lanza `Error('[TSC readonly] Escritura bloqueada: {op} en
"{store}"')` en vez de tocar la base. Con el flag apagado (default), el
comportamiento es idéntico al de siempre — una comparación booleana falsa,
nada más.

**`_fsNextId` y `_fsReserveIds` no tienen guard propio — quedan bloqueados
transitivamente, de forma estructural.** Sus únicos call sites son la
primera línea del cuerpo de una función ya guardada, en el mismo archivo:
`_fsNextId` desde `dbAdd`/`dbPut`, `_fsReserveIds` desde `dbAddMany`. El
guard de esas funciones corre incondicionalmente antes de que exista
ninguna forma de llegar al helper interno — no depende del orden de nada
más, es la primera instrucción de la función que lo contiene.

**`dbEnsureCounterAtLeast` SÍ tenía un agujero real — corregido con guard
propio ([db.js:65-67](tsc-src/js/db.js#L65)), no con un comentario.**
Primer intento (erróneo, de esta misma sesión): asumir que quedaba
protegida igual que las anteriores por tener "un único call site". Es
cierto que solo se llama desde `data.js:142` (`_dataImportStore`), pero
ese call site **no** es un guard — es un loop de `dbPut` que, por
casualidad de orden, corre *antes* en el código. El supervisor lo probó en
vivo (con el guard viejo, sin tocar `dbEnsureCounterAtLeast`, flag
encendido): la escritura **pasaba de largo y llegaba a Firestore** — la
"protección transitiva" que se había dado por buena era falsa. Leyendo el
código se confirma por qué: **si algún día se reordenan esas dos líneas
en `_dataImportStore`, o se agrega un segundo caller que invoque
`dbEnsureCounterAtLeast` sin pasar antes por un `dbPut`, el agujero vuelve
sin ningún aviso.** Eso no es protección estructural, es protección por
coincidencia — por eso se cierra con
`_assertWritable('dbEnsureCounterAtLeast', store)` como primera línea de
la propia función, igual que las 5 anteriores. Verificación propia (Nivel
1, sin invocar la función real contra producción): con el flag encendido,
`_assertWritable('dbEnsureCounterAtLeast','teams')` invocado directo lanza
el mensaje esperado; flag restaurado apagado después.

**Cuándo se activa:** nunca antes de que termine `window.onload` —
`seedInitialData()` escribe en el arranque de una base vacía y reventaría
en el boot si el flag ya estuviera activo.

**Verificado (2026-07-21):**
- Camino feliz (flag apagado): se invocó `_assertWritable('dbPut','teams')`
  directo — no lanzó. **No** se hizo una escritura real para probar esto
  (habría sido innecesario: el guard es una comparación booleana, leerlo
  alcanza).
- Flag encendido: `await dbPut('teams', {...equipoLeído})` lanzó
  `[TSC readonly] Escritura bloqueada: dbPut en "teams".`; se releyó el
  mismo registro (`dbGet`) después del intento bloqueado y es
  byte-idéntico al de antes (`JSON.stringify` antes/después iguales) — la
  base no cambió.
- El flag se apagó (`window.__TSC_READONLY__ = false`) inmediatamente
  después de la prueba, confirmado leyendo su valor.

## Parte 2 — Niveles de verificación (regla permanente)

Para verificar cualquier cosa en la app, usar el nivel **más bajo** que
responda la pregunta. Subir de nivel solo si el anterior no alcanza, y
justificar por qué en el reporte.

**Nivel 1 — Funciones puras con datos sintéticos (preferido).** Invocar el
renderer directo y mirar el string devuelto. No toca DOM, no toca base,
prueba las dos ramas de un fallback aunque los datos reales de producción
solo tengan una (ej.: `_palmVitrineDataHTML({champTeam:{...,logo:null}, ...})`
para probar el fallback sin logo cuando los 5 campeones reales sí tienen).

**Nivel 2 — Medición de solo lectura sobre el DOM ya renderizado.**
`getBoundingClientRect`, `getComputedStyle`, `.matches()`, contar nodos.
Para todo lo geométrico y de estado visual — nunca `opacity` computado si
la pestaña puede estar `document.hidden` (transiciones CSS congeladas).

**Nivel 3 — Mutación en memoria de estado de vista ya cargado.** Ej.:
anular `entry.champTeam.logo` en un array ya cargado y re-renderizar.
Permitido, con dos condiciones: restaurar en un `finally` (no al final del
camino feliz — un throw en el medio no debe dejarlo sin restaurar), y
**verificar después que la restauración ocurrió** (releer el valor, no
asumir que el `finally` corrió).

**Nivel 4 — Parchear una función viva.** Último recurso. **No se usa sin
pedir autorización explícita antes**, explicando por qué los niveles 1-3
no alcanzan. Si se autoriza: `try/finally` con el restore en el `finally`,
aserción posterior de que la función original volvió, y **recarga de la
página al terminar** para garantizar estado limpio (no confiar en que la
sesión de verificación siga siendo representativa del estado real de la
app después de haber parchado algo en vivo).

**Prohibido siempre durante una verificación:** `dbAdd`, `dbAddMany`,
`dbPut`, `dbDelete`, `dbDeleteMany`, o cualquier escritura directa a
Firestore fuera de esas funciones. Si una prueba solo tiene sentido
escribiendo, no inventar un rodeo — parar y preguntar.

## Lo que el flag NO protege

El guard vive en `db.js` — **solo cubre lo que pasa por sus 5 funciones**.
Varios módulos escriben a Firestore **directo**, sin pasar por `dbAdd`/
`dbPut`/etc., y esas escrituras **no tienen ningún guard**:

- **`users-admin.js`** — `.update(...)` directo sobre `users/{uid}`:
  `adminSetUserLock` ([users-admin.js:97](tsc-src/js/users-admin.js#L97),
  `lockEdits`), `adminSetUserRole`
  ([users-admin.js:107](tsc-src/js/users-admin.js#L107), `role`),
  `adminSetUserTeam` ([users-admin.js:118](tsc-src/js/users-admin.js#L118),
  `teamId`), `updatePresidentLink`
  ([users-admin.js:152](tsc-src/js/users-admin.js#L152) y
  [:156](tsc-src/js/users-admin.js#L156), desvincula/vincula `teamId`).
- **`auth.js`** — `ref.set(profile)`
  ([auth.js:193](tsc-src/js/auth.js#L193)): crea el documento de perfil al
  registrarse.
- **`profile.js`** — `userRef.update(upd)`
  ([profile.js:735](tsc-src/js/profile.js#L735)): el usuario edita su
  propio perfil (nombre, username, foto).

**En la colección `users`, un Nivel 4 sigue siendo tan peligroso como
antes de este documento** — el guard de la Parte 1 no lo alcanza. Dato
concreto para no perderlo de vista: el próximo slice previsto (tarjeta del
club) vive justamente en `profile.js`, el mismo archivo con la escritura
sin guard de arriba. Si esa verificación necesita parchear algo en vivo,
NO asumir que el guard cubre — es Nivel 4 sin red, mismas reglas de
autorización explícita que siempre, y ningún atajo nuevo que este
documento no haya dado.

**Caso de referencia (el que motivó esta regla):** para probar el reorder
del palmarés no hacía falta disparar el handler real contra producción. La
lógica de swap es un intercambio de dos posiciones en un array — Nivel 1,
aislable sin tocar el DOM ni la base. Que el swap efectivamente llegue a
`_palmPersistOrder` se prueba leyendo el código (6 líneas), no
ejecutándolo. Disparar el flujo completo (Nivel 4, lo que se hizo) compró
muy poca certeza extra a cambio de todo el riesgo de la excepción a mitad
de camino. Con el guard de la Parte 1 integrado, ese caso puntual
(`_palmPersistOrder` → `dbPut`) queda cubierto — pero eso **no** generaliza
a "Nivel 4 es seguro por diseño" en toda la app, como decía una versión
anterior de este párrafo: ver la sección de arriba para lo que sigue sin
red. La regla general sigue siendo preferir Nivel 1-3 cuando alcanzan,
ahora con más razón en cualquier módulo que no pase por `db.js`.

**En cada reporte de verificación:** cada fila de la tabla dice con qué
nivel se obtuvo. Si algo no se pudo verificar de forma segura, se reporta
como "no verificado + por qué" — es un resultado honesto, no una falla.
Forzarlo sí sería la falla.
