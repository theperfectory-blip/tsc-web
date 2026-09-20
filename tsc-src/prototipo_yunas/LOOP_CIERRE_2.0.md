# Loop de cierre — slices D.R, D, F y E · 2026-09-17

> Plan operativo para terminar la Tool PES5 y la sección pública sin
> intervención entre slices, salvo en los puntos de control marcados.
> Spec de cada slice: `MACRO_SLICE_PES5_TOOL.md`. Flujo git: `WORKFLOW_2.0.md`.
> **G (nivelación) queda fuera**: necesita a Luis.

---

## 1. Estado final del loop (18/09)

| Slice | Commit | Qué quedó |
|---|---|---|
| D.R | `586a319` | Reglas de costo compartidas y cobro desde la tool |
| R | `36dcfa1` | Reglas y topes editables por el admin (`pes5_config/reglas`) |
| D1 | `c52e932` | Publicar plantillas del save a la web (manual) |
| D2 | `f218be5` | Pedidos: cobro al aplicar, rechazo, cancelación |
| F | `e73aa1c` | `mejoras.html`, página propia del presidente, con enlace desde el perfil |
| F.M | `ebd4b78` | Mobile-first de `mejoras.html` + restauración del prototipo |
| E + F.2 | `04e3f49` | Documentación, sin borrados; ajustes finales |
| PR | [#3](https://github.com/theperfectory-blip/tsc-web/pull/3) | Borrador, **sin mergear** |

Pendiente: G (Luis), Streamlabs, versión 2.0.0 de la APK y decidir el borrado del prototipo.

## 2. Cómo corre el loop

Cada vuelta es un slice. Sonnet implementa, Opus supervisa.

```
por cada slice en [D.R, D, F, E]:
  1. git merge main (si hay commits nuevos)
  2. Sonnet: plan corto + archivos + riesgos        → se registra, no espera
  3. Sonnet: implementa                              → sobre copias del save
  4. Sonnet: reporte (diff, pruebas con salida real, errores, evidencia)
  5. Opus verifica POR SU CUENTA:
       - md5 del save real sin cambios
       - tests Node corridos por Opus
       - página en localhost:3001 por eval (sin screenshots)
       - firebase-config / cloudinary / users-admin sin diff
       - documentos de prueba en Firestore borrados
  6. si falla: vuelve a 3 con el hallazgo (máx. 2 reintentos, luego para y avisa)
  7. si pasa: graphify update, commit, push, anota estado en este archivo
  8. si el slice tiene punto de control (§4): para y espera al usuario
```

**Condición de parada general:** cualquier escritura no prevista en el save
real o en Firestore, un test que falla dos veces, o una decisión que no
está en §3. En esos casos el loop se detiene y avisa; nunca improvisa.

---

## 3. Decisiones del usuario (RESPONDIDAS el 17/09)

| # | Tema | Decisión |
|---|---|---|
| 1 | Topes por temporada | **Editables por el admin** desde la tool. Valores iniciales: los de `DEFAULT_RULES` |
| 2 | Cuándo se cobra un pedido | **Cuando el admin lo aplica.** Al enviarlo no se descuenta nada |
| 3 | Pedido rechazado | Se devuelve lo cobrado. Como el cobro es al aplicar, un rechazo nunca cobró: no hay nada que devolver. Si un pedido **aplicado** se revierte, se registra una transacción `add` de devolución |
| 4 | Cancelar pedido | **El presidente puede cancelar** sus pedidos mientras estén `pendiente` |
| 5 | Auto-publicar | **Manual** (17/09): la tool marca las plantillas como desactualizadas y Luis publica con un botón. Sin publicación automática |
| 6 | Dónde vive la sección del presidente | **Página propia** (URL aparte, no dentro de `index.html`), con un enlace desde el perfil del presidente |
| 7 | Quién ve plantillas | Primero "cualquier presidente"; **revertido el 18/09**: se quitó "Otros equipos" y cada presidente ve solo la suya |
| 8 | Reglas de precio | **Editables por el admin** (mismo lugar que el punto 1) |
| 9 | Editor viejo del 26/07 | Se borraba en E. **Revertido (17/09): no se borra nada del prototipo hasta nuevo aviso.** E solo actualiza documentación. El editor movido a `mejoras.html` en F se restauró también en su ruta original |
| 10 | Streamlabs | **Pospuesto**, igual que G |

| 11 | Diseño | **Mobile-first** (17/09): la página del presidente (`mejoras.html`) se diseña primero para el teléfono, porque se usa dentro de la APK y mucha gente no tiene PC. La Tool PES5 es de escritorio (necesita el archivo del juego en la PC de Luis): solo debe no romperse en pantalla chica. Se agrega el slice **F.M** (auditoría y ajuste móvil) después de F |

## 3 bis. Modo de ejecución (decisión del usuario, 17/09)

- **Implementa Haiku**, con instrucciones cerradas por slice. Opus supervisa y verifica.
- **El loop no se detiene** hasta terminar E. Solo quedan pendientes G y Streamlabs.
- Commit, push y despliegue de reglas de Firestore los decide Opus.
- Opus prueba cada feature en la **sesión real del usuario**: navegador con
  su cuenta admin y la APK en el emulador de Android.
- El PR a `main` se **crea** al final pero **no se mergea**: mergearlo
  despliega a producción y eso lo aprueba el usuario.

## 4. Puntos de control

Ninguno durante el loop. Lo único que queda para el usuario al final es
mergear el PR.

## 5. Lo que queda fuera del loop

- **Slice G**, a la espera de Luis.
- **Build y release de la APK 2.0**: se hace después del PR.
- **Streamlabs**, si se pospone a 2.1 (decisión 10).

## 6. Ampliación del 20/09 — editor embebido, bloqueo por equipo y arreglos

**Pedido del usuario:** eliminar el panel lateral de la pestaña Plantilla de la Tool PES5 y reemplazarlo por la vista pública de mejoras ("mucho más intuitivo también para el modo admin"); arreglar el bug de las habilidades especiales; y que un equipo solo lo edite una persona a la vez.

| Qué | Cómo quedó |
|---|---|
| Bug habilidades especiales | `toggleAbility` fija el texto de ayuda igual que `adjustMain`/`adjustSec`; la fila queda marcada al comprar |
| Panel lateral | Eliminado (`pes5-tool.html`). Al clickear un jugador se abre un modal con `mejoras.html#admin` en un iframe |
| Modo admin de `mejoras.html` | Se activa con el fragmento `#admin` y solo dentro de un iframe. Los datos llegan por `postMessage` y el borrador vuelve a la tool: la página no escribe nada. El admin puede bajar valores por debajo del original, quitar habilidades, editar edad y altura sin cupos. Sin lista de jugadores ni Formación/Reglas/Historial. Equipo sin presidente: edición libre, sin costos ni saldo |
| Barra de escritura | Debajo de la tabla: se cobra a quién, total, saldo, "PES5 está cerrado", escribir/descargar y "Descartar cambios" |
| Cambio de club con cambios pendientes | Ahora pide confirmación y los descarta. Antes se podía escribir cambios de un club cobrándole a otro |
| Bloqueo por equipo | Colección `pes5_bloqueos/{teamId}`: `{por, uid, nombre, desde, latido}`. Latido cada 30 s, vence a los 3 min. Toma transaccional. Solo aplica a equipos con presidente. El mismo usuario no se bloquea a sí mismo |
| Cuándo se libera (admin) | Al cerrar el editor sin cambios pendientes, al descartar, al cambiar de club, o al escribir el save y publicar la plantilla del equipo |
| Publicación tras escribir | Si el equipo tiene presidente, la tool publica su plantilla justo después de escribir el save y recién ahí libera el bloqueo, para que el presidente no vea números viejos. Es un agregado sobre la decisión 5 (publicar sigue siendo manual para el resto) |
| Presidente | Al entrar toma el bloqueo. Si el admin lo tiene, ve "Luis está editando tu equipo" y la pantalla se actualiza sola (sondeo cada 15 s y observador en tiempo real) |
| Bug público | El subtítulo decía "FK Tupadre" fijo para cualquier equipo; ahora usa el equipo real |

**Gotcha:** el servidor local (`serve`) redirige `/mejoras.html?admin=1` a `/mejoras` y **pierde el query string**, pero conserva el fragmento. Por eso el modo admin usa `#admin`.

**Reglas Firestore desplegadas:** `pes5_bloqueos` (lectura para logueados; escribe el admin o el presidente de ese equipo sobre su propio documento).

**Implementación:** Haiku, con instrucciones y parches con verificación previa. Verificado por el supervisor en el navegador con la sesión real: flujo completo con cobro (sin escribir), modo libre con escritura simulada del save, y los siete escenarios del bloqueo en ambos lados con documentos de prueba, ya borrados.


## 7. Slice P — Posiciones y Banda/pie (20/09)

Spec completa en `SLICE_POSICIONES_BANDA.md`. Descubierto: la posición registrada (O) es un código fijo de 4 bits (428–431), no un rango; Carrilero=SB y Lateral=WB (estaban cruzados); Banda/pie son dos campos (pie bit 416; banda 2 bits 542–543, relativa al pie). El tope de 5 posiciones es regla de la TSC (`maxPositions`).
