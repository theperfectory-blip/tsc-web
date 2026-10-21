# MS-2.3 · Auditor estático de cableado

Generado por `node scripts/audit-wiring.mjs` · 2026-10-21. Heurístico (regex, sin parser): cada hallazgo se confirma a mano antes de actuar. Lo usan M4, M5 y M7.

Alcance: index.html + 39 JS · 1065 nombres globales definidos.

## 1. Handlers que llaman funciones no definidas (0)

_Ninguno._

## 1b. Handlers data-on* fuera de la gramática de js/events.js (0)

_Ninguno._

## 2. Funciones sin ninguna referencia (3) — candidatas a código muerto para 7.2

Ojo: pueden usarse por nombre dinámico (`window[...]`), desde la consola o desde Android; verificar antes de borrar.

- `isPresident` · js/auth.js:17
- `liveAvailable` · js/live.js:55
- `setPalmaresMedia` · js/palmares.js:2301

## 3. Nombres globales duplicados entre archivos (0)


## 4. getElementById con ID que no existe en ningún template (1) — heurística

- `bulk-${m}-btn` · js/coins.js:274
