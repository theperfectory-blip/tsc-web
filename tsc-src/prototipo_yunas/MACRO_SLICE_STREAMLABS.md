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

### 3.1 Estado del registro (hecho el 2026-09-21)

La app **ya está registrada** en el Programa API de Streamlabs. Estado devuelto:
**"Prueba en curso"** (TESTING). Credenciales guardadas fuera del repo (el
`client_secret` va en la config de la Cloud Function, nunca en `tsc-src/` ni en
un commit).

Lo que se aprendió haciendo el trámite, y que no estaba en la doc:

- **Whitelist obligatoria mientras la app no esté aprobada.** Solo los usuarios
  de esa lista pueden autorizar la app (hasta 10). **Luis ya está cargado**
  (plataforma `Youtube`, usuario `LuisYuNa3210`). Si faltara, su "Authorize"
  falla sin explicación útil.
- **El pase a APPROVED NO se pide ahora.** Streamlabs lo dice explícito: *"When
  your app is ready to publish you can apply for full access."* Es un hito
  **posterior**, cuando los slices ya funcionen — no un trámite paralelo.
  Corrige la suposición previa de "pedirlo cuanto antes".
- **Redirect URI elegido:** `https://teamsubscup.web.app/api/streamlabs/callback`,
  vía *rewrite* de Firebase Hosting hacia la función. Se eligió una ruta del
  Hosting **en vez de** la URL de la Cloud Function porque esta última no se
  conoce hasta después del deploy (2ª gen) y cambiaría si se redespliega o se
  cambia de región. Con el rewrite, la URL registrada **nunca cambia**.
- **La ficha de la app muestra `Acceso a puntos de fidelidad: Disabled`** (y
  `Acceso ilimitado: Disabled`). No es un campo editable — no aparece en ningún
  paso del asistente, lo controla Streamlabs. La doc de scopes **no menciona**
  que `points.*` requiera permiso especial, así que panel y doc se contradicen.
- **Verificado a mano:** se abrió la URL de autorización cambiando el `scope` de
  la plantilla (`donations.*`) por `points.read points.write`, y la pantalla de
  consentimiento **declara correctamente** *"Read/Modify loyalty points of all
  users in your channel"*. O sea: **el consentimiento acepta los scopes.**
  Ese texto además confirma el diseño — un solo token de Luis habilita
  leer/escribir **cualquier usuario de su canal**, incluido el sujeto de prueba.

> ⚠️ **Lo anterior NO prueba que los endpoints respondan.** Son dos capas: que
> el consentimiento acepte los scopes es una cosa, y que `GET/POST /points`
> funcione con ese token estando en TESTING es otra. La bandera `Disabled`
> podría gobernar la segunda. **Por eso el slice A arranca con un smoke test**
> (ver más abajo): si devuelve 401/403, se corta ahí y se pasa al Plan B (§6)
> sin haber construido nada.

### 3.2 Consecuencia del tier TESTING (5 req/min) por slice

Todo el desarrollo ocurre a 5 requests por minuto. Cada aprobación de pedido son
2 llamadas (leer + escribir):

| Slice | ¿Viable en TESTING? |
|---|---|
| A, B | Sí, no dependen del volumen |
| **C** | Sí — ~2 aprobaciones por minuto, molesta poco en una tanda normal |
| **D** | **No para uso real.** 80 equipos ≈ 160 llamadas ≈ **30 minutos**. Se construye y se prueba con 2-3 equipos; el uso real queda **bloqueado hasta APPROVED** |

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

> ### A.0 — Smoke test PRIMERO (gate de todo el macro)
>
> **Antes de escribir una línea del resto del slice**, probar a mano que los
> endpoints responden. Es media hora y decide si el macro sigue por API o por
> Plan B (§6).
>
> 1. Conectar una plataforma al Streamlabs del desarrollador y activar Cloudbot
>    con Loyalty en ese canal; darse unos puntos (datos de prueba propios).
> 2. Agregarse a la whitelist de la app (ahora se puede: ya hay cuenta de
>    plataforma).
> 3. Abrir la URL de autorización con `scope=points.read points.write` y
>    autorizar. El redirect va a dar 404 — **copiar el `code` de la barra de
>    direcciones** (dura pocos minutos).
> 4. Canjear el `code` por un token (curl/Postman, con el `client_secret` —
>    lo hace el usuario, nunca queda escrito en el repo ni en un chat).
> 5. `GET /points` contra el canal propio.
>
> **Veredicto binario:** devuelve puntos → seguir con A.1 en adelante.
> Devuelve 401/403 → **parar, el `Disabled` es real, ir al Plan B (§6)**.
>
> Beneficio colateral: ese canal queda como **sandbox permanente** para ensayar
> el slice C con puntos de mentira.

1. ~~Registrar la app~~ → **HECHO el 2026-09-21** (ver §3.1). Credenciales
   guardadas fuera del repo.
2. Cloud Function con dos endpoints: el **callback** del OAuth (recibe el
   `code`, lo canjea por token, lo guarda) y el **wrapper** de puntos
   (`leerPuntos(username)` / `setPuntos(username, valor)`).
3. **Rewrite en `firebase.json`** de `/api/streamlabs/callback` hacia la
   función. Es obligatorio: el redirect URI registrado en Streamlabs apunta a
   esa ruta del Hosting, no a la URL de la función. Si el rewrite no existe, el
   callback devuelve 404 y **hay que repetir la autorización con Luis**.
4. Guardar `access_token` + `refresh_token` (colección propia, no legible por
   cliente) y refrescar cuando venza.
5. El pase a **APPROVED** NO se pide acá — es un hito posterior, cuando A-D ya
   funcionen (ver §3.1).

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
sistemas sin atomicidad. Mitigación: el orden de arriba + la marca.

> **Sujeto de prueba (decidido 2026-09-21):** las pruebas del slice C se hacen
> contra **`@TheRationalUser`** — la cuenta del propio desarrollador, que ya
> existe en la lista de Loyalty del canal de Luis (~519.000 puntos).
> **Nunca contra la entrada de un presidente.** Razón: el token solo lo puede
> emitir Luis (los puntos son de su canal), pero una vez emitido permite
> leer/escribir cualquier usuario de ese canal — así que se elige como conejillo
> de indias a alguien que, si se rompe, puede arreglarse solo y no le reclama a
> nadie. Esto baja el riesgo real del slice sin montar ningún sandbox aparte.

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

> **Bloqueado para uso real hasta APPROVED.** Un barrido de 80 equipos son hasta
> 160 llamadas; a 5 req/min del tier TESTING son ~30 minutos. Se **construye y
> se verifica con 2-3 equipos**, pero no se pone en manos de Luis hasta tener el
> tier completo. Es el slice que justifica pedir el acceso completo.

---

## 5. Qué hace falta de Luis (y en qué orden)

Ya está **whitelisteado** (`Youtube` / `LuisYuNa3210`), así que puede autorizar
aunque la app siga en TESTING. Lo que falta, recién **después** de que el slice A
esté desplegado (callback + rewrite incluidos):

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

## 6. Plan B — sin API (si el smoke test A.0 falla)

Alternativa propuesta por el usuario el 2026-09-21, documentada por si el
`Acceso a puntos de fidelidad: Disabled` resulta ser real. Elimina de un saque
OAuth, `client_secret`, Cloud Function, tier TESTING/APPROVED y los 5 req/min.

**Lo que NO existe (verificado):** Cloudbot **no tiene import/export de puntos
en lote**. El "Importer" del panel es un migrador de **una sola vez** desde
otros bots (StreamElements, Nightbot, el Desktop) que se conecta con tokens de
esas plataformas — no sirve para uso cotidiano. Tampoco hay CSV.

**La asimetría que lo hace viable:**

| Dirección | Volumen | Cómo se resuelve |
|---|---|---|
| Streamlabs → web (ganancias) | los ~80, todos ganan en cada directo | Luis **copia la lista** del panel y la pega en un campo de la tool; la tool parsea `usuario + puntos` y actualiza los saldos. Un pegado resuelve los 80. |
| web → Streamlabs (gastos) | **poquísimos** — solo los que pidieron mejoras | La tool le muestra una lista corta ("poné a @X en 397.000") y Luis edita esos pocos con el lápiz del panel. Dos minutos. |

**Lo que NO haría:** automatizar los clics del panel con un script. La UI de
Streamlabs puede cambiar sin aviso y deja la herramienta rota en silencio,
aparte de ser terreno gris con sus términos. El copiar/pegar lo hace una
persona y no tiene ese problema.

**Lo que se pierde respecto del Plan A:** la **lectura en vivo**. Sin ella no
se puede validar el saldo real en el momento de aprobar, así que vuelve el
agujero del sobregiro (el caso de la ruleta, decisión 3). Mitigación posible:
exigir que Luis pegue la lista fresca **antes** de aprobar una tanda, para que
la validación corra contra datos recientes aunque no sean del segundo.

**Lo que NO cambia entre Plan A y Plan B:** toda la lógica. Qué restar, qué
sumar, la marca de sincronizado, el ledger, el campo de mapeo, la validación
contra sobregiro. **Lo único que cambia es el transporte** (una llamada HTTP vs.
un copiar/pegar). Por eso el **slice B y el núcleo de cálculo se pueden
construir antes de decidir** — no se tiran en ninguno de los dos escenarios.

---

## Notas de cierre del macro

- Cada slice: pre (este documento) → aprobación del supervisor → Sonnet
  implementa → post (diff/pruebas/evidencia real) → auditoría → OK → commit.
- **C es el único que escribe saldos reales de producción** — probarlo con un
  equipo de prueba y montos chicos antes de soltarlo.
- Tras cerrar cada slice: `cd tsc-src && graphify update .`
