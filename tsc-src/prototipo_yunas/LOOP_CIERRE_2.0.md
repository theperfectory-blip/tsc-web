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

## 3. Decisiones del usuario que el loop necesita

Mientras una decisión no esté respondida, el loop usa el **default** indicado
y lo anota en el commit. Nada de esto afecta a G.

| # | Slice | Pregunta | Default si no hay respuesta |
|---|---|---|---|
| 1 | D.R | Topes por temporada: ¿general 100.000 y bono 20.000 como en tu ejemplo, o 50.000 / 25.000 como tiene el prototipo? | 100.000 / 20.000 |
| 2 | D | ¿Cuándo se descuentan las coins de un pedido: al **enviarlo** el presidente o al **aplicarlo** Luis? | Al aplicarlo (el saldo se reserva visualmente al enviar) |
| 3 | D | Si Luis **rechaza** un pedido, ¿se devuelve lo que se cobró? | Sí, si ya se había cobrado |
| 4 | D | ¿El presidente puede **cancelar** un pedido pendiente? Hoy las reglas lo prohíben | No, solo el admin |
| 5 | D | ¿"Publicar plantillas" automático cuando el juego guarda, o siempre manual? | Manual, con el toggle apagado |
| 6 | F | ¿Dónde vive la sección del presidente: pestaña propia en la navegación, o dentro de su perfil? | Dentro del perfil del presidente |
| 7 | F | ¿Las plantillas son **públicas** (cualquiera ve los jugadores de cualquier equipo) o solo el presidente ve la suya? | Solo la suya (así están las reglas hoy) |
| 8 | F | ¿Los montos de los topes los edita Luis desde la tool, o quedan fijos en código? | Editables por el admin |
| 9 | E | ¿Se borra también `prototype-editor-jugador.OLD-26jul.html`? | Sí |
| 10 | PR | Streamlabs: ¿se decide la dirección del sync ahora, o se pospone a una 2.1? | Posponer a 2.1 |

---

## 4. Puntos de control del usuario

El loop se detiene solo en estos momentos:

| Después de | Qué hace el usuario | Por qué no lo puede hacer el loop |
|---|---|---|
| D.R | Nada, salvo que falle | — |
| D | 1) Iniciar sesión como presidente y enviar un pedido de prueba. 2) Aplicarlo desde la tool en Chrome, Edge o Brave con el flag. 3) Abrir PES5 con la copia y ver el cambio | Exige login y un clic en el selector de carpetas del sistema |
| F | Revisar la sección pública en el navegador y en la APK | Aprobación visual del diseño |
| E | Aprobar el PR a `main` | Deploy a producción |

---

## 5. Lo que queda fuera del loop

- **Slice G**, a la espera de Luis.
- **Build y release de la APK 2.0**: se hace después del PR.
- **Streamlabs**, si se pospone a 2.1 (decisión 10).
