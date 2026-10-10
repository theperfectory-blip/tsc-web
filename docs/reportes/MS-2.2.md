# MS-2.2 · Paridad `tsc-src` / `dist` · 2026-10-10

Hallazgo que cierra: H-20.

## Cambios

- `scripts/smoke-parity.mjs` (solo desarrollo): reconstruye `dist/` con
  `build-web.mjs`, carga los `<script>` de `tsc-src` y de `dist` en el mismo
  orden dentro de un contexto `vm` con DOM simulado y Firebase ausente (como
  si `gstatic` estuviera bloqueado), y compara globales (function/var y
  let/const/class) y errores de carga. Sale con código 1 si difieren.

## Resultado

| Variante | Scripts | Globales | Errores de carga |
|---|---|---|---|
| `tsc-src` | 38 | 900 | 1 |
| `dist` | 10 (9 bundles + inline) | 900 | 1 |

Paridad exacta: ninguna global falta en `dist`. El único error es el mismo en
las dos variantes y es del stub (`document.fonts.ready.then`), no del código.
Prueba negativa: un `throw` agregado a `matches.js` aparece en ambas
variantes, atribuido al archivo en `tsc-src` y a `bundles/app-02` en `dist`.

## Límites

- El DOM simulado no reproduce errores que dependen del DOM real. Esto no
  reemplaza abrir `hosting-dist` en el navegador (siguiendo
  `PROTOCOLO_VERIFICACION.md`); queda como verificación manual antes de un
  deploy que toque la carga de scripts.
- Un `throw` al final de un archivo no quita globales; el script lo detecta
  por la diferencia de mensajes de error y por las globales que falten.
