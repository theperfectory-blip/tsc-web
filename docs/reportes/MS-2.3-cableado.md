# MS-2.3 · Auditor estático de cableado

Generado por `node scripts/audit-wiring.mjs` · 2026-11-17. Heurístico (regex, sin parser): cada hallazgo se confirma a mano antes de actuar. Lo usan M4, M5 y M7.

Alcance: index.html + 51 JS · 1602 nombres globales definidos.

## 1. Handlers que llaman funciones no definidas (0)

_Ninguno._

## 1a. Handlers data-on* que no son window.<nombre> (0) — el click no hace nada

_Ninguno._

## 1b. Handlers data-on* fuera de la gramática de js/events.js (3)

| Dónde | Handler | Error |
|---|---|---|
| js/mejoras-page.js:110 | `if(event.target===this)...` | carácter inesperado «=» |
| js/mejoras-page.js:2845 | `event.stopPropagation();${onDec}` | se esperaba «id» |
| js/mejoras-page.js:2846 | `event.stopPropagation();${onInc}` | se esperaba «id» |

## 2. Funciones sin ninguna referencia (9) — candidatas a código muerto para 7.2

Ojo: pueden usarse por nombre dinámico (`window[...]`), desde la consola o desde Android; verificar antes de borrar.

- `isPresident` · js/auth.js:17
- `liveAvailable` · js/live.js:55
- `_formationKey` · js/mejoras-page.js:519
- `sectionKeyOfSlot` · js/mejoras-page.js:1081
- `clearAuditLog` · js/mejoras-page.js:1825
- `setPalmaresMedia` · js/palmares.js:2301
- `costoJugador` · js/pes5-tool.js:329
- `costoTotalPendienteEquipo` · js/pes5-tool.js:335
- `_cambiosDe` · js/pes5-tool.js:1229

## 3. Nombres globales duplicados entre archivos (7)

- `renderAuthUI` · js/auth.js:290, js/mejoras-page.js:141
- `openModal` · js/ui-utils.js:5, js/mejoras-page.js:117
- `closeModal` · js/ui-utils.js:6, js/mejoras-page.js:118
- `showToast` · js/ui-utils.js:31, js/mejoras-page.js:128
- `toggleTheme` · js/ui-utils.js:81, js/mejoras-page.js:229
- `cargarReglasFirestore` · js/mejoras-page.js:673, js/pes5-tool.js:211
- `montar` · js/mejoras-page.js:3318, js/pes5-tool.js:431

## 4. getElementById con ID que no existe en ningún template (3) — heurística

- `bulk-${m}-btn` · js/coins.js:299
- `mej-save-pub` · js/mejoras-page.js:3312
- `mej-host` · js/mejoras-page.js:3362
