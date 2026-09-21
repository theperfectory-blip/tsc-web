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
5. **Precios:** el precio de Liga Master × **5** (regla vigente al 21/09, tiene que ser editable
   en cualquier momento, igual que el resto de las reglas). De dónde sale el precio base: ver
   sección 7.

## 7. El precio de Liga Master NO está en el save (investigado el 21/09)

Se buscó el precio de 11 jugadores austríacos leídos de una captura del juego (Schranz 408,
Stranzl 527, Hiden 470, Standfest 386, Pogatetz 439, Aufhauser 436, Kühbauer 495, Schopp 588,
Ivanschitz 423, Vastic 545, Kollman 460 — registros 1 a 11).

**Resultado: no está guardado.** Lo descartado:

- No aparece dentro de los 124 bytes de la ficha de ningún jugador.
- No hay tabla indexada por registro con ningún stride (se probaron 2 a 64).
- El precio no es proporcional a la suma de atributos (la razón va de 0,214 a 0,304).
- Una zona con los 11 precios en 4 KB resultó ser **falso positivo**: es un array de enteros
  correlativos (382, 383, 384…), un índice interno. Cubre todo el rango, así que cualquier
  número cae ahí. **No volver a investigar esa zona.**
### El save de Liga Master (`KONAMI-WIN32PES5000`)

El usuario guardó una partida de Liga Master durante la investigación y apareció el archivo
`KONAMI-WIN32PES5000` (751.616 b) en la misma carpeta. Lo averiguado:

- **Usa la misma primera capa** que el option file: XOR con `keyPC` (256 b, cíclica). Aplicándola
  sola, casi todo el archivo queda legible — aparece `"Birmingham City"` en texto claro y los
  fondos del usuario (12.000) como entero de 32 bits en 0x1fea0 y 0x6b5cc.
- **Los precios tampoco están ahí** como tabla por jugador (probados strides de 2 a 128).
- Queda una **zona cifrada** que no se pudo abrir: la segunda capa va por bloques y las
  posiciones de `block[]`/`blockSize[]` de `OptionFile.java` son del option file, no sirven acá.
  Un intento de localizar el inicio del bloque por fuerza bruta no dio resultado.

**Aviso para el futuro:** aunque se encuentre la tabla, el precio de Liga Master pertenece a una
partida concreta y **cambia con el tiempo** (los jugadores crecen y envejecen). Vendría de la Liga
Master de Luis y se movería solo. Si los precios de la TSC tienen que ser estables durante una
temporada, conviene fijarlos una vez en vez de leerlos del juego.

**Conclusión:** PES5 lo calcula en tiempo de ejecución a partir de atributos y edad.

### Intento de deducir la fórmula con 110 muestras (21/09)

El usuario aportó los onces titulares de 10 equipos (Udinese, Inter, Arsenal, Liverpool, Monaco,
Man Utd, Juventus, Milan, Chelsea, R. Madrid) = **110 jugadores con precio**, del **día 1** de una
Liga Master recién empezada. Datos y scripts en el scratchpad de la sesión
(`precios-ml.json`, `dataset.json`, `cruzar.js`, `buscar-campo.js`, `nullspace.js`, `porpos.js`).

**Dato clave:** son precios del día 1 y **le salen iguales a cualquiera que empiece una Liga
Master nueva**. O sea son datos FIJOS: una lista capturada una vez vale para siempre.

Lo descartado:

1. **No hay campo oculto en la ficha.** Se probaron todos los offsets de bit del registro de 124 b
   con anchos de 4 a 16 bits: ninguno ordena igual que el precio (rho > 0,90: cero candidatos).
2. **No es una fórmula lineal única.** Hay 73 precios distintos para 110 jugadores, con grupos de
   hasta 5 jugadores en el mismo valor exacto (p. ej. 942 = Samuel, Zanetti, Campbell, Makelele).
   Si la valoración oculta fuera un peso lineal de los atributos, existiría un vector `w` con
   `w·(xa − xb) = 0` para cada par empatado. Se resolvió el autovector menor de `AᵀA` con 36
   ecuaciones de empate: **el autovalor menor es 237, no ~0** → ese vector no existe.

Lo confirmado:

3. **La fórmula depende de la posición.** Correlación del precio con la suma de atributos, por
   posición: CA 0,89 · CC 0,87 · DC 0,85 · MP 0,74 · CCD 0,67 · CT 0,61 · **PT −0,02**. El mejor
   atributo suelto de cada posición: CT → Defensa (0,77), PT → Mentalidad (0,89), MP → Precisión
   (0,81), CC/CA → Vel. pase corto (0,84–0,90), DC → Ataque (0,79), EX → Agilidad (−0,99, n=4).
4. **La edad influye pero no linealmente:** Mihajlovic (36 a, Defensa 80) vale 435 y Maldini
   (37 a, Defensa 98) vale 1416, el central más caro de la muestra.

**Para una fórmula exacta harían falta 30–50 muestras por posición** (~40 capturas más) y aun así
saldría una aproximación. **Pendiente de decidir si vale la pena.**

**Cuidado con los datos:** 8 nombres están duplicados en el save (Felipe, Samuel, Verón, Adriano,
Bergkamp, Luis García, R. Kovac, Stam) y el cruce eligió al de mayor suma de atributos. Al menos
uno quedó mal: el "R. Kovac" de la Juventus salió con Defensa 74 valiendo 840 (probablemente es
Niko en vez de Robert). Si se retoma, desambiguar por plantilla del club, no por nombre.

## 6. Relación con otras decisiones

- Decisión 7 de `LOOP_CIERRE_2.0.md` (quién ve plantillas): la ficha pública de la sección 1 es
  la forma final de esa decisión.
- La publicación de plantillas es **manual**: lo que se ve es una foto del último save publicado,
  no datos en vivo. La ficha tiene que mostrar la fecha de esa foto.
