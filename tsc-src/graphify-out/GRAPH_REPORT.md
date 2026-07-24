# Graph Report - C:\Users\Administrator\Downloads\tsc.web\tsc-src  (2026-07-24)

## Corpus Check
- 43 files · ~1,323,493 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2778 nodes · 7125 edges · 46 communities detected
- Extraction: 82% EXTRACTED · 18% INFERRED · 0% AMBIGUOUS · INFERRED: 1277 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]

## God Nodes (most connected - your core abstractions)
1. `copy()` - 167 edges
2. `set()` - 134 edges
3. `dbGetAll()` - 122 edges
4. `dbGet()` - 87 edges
5. `add()` - 84 edges
6. `re` - 75 edges
7. `showToast()` - 75 edges
8. `qt` - 70 edges
9. `ne` - 63 edges
10. `dbPut()` - 60 edges

## Surprising Connections (you probably didn't know these)
- `add()` --calls--> `_calRowOk()`  [INFERRED]
  C:\Users\Administrator\Downloads\tsc.web\tsc-src\assets\vendor\three\three.min.js → C:\Users\Administrator\Downloads\tsc.web\tsc-src\js\calendar.js
- `add()` --calls--> `_fxHideLoader()`  [INFERRED]
  C:\Users\Administrator\Downloads\tsc.web\tsc-src\assets\vendor\three\three.min.js → C:\Users\Administrator\Downloads\tsc.web\tsc-src\js\fixture-gen.js
- `remove()` --calls--> `_fxShowLoader()`  [INFERRED]
  C:\Users\Administrator\Downloads\tsc.web\tsc-src\assets\vendor\three\three.min.js → C:\Users\Administrator\Downloads\tsc.web\tsc-src\js\fixture-gen.js
- `remove()` --calls--> `closePhotoViewer()`  [INFERRED]
  C:\Users\Administrator\Downloads\tsc.web\tsc-src\assets\vendor\three\three.min.js → C:\Users\Administrator\Downloads\tsc.web\tsc-src\js\profile.js
- `copy()` --calls--> `ensureInt8()`  [INFERRED]
  C:\Users\Administrator\Downloads\tsc.web\tsc-src\assets\vendor\three\three.min.js → C:\Users\Administrator\Downloads\tsc.web\tsc-src\assets\vendor\three\draco\draco_decoder.js

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

### Community 0 - "Community 0"
Cohesion: 0.01
Nodes (62): toTrianglesDrawMode(), _a, add(), an, applyMatrix4(), At(), clampPoint(), clone() (+54 more)

### Community 1 - "Community 1"
Cohesion: 0.02
Nodes (280): buildBracketRounds(), buildBracketSlots(), _cleanup(), closeBracketMatchModal(), deleteBracketMatch(), getClassifiedFromPhase(), getPlayoffMatchupsCount(), getStandingsForPhase() (+272 more)

### Community 2 - "Community 2"
Cohesion: 0.01
Nodes (120): _activateAction(), _addInactiveAction(), _addInactiveBinding(), al(), as(), bind(), _bindAction(), br() (+112 more)

### Community 3 - "Community 3"
Cohesion: 0.02
Nodes (35): scaleBracket(), _fxSetLoaderProgress(), _pubHCount(), _palmLayoutSala(), _palmOpenSala(), _palmReorderPointerMove(), _palmSetSalaLoaderProgress(), _palmShowSalaLoader() (+27 more)

### Community 4 - "Community 4"
Cohesion: 0.02
Nodes (60): Particle, A(), B(), C(), D(), e(), F(), G() (+52 more)

### Community 5 - "Community 5"
Cohesion: 0.01
Nodes (23): GLTFCubicSplineQuaternionInterpolant, ac, bc, bl, ea, el(), Ga, gc (+15 more)

### Community 6 - "Community 6"
Cohesion: 0.02
Nodes (36): addMorphTargets(), addPrimitiveAttributes(), addUnknownExtensionsToUserData(), assignExtrasToUserData(), buildNodeHierarchy(), computeBounds(), createAttributesKey(), createDefaultMaterial() (+28 more)

### Community 7 - "Community 7"
Cohesion: 0.03
Nodes (108): _initChrome(), onScroll(), _play(), _initPubSidebarHover(), _esc(), _escAttr(), getPalmaresMedia(), getTrophyGlbUrl() (+100 more)

### Community 8 - "Community 8"
Cohesion: 0.04
Nodes (84): hexToRgb(), lighten(), activeBombo(), addBombo(), _applySorteoStateRefreshNow(), assignBracketLink(), assignLink(), assignPlayoffLink() (+76 more)

### Community 9 - "Community 9"
Cohesion: 0.04
Nodes (100): _calCenterAnchorScroll(), _calCommitStage(), _calCtaBtn(), _calFormatDay(), _calHeroGoComp(), _calHeroHtml(), _calInitHeroCountdown(), _calJornadaViewerDate() (+92 more)

### Community 10 - "Community 10"
Cohesion: 0.04
Nodes (53): _getAudioCtx(), rgbStr(), Rocket, _soundExplosion(), _soundRocketLaunch(), closeFixtureGenModal(), fxBuildLuisRoute(), _fxBuildLuisRouteForLegs() (+45 more)

### Community 11 - "Community 11"
Cohesion: 0.03
Nodes (75): notifyStreamTodayClick(), abort(), addFunctionWasm(), addOnPostRun(), addOnPreRun(), addRunDependency(), alignUp(), assert() (+67 more)

### Community 12 - "Community 12"
Cohesion: 0.04
Nodes (10): stopDrumroll(), dh, ic, kl, _lendControlInterpolant(), rh, stopAllAction(), _takeBackControlInterpolant() (+2 more)

### Community 13 - "Community 13"
Cohesion: 0.05
Nodes (66): _authErrorMsg(), _authEsc(), authForgotPassword(), authSignOut(), authSubmit(), _injectAuthModal(), _loadProfile(), onAuthInit() (+58 more)

### Community 14 - "Community 14"
Cohesion: 0.06
Nodes (66): _calHeroGoH2H(), _applyFilters(), _bindHtTable(), _buildH2HPanel(), _classifyOutcomeFIFA(), computeResultado(), _currentHistContainer(), _esc() (+58 more)

### Community 15 - "Community 15"
Cohesion: 0.07
Nodes (36): frame(), init(), resize(), setVariant(), stop(), wake(), _bindPageReveals(), countUp() (+28 more)

### Community 16 - "Community 16"
Cohesion: 0.07
Nodes (4): co, oo, Po, vo()

### Community 17 - "Community 17"
Cohesion: 0.17
Nodes (6): Gn, hn, jn(), qn(), Vn(), Wn()

### Community 18 - "Community 18"
Cohesion: 0.19
Nodes (18): _bindListeners(), _clearPendingTokenRemoval(), _clearToken(), clearUserToken(), _currentTimezone(), disable(), _disableLocalPushFlagAndToken(), enable() (+10 more)

### Community 19 - "Community 19"
Cohesion: 0.22
Nodes (19): _pbBracketCards(), _pbBracketMount(), _pbCrestMini(), _pbCrestTree(), _pbDesktopTreeHTML(), _pbEsc(), _pbFmtDate(), _pbMaybeFireworks() (+11 more)

### Community 20 - "Community 20"
Cohesion: 0.16
Nodes (15): Change: competitions.js COMP_TYPES reduced 6 to 4, PHASE_TYPES reduced 5 to 4, Change: history.js _teamCellHTML() shows historical name tooltip, Change: phases.js removed derived phase type logic, Change: teams.js auto-backup of historical names in saveTeam(), Change: ui-utils.js notifyTeamChanged() calls refreshHistoryForSeason(), dbAdd (16 edges God Node), dbGet (51 edges God Node), dbGetAll (77 edges God Node) (+7 more)

### Community 21 - "Community 21"
Cohesion: 0.16
Nodes (14): Football Ball Topper Design Pattern, Silver/Chrome Trophy Visual Style, Trophy 03 - Konami, Trophy 03 - Konami (PNG), Trophy 04 - Orejona, Trophy 04 - Orejona (PNG), Trophy 08 - Barroca, Trophy 08 - Barroca (PNG) (+6 more)

### Community 22 - "Community 22"
Cohesion: 0.23
Nodes (12): Chibi Character Frame 01: Idle Stance, Chibi Character Frame 02: Reaching into Draw Bowl, Chibi Character Frame 03: Grabbing Ball from Bowl, Chibi Character Frame 04: Holding Ball Up, Chibi Character Frame 05: Showing/Presenting Ball, Chibi Character Frame 06: Cracking Ball Open, Chibi Character Frame 07: Ball Opened Reveal Moment, Chibi Character Frame 08: Celebration thumbs up (+4 more)

### Community 23 - "Community 23"
Cohesion: 0.2
Nodes (11): Gold Trophy Visual Style, Trophy 01 - Classica, Trophy 01 - Classica (PNG), Trophy 02 - Imperial, Trophy 02 - Imperial (PNG), Trophy 05 - Sobria, Trophy 05 - Sobria (PNG), Trophy 06 - Moderno (+3 more)

### Community 24 - "Community 24"
Cohesion: 0.36
Nodes (9): _apkAlreadyDownloaded(), _apkClosedRecently(), _apkHideOverlay(), _apkInit(), _apkIsNativeApp(), _apkShouldOffer(), closeApkPromo(), openApkPromo() (+1 more)

### Community 25 - "Community 25"
Cohesion: 0.5
Nodes (4): Team Data Schema, YuNaCoin Virtual Currency, Dual Team Colors Feature (v1.9), Rationale: Dual Team Colors Added in v1.9

### Community 26 - "Community 26"
Cohesion: 1.0
Nodes (2): cloudReady(), uploadImageToCloud()

### Community 27 - "Community 27"
Cohesion: 0.67
Nodes (3): TSC Admin Code Map v1.9, Rationale: Single-File Monolithic Architecture, TSC Tournament Administration App

### Community 28 - "Community 28"
Cohesion: 1.0
Nodes (2): BRACKET Phase Config Schema, BRACKET Phase Type (Elimination)

### Community 29 - "Community 29"
Cohesion: 1.0
Nodes (2): PLAYOFF Phase Config Schema, PLAYOFF Phase Type (Aggregate Two-Leg)

### Community 30 - "Community 30"
Cohesion: 1.0
Nodes (2): LIGA Phase Config Schema, LIGA Phase Type (Group Stage)

### Community 31 - "Community 31"
Cohesion: 1.0
Nodes (0): 

### Community 32 - "Community 32"
Cohesion: 1.0
Nodes (0): 

### Community 33 - "Community 33"
Cohesion: 1.0
Nodes (0): 

### Community 34 - "Community 34"
Cohesion: 1.0
Nodes (0): 

### Community 35 - "Community 35"
Cohesion: 1.0
Nodes (1): Graphify Knowledge Graph Instructions

### Community 36 - "Community 36"
Cohesion: 1.0
Nodes (1): npx serve Launch Command

### Community 37 - "Community 37"
Cohesion: 1.0
Nodes (1): Match Data Schema

### Community 38 - "Community 38"
Cohesion: 1.0
Nodes (1): Admin Password Guard Feature (v1.91)

### Community 39 - "Community 39"
Cohesion: 1.0
Nodes (1): Google Fonts (Bebas Neue, Barlow, Barlow Condensed)

### Community 40 - "Community 40"
Cohesion: 1.0
Nodes (1): equipos_tsc_60.csv Seed Data

### Community 41 - "Community 41"
Cohesion: 1.0
Nodes (1): HISTORIAL_TSC_v2.1.xlsx Historical Data

### Community 42 - "Community 42"
Cohesion: 1.0
Nodes (1): Rationale: IndexedDB Browser-Native (No Backend)

### Community 43 - "Community 43"
Cohesion: 1.0
Nodes (1): Rationale: Draft Phase Status Hides from Public

### Community 44 - "Community 44"
Cohesion: 1.0
Nodes (1): Rationale: Window Load Order is Critical

### Community 45 - "Community 45"
Cohesion: 1.0
Nodes (1): Drumroll Sound Effect

## Knowledge Gaps
- **44 isolated node(s):** `tc`, `Graph Statistics (291 nodes, 727 edges, 28 communities)`, `dbGetAll (77 edges God Node)`, `dbGet (51 edges God Node)`, `showToast (34 edges God Node)` (+39 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 28`** (2 nodes): `BRACKET Phase Config Schema`, `BRACKET Phase Type (Elimination)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 29`** (2 nodes): `PLAYOFF Phase Config Schema`, `PLAYOFF Phase Type (Aggregate Two-Leg)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 30`** (2 nodes): `LIGA Phase Config Schema`, `LIGA Phase Type (Group Stage)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 31`** (1 nodes): `firebase-config.example.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 32`** (1 nodes): `firebase-config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 33`** (1 nodes): `state.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 34`** (1 nodes): `convert.mjs`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 35`** (1 nodes): `Graphify Knowledge Graph Instructions`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 36`** (1 nodes): `npx serve Launch Command`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 37`** (1 nodes): `Match Data Schema`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 38`** (1 nodes): `Admin Password Guard Feature (v1.91)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 39`** (1 nodes): `Google Fonts (Bebas Neue, Barlow, Barlow Condensed)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 40`** (1 nodes): `equipos_tsc_60.csv Seed Data`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 41`** (1 nodes): `HISTORIAL_TSC_v2.1.xlsx Historical Data`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 42`** (1 nodes): `Rationale: IndexedDB Browser-Native (No Backend)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 43`** (1 nodes): `Rationale: Draft Phase Status Hides from Public`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 44`** (1 nodes): `Rationale: Window Load Order is Critical`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 45`** (1 nodes): `Drumroll Sound Effect`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `set()` connect `Community 0` to `Community 1`, `Community 2`, `Community 3`, `Community 4`, `Community 5`, `Community 6`, `Community 7`, `Community 8`, `Community 9`, `Community 10`, `Community 11`, `Community 13`, `Community 14`, `Community 15`, `Community 17`?**
  _High betweenness centrality (0.139) - this node is a cross-community bridge._
- **Why does `add()` connect `Community 0` to `Community 1`, `Community 2`, `Community 3`, `Community 4`, `Community 5`, `Community 6`, `Community 7`, `Community 8`, `Community 9`, `Community 10`, `Community 13`, `Community 14`, `Community 15`, `Community 24`?**
  _High betweenness centrality (0.106) - this node is a cross-community bridge._
- **Why does `copy()` connect `Community 0` to `Community 2`, `Community 3`, `Community 4`, `Community 5`, `Community 6`, `Community 8`, `Community 11`, `Community 12`, `Community 16`, `Community 17`?**
  _High betweenness centrality (0.068) - this node is a cross-community bridge._
- **Are the 4 inferred relationships involving `copy()` (e.g. with `.assignFinalMaterial()` and `ensureString()`) actually correct?**
  _`copy()` has 4 INFERRED edges - model-reasoned connections that need verification._
- **Are the 28 inferred relationships involving `set()` (e.g. with `.decodeGeometry()` and `._loadLight()`) actually correct?**
  _`set()` has 28 INFERRED edges - model-reasoned connections that need verification._
- **Are the 119 inferred relationships involving `dbGetAll()` (e.g. with `getTeamLogo()` and `renderBracket()`) actually correct?**
  _`dbGetAll()` has 119 INFERRED edges - model-reasoned connections that need verification._
- **Are the 85 inferred relationships involving `dbGet()` (e.g. with `renderBracket()` and `getStandingsForPhase()`) actually correct?**
  _`dbGet()` has 85 INFERRED edges - model-reasoned connections that need verification._