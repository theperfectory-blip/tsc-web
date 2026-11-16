# BLOQ-1 · Bloqueo de equipo: liberar al salir, toma de control del admin

Reporte del bug de Jimbo en la sandbox (b94d76f): entró como presidente en Mejoras, cerró sesión y entró como admin en la misma pestaña. Al abrir FK TUPADRE en la Tool, un alert avisó que el presidente seguía mejorando y no dejó editar.

## Causa

- El presidente liberaba su bloqueo solo al salir de la página (`pagehide`). Cerrar sesión dentro de la misma pestaña no dispara `pagehide`, así que el bloqueo quedaba vivo hasta que venciera el TTL de 3 minutos.
- El latido **no** seguía renovando después del logout: al faltar `AUTH.user`, el intervalo retorna sin hacer nada. Por eso el bloqueo murió solo por TTL, no por latido. Aun así, el intervalo seguía existiendo y usaba el `AUTH.user` del momento, sin comprobar que fuera el mismo dueño. Ahora se corta.
- El admin, al abrir el editor, veía el bloqueo vivo y solo recibía un alert.

## Cambios

1. **Liberar antes de cerrar sesión.** `authSignOut` (auth.js) llama a `window.bloqueoPresidenteSoltar` y `window.bloqueoAdminSoltar` (si existen) antes de `signOut`, porque después las reglas ya no dejan liberar. El presidente corta latido, observador y sondeo, y libera su bloqueo. El admin libera el de su equipo.
2. **El latido es del uid que lo arrancó.** Si `AUTH.user` cambia o desaparece, el latido se detiene y no renueva nada. El observador también ignora eventos sin sesión del mismo dueño.
3. **Toma de control del admin.** Si el bloqueo está vivo y es de otra persona, el admin ve una confirmación de la app: «Presidente X está editando FK TUPADRE desde HH:MM. ¿Tomar el control? Sus cambios sin enviar se pierden.». Si acepta, `PES5_BLOQUEO.tomarControl` escribe el bloqueo a su nombre y se abre el editor. Si cancela, no se abre nada. El presidente ve el aviso de bloqueo activo cuando su observador recibe el cambio.
4. **Sin alert.** El alert se reemplazó por la confirmación de la app. Voseo: «Esperá» → «Espera» en los textos de Mejoras.

## Reglas

No hizo falta cambiarlas. `pes5_bloqueos` ya dejaba a `isAdmin()` crear, actualizar y borrar. Se agregó la prueba de que el admin sobrescribe un bloqueo de presidente y luego lo libera.

**Hallazgo abierto (no tocado):** la regla de presidente permite crear o actualizar cualquier bloqueo de su equipo, sin comprobar el dueño actual. Un cliente que escriba directo podría pisar un bloqueo de admin vivo. La app respeta el TTL y la transacción, pero las reglas no lo imponen. Corregirlo bien exige comparar `resource.data.uid` con el uid del cliente, y eso rompería la toma de bloqueos muertos por el presidente. Queda como decisión del coordinador.

## Verificación

- **TTL:** `tools/test-pes5-bloqueo.js`: 1 min y 2 min 50 s vivos; 3 min 01 s muerto; latido inválido, sin documento o sin latido, no vivos. Tomar control escribe los 5 campos del bloqueo. TODO OK.
- **Reglas** en el emulador propio (8091, proyecto `demo-tsc-web`, no la sandbox): 33/33, 426/426, 70/70.
- **Sandbox (:3001, base sin limpiar):**
  - Presidente con Mejoras abierto → logout en la pestaña → el bloqueo de `pes5_bloqueos/61` se borró (verificado en Firestore).
  - Admin en la misma pestaña abre FK TUPADRE: entra sin confirmación y su bloqueo queda a su nombre.
  - Admin → logout: su bloqueo se borra.
  - Toma de control: como el navegador tiene una sola sesión, el bloqueo del presidente se simuló con un documento escrito directo en el emulador. El admin ve la confirmación con el texto correcto; «Cancelar» no abre el editor; «Confirmar» toma el bloqueo y abre el editor.
  - Limitación: no pude ver en la pantalla del presidente el aviso tras la toma, porque las dos sesiones no conviven en el mismo origen.
- `smoke-parity`: PARIDAD OK. `audit-wiring`: 0 rotos, 0 fuera de gramática, 0 duplicados.
- Al terminar, `pes5_bloqueos/61` no existe en la sandbox.
