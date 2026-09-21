# Macro Slice — Streamlabs ↔ YunaCoins · 2026-09-21

> Estado: **decisiones cerradas con el usuario, nada implementado.** Reemplaza
> la sección "Decisión abierta" de `STREAMLABS_YUNACOINS.md`, que queda como
> notas de investigación de la API.
>
> Investigación de código verificada contra el árbol de `feat/yunacoins-pes5`
> el 2026-09-21. Datos de la API verificados contra la doc oficial de
> `dev.streamlabs.com` el mismo día.

---

## 0. Reglas críticas (no cambian)

Las de `CLAUDE.md` + las de `WORKFLOW_2.0.md` §2: nunca cambiar de rama en esta
carpeta, iconos SVG (nunca emojis), `_esc()` en todo `innerHTML` con datos
externos, **nunca** commitear credenciales, `graphify update .` tras tocar
código.

**Regla propia de este macro:** el `client_secret` de Streamlabs es una
credencial. Va en la configuración de la Cloud Function (mismo criterio que
`firebase-config.js`), **nunca** en `tsc-src/`, nunca en el navegador, nunca
commiteado.

---

## 1. Decisiones cerradas (ya no se discuten)

| # | Decisión | Detalle |
|---|---|---|
| 1 | **Es UNA sola moneda** | Los Loyalty Points del Cloudbot y los YunaCoins de la web son lo mismo. Se ganan en el stream, se gastan en la web. |
| 2 | **Un usuario de Streamlabs por presidente** | Por reglamento de la TSC hay que ser activo en el canal para tener equipo, así que **todo presidente ya existe en Loyalty con puntos**. La multicuenta la resuelve Luis a mano, fuera del sistema. |
| 3 | **El descuento se aplica al APROBAR** | No por lotes. Cuando Luis aprueba un pedido, la resta va a Streamlabs en el acto. Motivo: no hay umbral defendible entre mejoras "grandes" y "chicas" (pueden ser 300.000), y una ventana abierta permite gastar dos veces los mismos puntos (mejoras + ruleta). |
| 4 | **El saldo vuelve a la web UNA vez por directo** | Un botón al cierre del directo trae el saldo nuevo. No hay polling ni sincronización continua. |
| 5 | **Streamlabs nunca "suma"** | Las ganancias las acumula el Cloudbot solo. El sistema solo **resta** (lo gastado) y **copia** (el saldo resultante). |
| 6 | **El mapeo vive en el equipo, solo admin** | Campo nuevo `teams.streamlabsUser`. **NO** se usa `users.username`: está en la allowlist de auto-edición de [firestore.rules:64](../../firebase/firestore.rules#L64), o sea que un presidente podría apuntarlo al usuario de otro y desviarse puntos. |
| 7 | **La marca de sincronizado es la fuente de verdad** | Cada transacción de `coins` lleva una marca. Es lo que hace el sistema idempotente y reanudable, y lo que permite que un fallo degrade a lotes en vez de romper. |

---

## 2. Estado actual verificado (código real)

- **El gasto tiene un único punto:** `cobrarMejorasEquipo`
  ([pes5-tool.html:382](pes5-tool.html#L382)). Escribe una transacción `coins`
  por jugador (`mode:'sub'`, con metadata `pes5`: playerId, subscriber,
  fromGeneral/fromSub, lineas, pedidoId) y **después** un `dbPut('teams', {yunacoin})`.
  Ya hace el doble-write correcto.
- **El presidente NO descuenta nada.** `mejoras.html` solo lee el saldo y crea
  un `pedido` en `pedidos_pes5` ([mejoras.html:1252](../mejoras.html#L1252)).
  El saldo se mueve recién cuando Luis aplica en la tool.
- **El saldo autoritativo es `teams.yunacoin`** (confirmado en
  `yunacoins-rules.js` y `mejoras.html`); el store `coins` es el ledger de
  auditoría.
- **Hoy el cobro clampea en silencio:** `Math.max(0, current - info.total)`
  ([pes5-tool.html:387](pes5-tool.html#L387)) — un sobregiro no se ve, se
  disimula. El slice C lo convierte en un rechazo visible.
- **No existe ningún mapeo a Streamlabs.** Cero campos hoy.
- **`functions/` solo tiene las 3 de push FCM** (`notifyStreamToday`,
  `notifyStartupContinuation`, `onMatchWentLive`). No hay nada de OAuth.

## 3. API de Streamlabs (verificado en la doc oficial)

| Qué | Cómo |
|---|---|
| Leer puntos | `GET https://streamlabs.com/api/v2.0/points` · params `username`, `channel` |
| Escribir puntos | `POST https://streamlabs.com/api/v2.0/points/user_point_edit` · params `username`, `points` |
| Semántica de escritura | **SET absoluto** — el parámetro es *"points that will be set to the user"*, no un delta |
| Scopes | `points.read` y `points.write` |
| Autorización | `GET https://streamlabs.com/api/v2.0/authorize?response_type=code&client_id=…&redirect_uri=…&scope=points.read%20points.write&state=…` (scopes separados por espacio, `%20`) |
| Tiers | TESTING 5 req/min → APPROVED 2400 req/min → Unlimited. **Sin costo monetario**, solo revisión de Streamlabs |

**No documentado (hay que probarlo):** qué devuelve `user_point_edit` para un
usuario inexistente. Por la decisión 2 no debería pasar nunca con un presidente
legítimo — si pasa, es un mapeo mal cargado y tiene que ser **ruidoso**.

---

## 4. Orden y dependencias

| # | Slice | Tamaño | Riesgo | Bloqueado por Luis |
|---|---|---|---|---|
| **A** | Infra OAuth + Cloud Function (callback, token, wrappers read/write) | medio | medio | Construir **no**; probar de punta a punta **sí** |
| **B** | Campo de mapeo `teams.streamlabsUser` en la ficha del equipo | chico | bajo | **No** (se llena después) |
| **C** | Validación + descuento al aprobar un pedido | medio | **alto** (toca saldos reales) | Sí (necesita la API viva) |
| **D** | Botón "cerrar directo": trae el saldo + levanta pendientes | chico-medio | medio | Sí |

**A y B se pueden hacer ya.** C depende de A. D depende de A y de la marca de
sincronizado que introduce C.

---

## Slice A — Infra OAuth + Cloud Function

**Objetivo:** poder leer y escribir puntos de Streamlabs desde el backend, sin
exponer el `client_secret`.

**Enfoque:**
1. Registrar la app en `dev.streamlabs.com` (cuenta del desarrollador, **no**
   la de Luis — la cuenta que registra la app no tiene nada que ver con de
   quién son los puntos; Luis solo autoriza después).
2. Cloud Function con dos endpoints: el **callback** del OAuth (recibe el
   `code`, lo canjea por token, lo guarda) y el **wrapper** de puntos
   (`leerPuntos(username)` / `setPuntos(username, valor)`).
3. Guardar `access_token` + `refresh_token` (colección propia, no legible por
   cliente) y refrescar cuando venza.
4. Pedir el pase a **APPROVED** apenas esté registrada la app — lo revisa
   Streamlabs y tarda, y en TESTING (5 req/min) aprobar una tanda de pedidos
   se vuelve inusable (2 llamadas por aprobación).

**Orden obligatorio:** la función del callback tiene que estar **desplegada
antes** de mandarle el link a Luis. Si él autoriza antes, el redirect cae al
vacío, el permiso queda dado y hay que repetirlo.

**Archivos:** `functions/lib/streamlabs.js` (nuevo), `functions/index.js`,
`firebase/firestore.rules` (colección del token: solo backend).

**Riesgos:** medio — credencial nueva en juego. Mitigación: el secret solo en
config de la función; la colección del token con `allow read, write: if false`.

---

## Slice B — Campo de mapeo en la ficha del equipo

**Objetivo:** poder cargar qué usuario de Streamlabs corresponde a cada equipo.

**Enfoque:** campo `streamlabsUser` en el modal de equipo (junto al de coins,
[teams.js:239](../js/teams.js#L239) es el patrón), guardado en `saveTeam`
([teams.js:418](../js/teams.js#L418)). Solo admin — **no** replicar en el
perfil del presidente ni en ninguna allowlist de auto-edición.

**Archivos:** `tsc-src/js/teams.js`, `firebase/firestore.rules` (que el campo
no entre en ninguna allowlist de escritura del presidente).

**Riesgos:** bajo.

**Verificación (gate):** cargar el usuario en 2-3 equipos y confirmar que
persiste; confirmar desde una sesión de presidente que **no** puede escribirlo.

---

## Slice C — Validación + descuento al aprobar

**Objetivo:** que aprobar un pedido descuente en Streamlabs en el acto, y que
nunca se cobre más de lo que el equipo realmente tiene.

**Enfoque — orden exacto dentro de `cobrarMejorasEquipo`:**
1. `leerPuntos(streamlabsUser)` → saldo real.
2. **Validar**: si el saldo real no cubre el pedido, **no cobrar** y avisar
   ("el equipo X pidió N pero tiene M"). El pedido queda pendiente.
3. Cobrar en la web (ledger + `teams.yunacoin`) dejando la transacción
   **marcada como pendiente de sincronizar**.
4. `setPuntos(streamlabsUser, saldoReal − gasto)`.
5. Marcar la transacción como **sincronizada**.

**Por qué ese orden:** si el paso 4 falla, la transacción queda pendiente y la
levanta el slice D. El fallo **degrada al modelo por lotes en vez de romper**;
nunca se pierde ni se duplica un descuento.

**Casos a cubrir:** equipo sin `streamlabsUser` cargado → no se sincroniza,
pero se avisa (no silencioso). Usuario que no aparece en Loyalty → mapeo mal
cargado o handle cambiado → **ruidoso**, nunca silencioso.

**Archivos:** `tsc-src/prototipo_yunas/pes5-tool.html` (`cobrarMejorasEquipo` y
el flujo de aplicar pedidos).

**Riesgos:** **alto** — es el único slice que escribe saldos reales en dos
sistemas sin atomicidad. Mitigación: el orden de arriba + la marca; probar
primero con UN equipo de prueba y montos chicos.

---

## Slice D — Botón "cerrar directo"

**Objetivo:** traer a la web los yunas ganados durante el directo, y arrastrar
cualquier descuento que haya quedado pendiente.

**Enfoque:** un solo botón que, por cada equipo con mapeo, hace **siempre las
dos fases en orden fijo**:
1. **Empuja pendientes** — si hay transacciones sin marcar, `setPuntos(saldo
   real − suma pendiente)` y las marca.
2. **Trae el saldo** — copia el saldo resultante a `teams.yunacoin`.

Idempotente (apretarlo dos veces no cobra dos veces), reanudable (si falla a
mitad, retoma donde quedó) y sin dirección equivocada posible (siempre hace las
dos fases). Reporta al final: equipos sincronizados, **equipos sin mapeo**, y
usuarios no encontrados en Loyalty.

**Archivos:** `tsc-src/prototipo_yunas/pes5-tool.html`.

**Riesgos:** medio. Mitigación: la idempotencia hace que reintentar sea seguro.

---

## 5. Qué hace falta de Luis (y en qué orden)

Recién **después** de que el slice A esté desplegado:

1. **Aprobar el permiso** — abrir el link de autorización con su cuenta de
   Streamlabs (la del Cloudbot) y darle Authorize. Una sola vez.
   **Nunca pedirle la contraseña.**
2. **Confirmar el canal** al que está atado el Cloudbot (el parámetro `channel`
   del `GET /points`).
3. **La tabla de equivalencias** `@usuario → equipo`, solo de los presidentes.
   Es el único dato que no se puede inferir.

Y una regla de mantenimiento: si un presidente **se cambia el handle de
YouTube**, hay que actualizar el mapeo o sus mejoras dejan de descontarse.

---

## Notas de cierre del macro

- Cada slice: pre (este documento) → aprobación del supervisor → Sonnet
  implementa → post (diff/pruebas/evidencia real) → auditoría → OK → commit.
- **C es el único que escribe saldos reales de producción** — probarlo con un
  equipo de prueba y montos chicos antes de soltarlo.
- Tras cerrar cada slice: `cd tsc-src && graphify update .`
