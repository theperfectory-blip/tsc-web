# Loop de cierre — slices D.R, D, F y E · 2026-09-17

> Plan operativo para terminar la Tool PES5 y la sección pública sin
> intervención entre slices, salvo en los puntos de control marcados.
> Spec de cada slice: `MACRO_SLICE_PES5_TOOL.md`. Flujo git: `WORKFLOW_2.0.md`.
> **G (nivelación) queda fuera**: necesita a Luis.

---

## 1. Estado al 17/09

| Slice | Estado |
|---|---|
| A, B, C, C.1, C.2 | Commiteados y probados en el juego |
| D.R | **En curso, sin commitear desde el 15/09 22:30.** Hay `js/yunacoins-rules.js`, su test (pasa) y cambios en `pes5-editor.js`, `pes5-tool.html` y el editor. Ya implementa el orden nuevo del bono. **Falta:** la tool y el editor todavía no usan el flag `$` de suscriptor (solo `pes5-editor.js` lo tiene) |
| D, F, E | Sin empezar. F sin spec detallada |
| main → rama | Al día, 0 commits pendientes |

---

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
| 5 | Auto-publicar | **ABIERTO**: el usuario pidió explicación. Bloquea solo la pestaña Publicar del slice D |
| 6 | Dónde vive la sección del presidente | **Página propia** (URL aparte, no dentro de `index.html`), con un enlace desde el perfil del presidente |
| 7 | Quién ve plantillas | **Cualquier presidente** ve las plantillas de todos los equipos. Editar y pedir, solo en la suya |
| 8 | Reglas de precio | **Editables por el admin** (mismo lugar que el punto 1) |
| 9 | Editor viejo del 26/07 | Se borra en E |
| 10 | Streamlabs | **Pospuesto**, igual que G |

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
