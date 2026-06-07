## Proyecto TSC Web — Copa Suscriptores Admin

Aplicación web de gestión de torneos de fútbol (TSC · Copa Suscriptores).
Código fuente modular en `tsc-src/` (dividido desde `TSC_Admin_v1_91.html`, 6537 líneas monolíticas).
Base de datos: **IndexedDB** en el navegador (sin backend).
Para correr localmente: `cd tsc-src && npx serve .` → abrir `http://localhost:3000`

---

## Code Map — tsc-src/

```
tsc-src/
├── index.html                  # Shell HTML: topbar, sidebar, nav público, páginas, modales globales
│
├── css/
│   ├── variables.css           # Custom properties: colores, temas dark/light, tipografía
│   ├── layout.css              # Topbar, sidebar, nav público, main content (grid layout)
│   └── components.css          # Botones, badges, forms, tablas, modales, grids, animaciones
│
└── js/                         # Carga en orden de dependencias (ver index.html)
    │
    ├── state.js                # GLOBALS: STATE{season,mode}, DB_NAME, DB_VER, STORES, db
    │
    ├── db.js                   # IndexedDB CRUD
    │   └── initDB, dbGetAll, dbGet, dbAdd, dbPut, dbDelete, getForSeason, getSeasonName
    │
    ├── ui-utils.js             # UI helpers + arranque de la app
    │   ├── openModal, closeModal, showConfirm, closeConfirm, runConfirm, showToast
    │   ├── setTheme, openSettings, saveSettings
    │   └── seedInitialData     # Datos iniciales + window.onload → initDB, setTheme, loadSeasons, setMode
    │
    ├── nav.js                  # Navegación modo público/admin
    │   ├── setMode, goPublicPage, goAdminPage
    │   ├── renderPublicPage, renderAdminPage
    │   ├── renderPubPanel, renderPubHistory, renderAdmDashboard
    │   └── loadSeasons, onSeasonChange
    │
    ├── color-picker.js         # Selector de color tipo rueda hexagonal
    │   └── openColorPicker, PALETTE, COLOR_WHEEL
    │
    ├── competitions.js         # CRUD de competiciones
    │   ├── renderAdmComps, renderCompsGrid
    │   ├── openCompModal, closeCompModal, saveComp, deleteComp
    │   └── COMP_TYPES, PHASE_TYPES
    │
    ├── phases.js               # Gestión de fases por competición
    │   ├── openFasesForComp, renderAdmFases, onFaseCompChange, renderPhasesList
    │   ├── togglePhasePublish
    │   ├── openPhaseModal, closePhaseModal, savePhase, deletePhase
    │   └── renderPubComps      # Vista pública de competiciones
    │
    ├── standings.js            # Clasificaciones de grupos
    │   ├── getCriteria, saveCriteria, calcGroupStandings, isMathConfirmed, renderGroupTable
    │   ├── openCriteriaModal, closeCriteriaModal, saveCriteriaAndRefresh (drag & drop criteria)
    │   └── openGroupAssignModal, renderAssignTeamsList, addToGroup, removeFromGroup, saveGroupAssign
    │
    ├── matches.js              # Registro de partidos (grupos / jornadas / rondas)
    │   ├── renderAdmMatches, onMatchPhaseChange, onMatchGroupChange, renderMatchesList
    │   ├── navegarRonda, showMatchGroupTable, renderRondasAdmin
    │   ├── openRondaModal, updateRondaSlot, saveRonda, deleteRonda
    │   ├── openMatchInputModal, saveMatchResult, deleteMatch
    │   └── openEditResultModal, saveEditResult, openAssignDateToJornada, saveJornadaDate
    │
    ├── bracket.js              # Render de cuadros eliminatorios (bracket visual)
    │   ├── renderBracket, buildBracketRounds, buildBracketSlots, renderBracketHTML, scaleBracket
    │   ├── resolveSlotRef, refLabel, refBadgeHTML, getClassifiedFromPhase
    │   ├── openSlotRefModal, saveSlotRef, removeSlotRef
    │   ├── openBracketMatchModal, saveBracketMatch, deleteBracketMatch
    │   ├── getWinner, teamLogoHtml, loadBracketLogos
    │   └── getStandingsForPhase, invalidateStandingsCache (_standingsCache)
    │
    ├── playoff.js              # Configuración de formato playoff / supercopa
    │   ├── renderPlayoff
    │   ├── openPlayoffLegModal, savePlayoffLeg, deletePlayoffLeg
    │   ├── openPlayoffTeamAssign, buildPlayoffPools, clearPlayoffAssign, savePlayoffAssign
    │   └── openSupercopaTeamAssign, saveSupercopaAssign, getPlayoffWinnersFromPhase
    │
    ├── teams.js                # CRUD de equipos + vista pública
    │   ├── renderAdmTeams, renderTeamsTable, filterTeamsTable
    │   ├── openTeamModal, closeTeamModal, saveTeam, deleteTeam
    │   ├── previewLogo, removeLogo, updateColorPreview, syncColorPicker, setTeamColor
    │   └── renderPubTeams, filterPubTeams, renderPubTeamsGrid
    │
    ├── coins.js                # Gestión de YuNaCoins (economía virtual)
    │   ├── renderAdmCoins, renderCoinsTable, filterCoinsTable
    │   ├── openCoinsModal, saveCoinsTransaction, openCoinsHistory
    │   └── openBulkCoinsModal, setBulkMode, saveBulkCoins
    │
    ├── seasons.js              # Gestión de temporadas
    │   ├── renderAdmSeasons, openSeasonModal, saveSeasonModal
    │   ├── switchToSeason, confirmFinalizeSeason, finalizeSeason
    │   └── confirmDeleteSeason, deleteSeason, confirmReactivateSeason, reactivateSeason
    │
    ├── data.js                 # Export / Import de la base de datos
    │   ├── renderAdmData, renderDBInfo
    │   ├── exportFullDB, exportSeason, downloadJSON
    │   └── importDB
    │
    └── public.js               # Vistas públicas (panel, competiciones, equipos, historial)
        ├── renderPubPanel, pubShowMatchesGroup
        ├── pubSelectComp, pubSelectPhase
        └── renderPubHistory
```

### Flujo de arranque
```
window.onload → initDB() → setTheme() → seedInitialData() → loadSeasons() → setMode('public')
```

### Dependencias entre módulos
```
state.js ← db.js ← todos los demás
ui-utils.js ← nav.js ← public.js / competitions.js / phases.js / ...
bracket.js ← standings.js (getStandingsForPhase)
playoff.js ← bracket.js (getPlayoffWinner)
phases.js → renderPubComps (usa bracket.js + standings.js)
```

---

## graphify

This project has a graphify knowledge graph at `tsc-src/graphify-out/`.

Rules:
- **GRAPH FIRST — always:** before searching for ANY function, file, or dependency, read `tsc-src/graphify-out/GRAPH_REPORT.md`. Identify the relevant community by name and the god nodes involved. Only then use grep/Read. This applies to every task, not just architecture questions.
- If `tsc-src/graphify-out/wiki/index.md` exists, navigate it instead of reading raw files
- After modifying code files in this session, run `graphify update .` inside `tsc-src/` to keep the graph current (AST-only, no API cost)

## Iconos — SVG obligatorio

- **Nunca usar emojis en la UI.** Cualquier icono nuevo debe ser SVG inline estilo Lucide: `stroke`, no `fill`, `currentColor`, `stroke-width="1.7–2.2"`, `stroke-linecap="round"`, `stroke-linejoin="round"`.
- Esto aplica a botones, badges, labels, toasts, modales, hints — cualquier elemento visual nuevo o modificado.
