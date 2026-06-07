# Graph Report - C:/Users/Administrator/Downloads/tsc.web/tsc-src  (2026-06-06)

## Corpus Check
- 65 files · ~210,272 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 778 nodes · 1744 edges · 51 communities detected
- Extraction: 70% EXTRACTED · 30% INFERRED · 0% AMBIGUOUS · INFERRED: 524 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Bracket & Eliminacion|Bracket & Eliminacion]]
- [[_COMMUNITY_CRUD Admin — Competiciones y Fases|CRUD Admin — Competiciones y Fases]]
- [[_COMMUNITY_Palmares (Hall of Fame)|Palmares (Hall of Fame)]]
- [[_COMMUNITY_Base de Datos — Schemas y Audit|Base de Datos — Schemas y Audit]]
- [[_COMMUNITY_Arquitectura App y Schemas de Datos|Arquitectura App y Schemas de Datos]]
- [[_COMMUNITY_Sorteo — Sistema de Bombo|Sorteo — Sistema de Bombo]]
- [[_COMMUNITY_Historial y Estadisticas de Partidos|Historial y Estadisticas de Partidos]]
- [[_COMMUNITY_Navegacion y Temas (DarkLight)|Navegacion y Temas (Dark/Light)]]
- [[_COMMUNITY_Assets Animacion Chibi (Sorteo)|Assets Animacion Chibi (Sorteo)]]
- [[_COMMUNITY_Utilidades Playoff y Bracket|Utilidades Playoff y Bracket]]
- [[_COMMUNITY_Equipos, Usuarios y Cloudinary|Equipos, Usuarios y Cloudinary]]
- [[_COMMUNITY_UI Utilities y Sistema de Sonido|UI Utilities y Sistema de Sonido]]
- [[_COMMUNITY_Clasificaciones y Criterios|Clasificaciones y Criterios]]
- [[_COMMUNITY_Assets Trofeos y Estilos Visuales|Assets Trofeos y Estilos Visuales]]
- [[_COMMUNITY_Perfil de Usuario y Recorte de Imagen|Perfil de Usuario y Recorte de Imagen]]
- [[_COMMUNITY_Autenticacion Firebase|Autenticacion Firebase]]
- [[_COMMUNITY_YuNaCoins — Economia Virtual|YuNaCoins — Economia Virtual]]
- [[_COMMUNITY_Modelos de Datos Equipo y Moneda|Modelos de Datos: Equipo y Moneda]]
- [[_COMMUNITY_Integracion Cloudinary|Integracion Cloudinary]]
- [[_COMMUNITY_Color Picker Widget|Color Picker Widget]]
- [[_COMMUNITY_Firebase Config (ejemplo)|Firebase Config (ejemplo)]]
- [[_COMMUNITY_Firebase Config (activo)|Firebase Config (activo)]]
- [[_COMMUNITY_Estado Global (state.js)|Estado Global (state.js)]]
- [[_COMMUNITY_Script Conversion Trofeos|Script Conversion Trofeos]]
- [[_COMMUNITY_Vista Publica — Equipos|Vista Publica — Equipos]]
- [[_COMMUNITY_Vista Admin — Temporadas|Vista Admin — Temporadas]]
- [[_COMMUNITY_Vista Admin — Partidos|Vista Admin — Partidos]]
- [[_COMMUNITY_Guardar Partido|Guardar Partido]]
- [[_COMMUNITY_Borrar Partido|Borrar Partido]]
- [[_COMMUNITY_Vista Publica — Partidos|Vista Publica — Partidos]]
- [[_COMMUNITY_Validacion de Equipo|Validacion de Equipo]]
- [[_COMMUNITY_Topbar (Header fijo)|Topbar (Header fijo)]]
- [[_COMMUNITY_Contenedor Principal (main)|Contenedor Principal (#main)]]
- [[_COMMUNITY_Pagina Admin — Temporadas|Pagina Admin — Temporadas]]
- [[_COMMUNITY_Pagina Admin — Fases|Pagina Admin — Fases]]
- [[_COMMUNITY_Pagina Admin — Partidos|Pagina Admin — Partidos]]
- [[_COMMUNITY_Pagina Admin — Datos (ExportImport)|Pagina Admin — Datos (Export/Import)]]
- [[_COMMUNITY_Pagina Publica — Equipos|Pagina Publica — Equipos]]
- [[_COMMUNITY_Pagina Publica — Competiciones|Pagina Publica — Competiciones]]
- [[_COMMUNITY_Pagina Publica — Bracket Visual|Pagina Publica — Bracket Visual]]
- [[_COMMUNITY_Pagina Publica — Historial|Pagina Publica — Historial]]
- [[_COMMUNITY_Pagina Publica — Sorteo|Pagina Publica — Sorteo]]
- [[_COMMUNITY_Patron Modal Overlay|Patron Modal Overlay]]
- [[_COMMUNITY_Pagina Admin — Dashboard|Pagina Admin — Dashboard]]
- [[_COMMUNITY_Pagina Admin — YuNaCoins|Pagina Admin — YuNaCoins]]
- [[_COMMUNITY_Pagina Admin — Competiciones|Pagina Admin — Competiciones]]
- [[_COMMUNITY_Sistema de Colores CSS (Tema Oscuro)|Sistema de Colores CSS (Tema Oscuro)]]
- [[_COMMUNITY_Tipo de Fase Single (Supercopa)|Tipo de Fase: Single (Supercopa)]]
- [[_COMMUNITY_Tipo de Competicion Liga|Tipo de Competicion: Liga]]
- [[_COMMUNITY_Tipo de Competicion Superclasico|Tipo de Competicion: Superclasico]]
- [[_COMMUNITY_Historial Importado (Excel)|Historial Importado (Excel)]]

## God Nodes (most connected - your core abstractions)
1. `dbGetAll()` - 102 edges
2. `dbGet()` - 73 edges
3. `showToast()` - 63 edges
4. `dbPut()` - 49 edges
5. `dbAdd()` - 30 edges
6. `Main Content Area Page Container` - 19 edges
7. `renderBracket()` - 18 edges
8. `invalidateStandingsCache()` - 18 edges
9. `activeBombo()` - 18 edges
10. `renderAdminPage()` - 17 edges

## Surprising Connections (you probably didn't know these)
- `setMode() switch public/admin mode` --semantically_similar_to--> `setMode() v1.91 with Password Guard`  [INFERRED] [semantically similar]
  index.html → TSC_Admin_v1_91.html
- `goAdminPage(page, el) navigate to admin page` --semantically_similar_to--> `goAdminPage() Navigation Function`  [INFERRED] [semantically similar]
  index.html → TSC_Admin_v1_91.html
- `BRACKET Phase Type (Elimination)` --semantically_similar_to--> `cup Competition Type (EliminaciÃ³n directa)`  [INFERRED] [semantically similar]
  CODEMAP_TSC_Admin_v1_9.md → TSC_Admin_v1_91.html
- `authSignOut()` --calls--> `showToast()`  [INFERRED]
  js\auth.js → js\ui-utils.js
- `getTeamLogo()` --calls--> `dbGetAll()`  [INFERRED]
  js\bracket.js → C:\Users\Administrator\Downloads\tsc.web\tsc-src\js\db.js

## Hyperedges (group relationships)
- **All Public Pages in index.html** — index_html_pub_page_palmares, index_html_pub_page_panel, index_html_pub_page_equipos, index_html_pub_page_historial, index_html_pub_page_sorteo [EXTRACTED 1.00]
- **All Admin Pages in index.html** — index_html_adm_page_dashboard, index_html_adm_page_equipos, index_html_adm_page_usuarios, index_html_adm_page_competiciones, index_html_adm_page_fases, index_html_adm_page_partidos, index_html_adm_page_sorteo, index_html_adm_page_coins, index_html_adm_page_temporadas, index_html_adm_page_datos, index_html_adm_page_historial, index_html_adm_page_historial_tabla, index_html_adm_page_palmares [EXTRACTED 1.00]
- **8-Frame Chibi Sorteo Animation (draw reveal sequence)** — chibi_01_idle, chibi_02_reach, chibi_03_grab, chibi_04_hold, chibi_05_show, chibi_06_crack, chibi_07_open, chibi_08_celebrate [EXTRACTED 1.00]
- **Top 5 God Nodes (most connected functions)** — audit_report_dbGetAll, audit_report_dbGet, audit_report_showToast, audit_report_dbPut, audit_report_dbAdd [EXTRACTED 1.00]
- **Global Modals in index.html** — index_html_settings_modal, index_html_confirm_overlay, index_html_toast [EXTRACTED 1.00]
- **Tournament Phase Type â†’ Config Schema â†’ Render Function Pipeline** — phase_type_liga, data_phase_config_liga, fn_renderligastandings [EXTRACTED 0.95]
- **IndexedDB CRUD Layer: dbAdd/dbPut/dbGet/dbDelete** — fn_dbadd, fn_dbput, fn_dbget, fn_dbdelete, fn_dbgetall [EXTRACTED 1.00]
- **App Initialization: initDB â†’ seedData â†’ loadSeasons â†’ setMode** — fn_initdb, fn_seedinitialdata, fn_loadseasons, fn_setmode [EXTRACTED 1.00]
- **Gold-toned Trophy Group** — trophy_01_classica, trophy_02_imperial, trophy_05_sobria, trophy_06_moderno, trophy_07_celtica [EXTRACTED 0.95]
- **Silver/Chrome Trophy Group** — trophy_04_orejona, trophy_08_barroca, trophy_09_geometrica, trophy_10_minimalista, trophy_11_nebula [EXTRACTED 0.95]
- **Football Ball Design Trophy Group** — trophy_03_konami, trophy_09_geometrica [EXTRACTED 0.90]
- **All Palmares Trophy Assets** — trophy_01_classica, trophy_02_imperial, trophy_03_konami, trophy_04_orejona, trophy_05_sobria, trophy_06_moderno, trophy_07_celtica, trophy_08_barroca, trophy_09_geometrica, trophy_10_minimalista, trophy_11_nebula, concept_palmares_module [INFERRED 0.95]

## Communities

### Community 0 - "Bracket & Eliminacion"
Cohesion: 0.05
Nodes (114): buildBracketRounds(), buildBracketSlots(), getClassifiedFromPhase(), getStandingsForPhase(), getWinner(), invalidateStandingsCache(), openBracketMatchModal(), openSlotRefModal() (+106 more)

### Community 1 - "CRUD Admin — Competiciones y Fases"
Cohesion: 0.05
Nodes (67): deleteBracketMatch(), closeCompModal(), deleteComp(), renderAdmComps(), renderCompsGrid(), saveComp(), downloadJSON(), exportSeason() (+59 more)

### Community 2 - "Palmares (Hall of Fame)"
Cohesion: 0.07
Nodes (61): addPalmaresRecord(), aggregatePalmaresByTeam(), buildCase(), buildInfoPanel(), closeChampionFullscreen(), closePalmaresModals(), createNewCopa(), deleteCopaAndRefresh() (+53 more)

### Community 3 - "Base de Datos — Schemas y Audit"
Cohesion: 0.04
Nodes (60): Change: competitions.js COMP_TYPES reduced 6 to 4, PHASE_TYPES reduced 5 to 4, Change: history.js _teamCellHTML() shows historical name tooltip, Change: phases.js removed derived phase type logic, Change: teams.js auto-backup of historical names in saveTeam(), Change: ui-utils.js notifyTeamChanged() calls refreshHistoryForSeason(), dbAdd (16 edges God Node), dbGet (51 edges God Node), dbGetAll (77 edges God Node) (+52 more)

### Community 4 - "Arquitectura App y Schemas de Datos"
Cohesion: 0.05
Nodes (50): Graphify Knowledge Graph Instructions, TSC Admin Code Map v1.9, Match Data Schema, coins Object Store (v1.91), competitions Object Store (v1.91), config Key-Value Store, history Object Store (v1.91), import_log Object Store (+42 more)

### Community 5 - "Sorteo — Sistema de Bombo"
Cohesion: 0.11
Nodes (40): activeBombo(), addBombo(), broadcast(), deleteActiveBombo(), drawNext(), effectiveDrawnIds(), emptyState(), ensureBC() (+32 more)

### Community 6 - "Historial y Estadisticas de Partidos"
Cohesion: 0.11
Nodes (41): _applyFilters(), _buildH2HPanel(), _classifyOutcomeFIFA(), cleanLegacyImportedFromIDB(), _computeHistoricalStandings(), computeResultado(), _currentHistContainer(), _esc() (+33 more)

### Community 7 - "Navegacion y Temas (Dark/Light)"
Cohesion: 0.06
Nodes (36): Dark Theme (Estadio de Noche), Light Theme Override, goPublicPage() Navigation Function, renderPublicPage() Dispatcher, setTheme() Function, showPage() Function, toggleTheme() Function, Admin Sidebar Navigation (+28 more)

### Community 8 - "Assets Animacion Chibi (Sorteo)"
Cohesion: 0.08
Nodes (33): Chibi Character Frame 01: Idle Stance, Chibi Character Frame 02: Reaching into Draw Bowl, Chibi Character Frame 03: Grabbing Ball from Bowl, Chibi Character Frame 04: Holding Ball Up, Chibi Character Frame 05: Showing/Presenting Ball, Chibi Character Frame 06: Cracking Ball Open, Chibi Character Frame 07: Ball Opened Reveal Moment, Chibi Character Frame 08: Celebration thumbs up (+25 more)

### Community 9 - "Utilidades Playoff y Bracket"
Cohesion: 0.08
Nodes (19): _cleanup(), closeBracketMatchModal(), _getAudioCtx(), getPlayoffMatchupsCount(), getTeamLogo(), hexToRgb(), lighten(), loadBracketLogos() (+11 more)

### Community 10 - "Equipos, Usuarios y Cloudinary"
Cohesion: 0.1
Nodes (21): cloudReady(), uploadImageToCloud(), saveProfile(), closeTeamModal(), deleteTeam(), filterPubTeams(), filterTeamsTable(), openTeamModal() (+13 more)

### Community 11 - "UI Utilities y Sistema de Sonido"
Cohesion: 0.12
Nodes (29): closeCropModal(), toggleSound(), brassNote(), crash(), getCtx(), getVolume(), noiseBuffer(), playDrumRoll() (+21 more)

### Community 12 - "Clasificaciones y Criterios"
Cohesion: 0.12
Nodes (20): addToGroup(), buildTeamCompMap(), calcGroupStandings(), closeCriteriaModal(), closeGroupAssignModal(), criteriaDisable(), criteriaDragEnd(), criteriaDrop() (+12 more)

### Community 13 - "Assets Trofeos y Estilos Visuales"
Cohesion: 0.11
Nodes (27): Drumroll Sound Effect, Palmares Hall of Fame Module, Football Ball Topper Design Pattern, Gold Trophy Visual Style, Silver/Chrome Trophy Visual Style, Trophy 01 - Classica, Trophy 01 - Classica (PNG), Trophy 02 - Imperial (+19 more)

### Community 14 - "Perfil de Usuario y Recorte de Imagen"
Cohesion: 0.13
Nodes (21): _cropApply(), _cropClamp(), _cropZoomAt(), cropZoomSlider(), _donutSVG(), _injectCropModal(), _injectProfileModal(), _loadTeamStats() (+13 more)

### Community 15 - "Autenticacion Firebase"
Cohesion: 0.18
Nodes (13): _authErrorMsg(), _authEsc(), authForgotPassword(), authSignOut(), authSubmit(), _injectAuthModal(), _loadProfile(), onAuthInit() (+5 more)

### Community 16 - "YuNaCoins — Economia Virtual"
Cohesion: 0.31
Nodes (9): closeCoinsModal(), filterCoinsTable(), openBulkCoinsModal(), openCoinsModal(), renderAdmCoins(), renderCoinsTable(), saveBulkCoins(), saveCoinsTransaction() (+1 more)

### Community 17 - "Modelos de Datos: Equipo y Moneda"
Cohesion: 0.5
Nodes (4): Team Data Schema, YuNaCoin Virtual Currency, Dual Team Colors Feature (v1.9), Rationale: Dual Team Colors Added in v1.9

### Community 18 - "Integracion Cloudinary"
Cohesion: 1.0
Nodes (2): cloudReady(), uploadImageToCloud()

### Community 19 - "Color Picker Widget"
Cohesion: 1.0
Nodes (0): 

### Community 20 - "Firebase Config (ejemplo)"
Cohesion: 1.0
Nodes (0): 

### Community 21 - "Firebase Config (activo)"
Cohesion: 1.0
Nodes (0): 

### Community 22 - "Estado Global (state.js)"
Cohesion: 1.0
Nodes (0): 

### Community 23 - "Script Conversion Trofeos"
Cohesion: 1.0
Nodes (0): 

### Community 24 - "Vista Publica — Equipos"
Cohesion: 1.0
Nodes (1): renderPubTeams() Function

### Community 25 - "Vista Admin — Temporadas"
Cohesion: 1.0
Nodes (1): renderAdmSeasons() Function

### Community 26 - "Vista Admin — Partidos"
Cohesion: 1.0
Nodes (1): renderAdmMatches() Function

### Community 27 - "Guardar Partido"
Cohesion: 1.0
Nodes (1): saveMatch() Function

### Community 28 - "Borrar Partido"
Cohesion: 1.0
Nodes (1): deleteMatch() Function

### Community 29 - "Vista Publica — Partidos"
Cohesion: 1.0
Nodes (1): renderPubMatches() Function

### Community 30 - "Validacion de Equipo"
Cohesion: 1.0
Nodes (1): validateTeamData() Function

### Community 31 - "Topbar (Header fijo)"
Cohesion: 1.0
Nodes (1): #topbar Fixed Header

### Community 32 - "Contenedor Principal (#main)"
Cohesion: 1.0
Nodes (1): #main Page Container

### Community 33 - "Pagina Admin — Temporadas"
Cohesion: 1.0
Nodes (1): #admin-seasons-page / #page-temporadas-admin

### Community 34 - "Pagina Admin — Fases"
Cohesion: 1.0
Nodes (1): #admin-phases-page / #page-fases-admin

### Community 35 - "Pagina Admin — Partidos"
Cohesion: 1.0
Nodes (1): #admin-matches-page / #page-partidos-admin

### Community 36 - "Pagina Admin — Datos (Export/Import)"
Cohesion: 1.0
Nodes (1): #editor-page / #page-datos-admin

### Community 37 - "Pagina Publica — Equipos"
Cohesion: 1.0
Nodes (1): #pub-teams-page / #page-equipos

### Community 38 - "Pagina Publica — Competiciones"
Cohesion: 1.0
Nodes (1): #pub-standings-page / #page-competiciones

### Community 39 - "Pagina Publica — Bracket Visual"
Cohesion: 1.0
Nodes (1): #pub-bracket-page Bracket Visualization

### Community 40 - "Pagina Publica — Historial"
Cohesion: 1.0
Nodes (1): #pub-matches-page Match History

### Community 41 - "Pagina Publica — Sorteo"
Cohesion: 1.0
Nodes (1): #pub-sorteo-page Lottery Animation

### Community 42 - "Patron Modal Overlay"
Cohesion: 1.0
Nodes (1): .modal-overlay Modal Pattern

### Community 43 - "Pagina Admin — Dashboard"
Cohesion: 1.0
Nodes (1): #page-dashboard Admin Dashboard (v1.91)

### Community 44 - "Pagina Admin — YuNaCoins"
Cohesion: 1.0
Nodes (1): #page-coins-admin YuNaCoins Admin Page

### Community 45 - "Pagina Admin — Competiciones"
Cohesion: 1.0
Nodes (1): #page-competiciones-admin Competitions Page

### Community 46 - "Sistema de Colores CSS (Tema Oscuro)"
Cohesion: 1.0
Nodes (1): CSS Color System (Dark Editorial Theme)

### Community 47 - "Tipo de Fase: Single (Supercopa)"
Cohesion: 1.0
Nodes (1): single Phase Type (Supercopa / Final)

### Community 48 - "Tipo de Competicion: Liga"
Cohesion: 1.0
Nodes (1): league Competition Type (Liga / Grupos)

### Community 49 - "Tipo de Competicion: Superclasico"
Cohesion: 1.0
Nodes (1): super Competition Type (SuperclÃ¡sico)

### Community 50 - "Historial Importado (Excel)"
Cohesion: 1.0
Nodes (1): HISTORIAL_TSC_v2.1.xlsx Historical Data

## Knowledge Gaps
- **119 isolated node(s):** `Graph Statistics (291 nodes, 727 edges, 28 communities)`, `Toast Notification Container`, `Public Page: Competiciones Panel`, `Admin Page: Dashboard`, `Admin Page: Usuarios y Permisos` (+114 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Color Picker Widget`** (2 nodes): `color-picker.js`, `openColorPicker()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Firebase Config (ejemplo)`** (1 nodes): `firebase-config.example.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Firebase Config (activo)`** (1 nodes): `firebase-config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Estado Global (state.js)`** (1 nodes): `state.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Script Conversion Trofeos`** (1 nodes): `convert.mjs`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Vista Publica — Equipos`** (1 nodes): `renderPubTeams() Function`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Vista Admin — Temporadas`** (1 nodes): `renderAdmSeasons() Function`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Vista Admin — Partidos`** (1 nodes): `renderAdmMatches() Function`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Guardar Partido`** (1 nodes): `saveMatch() Function`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Borrar Partido`** (1 nodes): `deleteMatch() Function`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Vista Publica — Partidos`** (1 nodes): `renderPubMatches() Function`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Validacion de Equipo`** (1 nodes): `validateTeamData() Function`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Topbar (Header fijo)`** (1 nodes): `#topbar Fixed Header`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Contenedor Principal (#main)`** (1 nodes): `#main Page Container`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Pagina Admin — Temporadas`** (1 nodes): `#admin-seasons-page / #page-temporadas-admin`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Pagina Admin — Fases`** (1 nodes): `#admin-phases-page / #page-fases-admin`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Pagina Admin — Partidos`** (1 nodes): `#admin-matches-page / #page-partidos-admin`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Pagina Admin — Datos (Export/Import)`** (1 nodes): `#editor-page / #page-datos-admin`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Pagina Publica — Equipos`** (1 nodes): `#pub-teams-page / #page-equipos`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Pagina Publica — Competiciones`** (1 nodes): `#pub-standings-page / #page-competiciones`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Pagina Publica — Bracket Visual`** (1 nodes): `#pub-bracket-page Bracket Visualization`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Pagina Publica — Historial`** (1 nodes): `#pub-matches-page Match History`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Pagina Publica — Sorteo`** (1 nodes): `#pub-sorteo-page Lottery Animation`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Patron Modal Overlay`** (1 nodes): `.modal-overlay Modal Pattern`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Pagina Admin — Dashboard`** (1 nodes): `#page-dashboard Admin Dashboard (v1.91)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Pagina Admin — YuNaCoins`** (1 nodes): `#page-coins-admin YuNaCoins Admin Page`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Pagina Admin — Competiciones`** (1 nodes): `#page-competiciones-admin Competitions Page`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Sistema de Colores CSS (Tema Oscuro)`** (1 nodes): `CSS Color System (Dark Editorial Theme)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Tipo de Fase: Single (Supercopa)`** (1 nodes): `single Phase Type (Supercopa / Final)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Tipo de Competicion: Liga`** (1 nodes): `league Competition Type (Liga / Grupos)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Tipo de Competicion: Superclasico`** (1 nodes): `super Competition Type (SuperclÃ¡sico)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Historial Importado (Excel)`** (1 nodes): `HISTORIAL_TSC_v2.1.xlsx Historical Data`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dbGetAll()` connect `Bracket & Eliminacion` to `CRUD Admin — Competiciones y Fases`, `Palmares (Hall of Fame)`, `Sorteo — Sistema de Bombo`, `Historial y Estadisticas de Partidos`, `Utilidades Playoff y Bracket`, `Equipos, Usuarios y Cloudinary`, `Clasificaciones y Criterios`, `YuNaCoins — Economia Virtual`?**
  _High betweenness centrality (0.135) - this node is a cross-community bridge._
- **Why does `showToast()` connect `Bracket & Eliminacion` to `CRUD Admin — Competiciones y Fases`, `Palmares (Hall of Fame)`, `Historial y Estadisticas de Partidos`, `Equipos, Usuarios y Cloudinary`, `UI Utilities y Sistema de Sonido`, `Clasificaciones y Criterios`, `Perfil de Usuario y Recorte de Imagen`, `Autenticacion Firebase`, `YuNaCoins — Economia Virtual`?**
  _High betweenness centrality (0.102) - this node is a cross-community bridge._
- **Why does `dbGet()` connect `Bracket & Eliminacion` to `CRUD Admin — Competiciones y Fases`, `Palmares (Hall of Fame)`, `Sorteo — Sistema de Bombo`, `Historial y Estadisticas de Partidos`, `Equipos, Usuarios y Cloudinary`, `Clasificaciones y Criterios`, `Perfil de Usuario y Recorte de Imagen`, `YuNaCoins — Economia Virtual`?**
  _High betweenness centrality (0.073) - this node is a cross-community bridge._
- **Are the 99 inferred relationships involving `dbGetAll()` (e.g. with `getTeamLogo()` and `renderBracket()`) actually correct?**
  _`dbGetAll()` has 99 INFERRED edges - model-reasoned connections that need verification._
- **Are the 71 inferred relationships involving `dbGet()` (e.g. with `renderBracket()` and `getStandingsForPhase()`) actually correct?**
  _`dbGet()` has 71 INFERRED edges - model-reasoned connections that need verification._
- **Are the 60 inferred relationships involving `showToast()` (e.g. with `authForgotPassword()` and `authSignOut()`) actually correct?**
  _`showToast()` has 60 INFERRED edges - model-reasoned connections that need verification._
- **Are the 46 inferred relationships involving `dbPut()` (e.g. with `saveSlotRef()` and `removeSlotRef()`) actually correct?**
  _`dbPut()` has 46 INFERRED edges - model-reasoned connections that need verification._