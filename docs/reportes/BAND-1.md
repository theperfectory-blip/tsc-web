# BAND-1 · El punto que llega a 80 cuesta como «menos de 80»

**Rama:** `dev` (worktree `emparejar-80`). **Sin PR ni deploy.**
**Pedido por:** coordinador TSC Web (Luis reportó que 79→80 cobraba 100 y debía cobrar 50).

## Causa

`tsc-src/js/yunacoins-rules.js` tenía `BAND_MAX = [79, 85, 90, 95, 99]`.
`bandCost99(dest)` devuelve el costo del primer tramo cuyo techo cubre `dest`.
Con el techo en 79, el punto que llega a 80 caía en el segundo tramo (80-85,
100) en vez del primero (<80, 50).

## Cambio

| Dónde | Antes | Después |
|---|---|---|
| `yunacoins-rules.js` `BAND_MAX` | `[79, 85, 90, 95, 99]` | `[80, 85, 90, 95, 99]` |
| `yunacoins-rules.js` comentario de `bandCosts` | `<80, 80-85, …` | `hasta 80, 81-85, …` |
| `yunacoins-rules.js` comentarios de `bandCost99` / `costRange99` | «IDENTICO al editor» | fuente única en el módulo |
| `yunacoins-rules.js` referencias de línea (cabecera) | sin nota | nota de que `BAND_MAX` cambió en BAND-1 |
| `pes5-tool.js:2358` etiquetas de Reglas | `Menos de 80`, `80 a 85`, … | `Hasta 80`, `81 a 85`, … |
| `tools/test-yunacoins-rules.js` cabecera | `BAND_MAX = [79, …]` | `[80, …]` |

Los tramos de 81 en adelante no cambian: 81-85 = 100, 86-90 = 250, 91-95 = 500, 96-99 = 1000.

No hay otras etiquetas de Reglas, Mejoras ni del modal de reglas con «Menos de 80» ni «80 a 85». `mejoras-page.js` ya usa `YUNACOINS_RULES.bandCost99`, así que el editor del presidente toma la corrección sin tocar nada.

**No tocado a propósito:** `tierClass99` en `mejoras-page.js:820` (`v<=79` → color `n`). Es el color de la tarjeta por nivel, no el costo. Si Luis quiere que el color también cambie de 79 a 80, es otro slice.

## Efecto en los costos

- 79→80 = **50** (antes 100).
- 80→81 = 100 (sin cambio).
- 78→81 = 50 + 50 + 100 = **200** (antes 250).
- Base 79–80 con perfil: el 80 sigue gratis (tramo gratis sin cambio).
- Pedidos ya cobrados no se recalculan. Solo cambia el costo de pedidos nuevos.

## Tests

`node tools/test-yunacoins-rules.js`: **231 OK, 0 FALLO** (antes 225 OK).

Aserciones que dependían del 79 y se actualizaron, con el motivo:

| Test | Antes | Ahora | Motivo |
|---|---|---|---|
| `bandCost99(80)` | 100 | 50 | el 80 entra en el primer tramo |
| Caso 2, Ataque 78→83 | 450 | 400 | 79 y 80 a 50; 81-83 a 100 |
| sin perfil, 79→82 (`costoAtributoConPerfil`) | 300 | 250 | el 80 cuesta 50 |
| sin perfil, 79→82 (`costoCambios`) | 300 | 250 | igual |
| cierre, 79→80 sin fijar | 100 | 50 | el 80 cuesta 50 |
| regresión combinada, Ataque 75→82 | total 1500 | total 1450 | 76-80 a 50 (250) + 81-82 a 100 (200) |

Nuevos casos BAND-1 (todos OK): `bandCost99(80)=50`, `bandCost99(81)=100`, `costRange99` 79→80 = 50, 80→81 = 100, 78→81 = 200, `costoCambios` 79→80 = 50, 79→81 = 150.

El perfil de Emparejar sigue respetando su tramo gratis (los casos EMP-80-2 quedan igual).

Suite completa (`tools/test-*.js`):

- Pasan: aviso-presupuesto, escape-helpers, pedidos-desde, pes5-bloqueo, pes5-clubes, pes5-formacion, pes5-orden, pes5-plantilla-publicadas, pes5-plantilla, posiciones-banda, slice-p-plantilla, topes-extra, yunacoins-core, yunacoins-rules.
- **Falla `test-jugador-completo.js` (2 FALLO), igual que antes del cambio.** La causa es que «Berbatov» no aparece en el save de prueba (`id -1`). No tiene relación con las bandas.

Los tests del emulador (`functions/test/rules-pes5.js`) no se corrieron en este slice. No calculan costos por banda: el servidor no tiene copia de `bandCost99` (solo grep en `functions/`, cero coincidencias). Los casos de tramo gratis que usan 79/80 son de perfil, no de banda.

## Pendientes / notas

- Sin deploy. Las Cloud Functions y las reglas no cambian en este slice.
- Los datos de pedidos viejos quedan con el costo que tenían.
