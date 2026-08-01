# Reporte — Sorteo: el "tada" no suena en la APK (vista pública)

> Bug reportado por el usuario: en la APK, vista pública del sorteo, el
> redoble de tambores suena pero el "tada" final no. En la versión web no
> pasaba. Verificación Nivel 1-2/3, cero escrituras de estado real (el
> único intento de escritura real, un sorteo de prueba, falló solo y no
> alteró nada — ver sección aparte). `window.__TSC_READONLY__=true` desde
> el inicio, fuente-vs-disco antes de medir. **Nada de lo de abajo está
> commiteado.**

## Diagnóstico

`sorteo.js` usa DOS mecanismos de audio distintos para la misma secuencia:
- **Redoble** (`playDrumrollAudio`): un `<audio>` HTML5 real
  (`assets/sounds/drumroll.mp3`). Solo respeta `SFX.enabled` (mute de
  preferencia del usuario) — nunca chequea nada de "background".
- **Tada** (`SFX.playTada()`, `sounds.js`): Web Audio API (osciladores
  sintetizados). Gateado por una variable privada `backgroundPaused`, que
  se activa con `window.addEventListener('blur', ...)`,
  `visibilitychange`→oculto y `pagehide` (pensado para cortar sonido al
  minimizar la app) — y que, ANTES de este fix, **solo se podía volver a
  liberar con un gesto explícito del usuario** (`SFX.unlock()`, atado a
  botones puntuales). No había ningún camino de vuelta automático al
  recuperar el foco.

Si un `blur` se dispara en CUALQUIER momento (no solo al minimizar de
verdad — el WebView nativo de la APK es más propenso a esto que una
pestaña de navegador: cambios de foco del sistema, IME, etc.), `SFX`
queda mudo PARA SIEMPRE hasta el próximo gesto explícito. El redoble seguía
sonando porque nunca pasa por ese chequeo — coincide exacto con el síntoma
reportado.

## Verificación del mecanismo — Nivel 1, aislado, sin tocar el sorteo real

Conteo de osciladores de audio creados por `SFX.playTada()` (interceptando
`AudioContext.prototype.createOscillator`) en la sesión admin real, sin
ejecutar ningún sorteo:

| Momento | Osciladores creados |
|---|---|
| Normal | 22 |
| Después de `blur` | **0** — mudo, sin error en consola |
| Después de `focus` (evento sintético, pestaña sigue oculta de verdad en este entorno de prueba) | **0** — sigue mudo (documentado como esperado, ver abajo) |
| Después de `SFX.unlock()` | 22 — recién ahí vuelve |

## Intento de reproducción en vivo (PC → emulador Android)

Se levantó el emulador (AVD `Medium_Phone_API_36.1`), se instaló el
`app-release.apk` ya compilado (sin recompilar — confirmado que
`sorteo.js`/`sounds.js` no cambiaron desde ese build), y el usuario dejó
la sesión logueada con un bombo de prueba (Bombo E, 22 equipos, ID
`b_2cp4rp1`) cargado en la vista pública del sorteo del emulador.

Se intentó un sorteo real desde el panel admin del navegador (mismo
bombo) para ver el evento en vivo llegar al emulador. La escritura a
Firestore **falló con `permission-denied`** ("Missing or insufficient
permissions", `adminUid` grabado como `null` en el payload) — **no se
alteró ningún dato real** (confirmado: `Bombo E` sigue en 0 sorteados
antes y después). Esto es un problema DISTINTO al del audio (probablemente
de esta sesión de prueba específica, no del uso real del usuario — el
propio usuario confirmó "el sorteo funciona" en su uso normal) — se anota
acá para que quede registrado, no se investigó ni se tocó más allá de
confirmar que no dejó nada escrito ni ningún reintento colgado (se revisó
que no hubiera peticiones de red nuevas tras un reload — los errores que
aparecían en consola eran el historial viejo re-mostrado por la
herramienta, no una escritura repitiéndose).

Sin el evento en vivo no se pudo completar la reproducción cruzada en el
emulador real, pero la prueba aislada del mecanismo (arriba) es
suficiente para confirmar la causa con certeza a nivel de código.

## Fix

`sounds.js` — contraparte simétrica de `pauseAllAppAudio`: un listener
nuevo, `resumeAudioOnForeground()`, que llama a `SFX.unlock()` cuando la
app REALMENTE vuelve a primer plano (`document.hidden === false`),
enganchado tanto a `visibilitychange` como a `focus` (cualquiera de los
dos que dispare primero). Preserva la protección original (un timer de
fondo no puede reactivar nada mientras la app sigue oculta/minimizada de
verdad — el guard `if (!document.hidden)` sigue bloqueando eso) y cierra
el hueco: ahora SÍ hay un camino de vuelta automático cuando el blur fue
espurio o la app realmente vuelve del background, sin depender de que el
usuario toque uno de los botones puntuales que llaman `unlock()`.

## Verificación del fix — Nivel 1, fuente-vs-disco

Hash SHA-256 de `resumeAudioOnForeground` (navegador vs. disco) —
coincidió exacto antes de medir.

| # | Criterio | Nivel | Resultado |
|---|---|---|---|
| a | `blur` sigue muteando | 1 | `playTada()` → 0 osciladores tras `blur` (sin cambios, sigue protegiendo) |
| b | Evento sintético mientras la pestaña SIGUE oculta de verdad no reactiva | 1 | Con `document.hidden===true` real (gotcha de este entorno de prueba, documentado en memoria del proyecto), disparar `focus`/`visibilitychange` sintéticos → `playTada()` sigue en 0 — el guard funciona, no reactiva de más |
| c | Vuelta a primer plano REAL sí reactiva | 1 | `document.hidden` sobreescrito a `false` (Nivel 1, revertido después) + `resumeAudioOnForeground()` llamada directa → `playTada()` vuelve a 22 osciladores |
| d | Sin efectos colaterales del override de prueba | 1 | `delete document.hidden` tras la prueba → vuelve a reflejar el valor real (`true`, el de esta pestaña) |
| e | Consola limpia (más allá de los 2 errores viejos re-mostrados, sin peticiones de red nuevas) | 2 | Confirmado sin `Commit` nuevo en la red tras el reload |

## Fuera de alcance

El `permission-denied` del intento de sorteo real de prueba — anotado
arriba, no investigado (parece propio de esta sesión de prueba, el
usuario confirmó que su sorteo real funciona bien).

## Después

`graphify update .` corrido (2834 nodos, 7241 edges, 47 comunidades).
**Nada de lo anterior está commiteado.**
