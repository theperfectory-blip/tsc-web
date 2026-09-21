# Slice futuro · Fichajes de leyendas + vista pública en la tarjeta del equipo

**Estado: NO EMPEZADO.** Requisitos dictados por el usuario el 20/09. Depende de decisiones
que Luis todavía no tomó. No implementar sin volver a leer esto con el usuario.

Este documento captura QUÉ se quiere, no CÓMO. El plan detallado se escribe cuando se decidan
los puntos abiertos de la sección 5.

---

## 1. Qué se ve en la tarjeta del equipo (sitio principal)

Hoy cada presidente ve solo su plantilla, dentro de `mejoras.html`. Esto es otra cosa: un botón
en la **tarjeta del equipo del sitio principal** (no en `mejoras.html`) que abre la ficha pública
de ese equipo. La ve cualquiera.

| Bloque | Contenido |
|---|---|
| Plantilla | El plantel completo con las stats de cada jugador, igual que un presidente ve el suyo hoy |
| Gastado en mejoras | Lo consumido del tope general de la temporada, con su tope: "5.550 / 50.000" |
| Gastado en suscriptores | Lo consumido del bono de suscriptores, con su tope: "0 / 25.000" |

**Solo esos dos números de dinero** (decisión del usuario, 20/09). El **saldo total NO se muestra**:
que se sepa cuánto gastó y en qué, no cuánto tiene.

> **Cuidado al implementar:** el encabezado de `mejoras.html` muestra hoy lo que **queda**
> (tope − gastado), no lo gastado. La vista pública muestra lo contrario. No copiar el número
> tal cual: hay que invertirlo.

Cuando existan los fichajes (sección 3) se suma un tercer número con el mismo criterio: gastado
en fichajes, y qué jugadores fichó.

**Motivo (palabras del usuario):** Luis comparte el save igual, como pasaba con las memory cards
de PES 4 — cualquiera podía cargarlas en su emulador y ver todos los equipos. La información no
es secreta, solo está incómoda de consultar.

## 2. Qué NO es público

- **El detalle de cada mejora.** Que una stat haya pasado de 80 a 81 no le interesa a nadie.
  Público es cuánto gastó cada presidente y en qué, no en qué atributo exacto.
- **El registro de ediciones del save** (quién escribió qué bytes, cuándo). Es interno de los
  dos admins.

## 3. Fichajes: cómo funcionan

Los **jugadores leyenda** (Maradona, Di Stéfano, Pelé) son la base de los fichajes de la TSC:
son los mejores jugadores disponibles.

1. Luis toma el precio del jugador en la Liga Master y le aplica un multiplicador (×3 o ×4).
2. Ese precio se traduce a YunaCoins.
3. El presidente lo compra — por sorteo o por el mecanismo que Luis defina.
4. Se le descuentan los YunaCoins y el jugador se traspasa a su equipo.

Los fichajes salen del mismo bolsillo que las mejoras: en la primera temporada el usuario
estima que la mitad del presupuesto se va a ir en fichajes.

## 4. Qué ya existe y sirve

| Pieza | Estado |
|---|---|
| Libro `coins` | Guarda `{teamId, teamName, mode, amount, reason, note, before, after, season, date}`. Con un `reason` de fichaje, los totales por concepto y por temporada salen sumando. No hay que cambiar la estructura |
| `pes5_plantillas/{teamId}` | Las plantillas publicadas ya están guardadas una por equipo: la tarjeta puede leer la suya directo. Solo hay que abrir el permiso de lectura |
| `PES5_EDITOR.transferirJugador(bytes, origen, destino, idJugador)` | **Escrito pero nunca usado ni probado.** Ningún código lo llama y ningún test lo cubre |

## 5. Puntos abiertos — decidir antes de implementar

1. **¿El tope de temporada es compartido?** Hoy `budgetGeneral` (50.000) es un techo **solo para
   mejoras**. Si los fichajes salen del mismo presupuesto, el modelo cambia: pasa a ser un techo
   común para mejoras + fichajes. **Sin resolver.**
2. **Jugadores leyenda: ¿se pueden desbloquear?** No se sabe todavía cómo los bloquea el juego en
   el save, ni si es editable. Investigación aparte, es un prerrequisito duro de todo el slice.
3. **`transferirJugador` no está verificado.** Al dar de baja, mueve el último jugador activo al
   hueco que queda. Falta comprobar en el juego que eso no descoloca la alineación ni la táctica,
   que pueden depender del número de slot. **Probar con una copia del save antes de usarlo.**
4. **Mecanismo de compra:** sorteo u otro. Lo define Luis.
5. **Precios:** dependen de la tabla de la Liga Master y del multiplicador. Los define Luis.

## 6. Relación con otras decisiones

- Decisión 7 de `LOOP_CIERRE_2.0.md` (quién ve plantillas): la ficha pública de la sección 1 es
  la forma final de esa decisión.
- La publicación de plantillas es **manual**: lo que se ve es una foto del último save publicado,
  no datos en vivo. La ficha tiene que mostrar la fecha de esa foto.
