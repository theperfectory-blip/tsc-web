# Graph Report - C:\Users\Administrator\Downloads\tsc.web\tsc-src  (2026-05-13)

## Corpus Check
- 20 files · ~175,088 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 387 nodes · 991 edges · 30 communities detected
- Extraction: 67% EXTRACTED · 33% INFERRED · 0% AMBIGUOUS · INFERRED: 326 edges (avg confidence: 0.8)
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

## God Nodes (most connected - your core abstractions)
1. `dbGetAll()` - 87 edges
2. `dbGet()` - 57 edges
3. `showToast()` - 38 edges
4. `dbPut()` - 30 edges
5. `dbAdd()` - 19 edges
6. `activeBombo()` - 17 edges
7. `renderAdminPage()` - 16 edges
8. `renderBracket()` - 15 edges
9. `refreshActive()` - 14 edges
10. `getForSeason()` - 12 edges

## Surprising Connections (you probably didn't know these)
- `getTeamLogo()` --calls--> `dbGetAll()`  [INFERRED]
  C:\Users\Administrator\Downloads\tsc.web\tsc-src\js\bracket.js → C:\Users\Administrator\Downloads\tsc.web\tsc-src\js\db.js
- `openBulkCoinsModal()` --calls--> `dbGetAll()`  [INFERRED]
  C:\Users\Administrator\Downloads\tsc.web\tsc-src\js\coins.js → C:\Users\Administrator\Downloads\tsc.web\tsc-src\js\db.js
- `openPalmaresAddModal()` --calls--> `dbGetAll()`  [INFERRED]
  C:\Users\Administrator\Downloads\tsc.web\tsc-src\js\palmares.js → C:\Users\Administrator\Downloads\tsc.web\tsc-src\js\db.js
- `dbGetAll()` --calls--> `openSeasonModal()`  [INFERRED]
  C:\Users\Administrator\Downloads\tsc.web\tsc-src\js\db.js → C:\Users\Administrator\Downloads\tsc.web\tsc-src\js\seasons.js
- `dbGet()` --calls--> `openTeamModal()`  [INFERRED]
  C:\Users\Administrator\Downloads\tsc.web\tsc-src\js\db.js → C:\Users\Administrator\Downloads\tsc.web\tsc-src\js\teams.js

## Hyperedges (group relationships)
- **Tournament Phase Type â†’ Config Schema â†’ Render Function Pipeline** — phase_type_liga, data_phase_config_liga, fn_renderligastandings [EXTRACTED 0.95]
- **IndexedDB CRUD Layer: dbAdd/dbPut/dbGet/dbDelete** — fn_dbadd, fn_dbput, fn_dbget, fn_dbdelete, fn_dbgetall [EXTRACTED 1.00]
- **App Initialization: initDB â†’ seedData â†’ loadSeasons â†’ setMode** — fn_initdb, fn_seedinitialdata, fn_loadseasons, fn_setmode [EXTRACTED 1.00]

## Communities

### Community 0 - "Community 0"
Cohesion: 0.08
Nodes (63): buildBracketRounds(), buildBracketSlots(), getClassifiedFromPhase(), getStandingsForPhase(), openBracketMatchModal(), openSlotRefModal(), refLabel(), resolveSlotRef() (+55 more)

### Community 1 - "Community 1"
Cohesion: 0.1
Nodes (47): invalidateStandingsCache(), activeBombo(), addBombo(), assignBracketLink(), assignLink(), broadcast(), clearLink(), deleteActiveBombo() (+39 more)

### Community 2 - "Community 2"
Cohesion: 0.08
Nodes (26): _cleanup(), closeBracketMatchModal(), _getAudioCtx(), getPlayoffMatchupsCount(), getTeamLogo(), getWinner(), hexToRgb(), lighten() (+18 more)

### Community 3 - "Community 3"
Cohesion: 0.09
Nodes (36): deleteBracketMatch(), closeCompModal(), deleteComp(), renderAdmComps(), renderCompsGrid(), saveComp(), downloadJSON(), exportFullDB() (+28 more)

### Community 4 - "Community 4"
Cohesion: 0.14
Nodes (32): _applyFilters(), _classifyOutcomeFIFA(), _computeHistoricalStandings(), computeResultado(), _currentHistContainer(), _esc(), exportHistoryToExcel(), _getResolvedRecords() (+24 more)

### Community 5 - "Community 5"
Cohesion: 0.13
Nodes (28): getForSeason(), renderAdmMatches(), goAdminPage(), goPublicPage(), onSeasonChange(), refreshSorteoTabVisibility(), renderAdmDashboard(), renderAdminPage() (+20 more)

### Community 6 - "Community 6"
Cohesion: 0.16
Nodes (20): addPalmaresRecord(), aggregatePalmaresByTeam(), closePalmaresModals(), deletePalmaresRecord(), _esc(), _escAttr(), getAllPalmaresRecords(), openPalmaresAddModal() (+12 more)

### Community 7 - "Community 7"
Cohesion: 0.16
Nodes (18): addCriterion(), addToGroup(), calcGroupStandings(), closeCriteriaModal(), closeGroupAssignModal(), criteriaDrop(), filterAssignTeams(), getCriteria() (+10 more)

### Community 8 - "Community 8"
Cohesion: 0.16
Nodes (9): closeTeamModal(), filterPubTeams(), filterTeamsTable(), openTeamModal(), renderAdmTeams(), renderPubTeams(), renderPubTeamsGrid(), renderTeamsTable() (+1 more)

### Community 9 - "Community 9"
Cohesion: 0.32
Nodes (11): toggleSound(), brassNote(), crash(), getCtx(), noiseBuffer(), playDrumRoll(), playSnare(), playTada() (+3 more)

### Community 10 - "Community 10"
Cohesion: 0.31
Nodes (9): closeCoinsModal(), filterCoinsTable(), openBulkCoinsModal(), openCoinsModal(), renderAdmCoins(), renderCoinsTable(), saveBulkCoins(), saveCoinsTransaction() (+1 more)

### Community 11 - "Community 11"
Cohesion: 0.7
Nodes (4): pubSelectComp(), pubSelectPhase(), pubShowMatchesGroup(), renderPubPanel()

### Community 12 - "Community 12"
Cohesion: 0.5
Nodes (4): Team Data Schema, YuNaCoin Virtual Currency, Dual Team Colors Feature (v1.9), Rationale: Dual Team Colors Added in v1.9

### Community 13 - "Community 13"
Cohesion: 0.67
Nodes (3): TSC Admin Code Map v1.9, Rationale: Single-File Monolithic Architecture, TSC Tournament Administration App

### Community 14 - "Community 14"
Cohesion: 1.0
Nodes (0): 

### Community 15 - "Community 15"
Cohesion: 1.0
Nodes (2): BRACKET Phase Config Schema, BRACKET Phase Type (Elimination)

### Community 16 - "Community 16"
Cohesion: 1.0
Nodes (2): LIGA Phase Config Schema, LIGA Phase Type (Group Stage)

### Community 17 - "Community 17"
Cohesion: 1.0
Nodes (2): PLAYOFF Phase Config Schema, PLAYOFF Phase Type (Aggregate Two-Leg)

### Community 18 - "Community 18"
Cohesion: 1.0
Nodes (0): 

### Community 19 - "Community 19"
Cohesion: 1.0
Nodes (1): Graphify Knowledge Graph Instructions

### Community 20 - "Community 20"
Cohesion: 1.0
Nodes (1): npx serve Launch Command

### Community 21 - "Community 21"
Cohesion: 1.0
Nodes (1): Match Data Schema

### Community 22 - "Community 22"
Cohesion: 1.0
Nodes (1): Sorteo Lottery Animation Feature

### Community 23 - "Community 23"
Cohesion: 1.0
Nodes (1): Admin Password Guard Feature (v1.91)

### Community 24 - "Community 24"
Cohesion: 1.0
Nodes (1): Google Fonts (Bebas Neue, Barlow, Barlow Condensed)

### Community 25 - "Community 25"
Cohesion: 1.0
Nodes (1): equipos_tsc_60.csv Seed Data

### Community 26 - "Community 26"
Cohesion: 1.0
Nodes (1): HISTORIAL_TSC_v2.1.xlsx Historical Data

### Community 27 - "Community 27"
Cohesion: 1.0
Nodes (1): Rationale: IndexedDB Browser-Native (No Backend)

### Community 28 - "Community 28"
Cohesion: 1.0
Nodes (1): Rationale: Draft Phase Status Hides from Public

### Community 29 - "Community 29"
Cohesion: 1.0
Nodes (1): Rationale: Window Load Order is Critical

## Knowledge Gaps
- **21 isolated node(s):** `Graphify Knowledge Graph Instructions`, `TSC Admin Code Map v1.9`, `npx serve Launch Command`, `LIGA Phase Type (Group Stage)`, `BRACKET Phase Type (Elimination)` (+16 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 14`** (2 nodes): `color-picker.js`, `openColorPicker()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 15`** (2 nodes): `BRACKET Phase Config Schema`, `BRACKET Phase Type (Elimination)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 16`** (2 nodes): `LIGA Phase Config Schema`, `LIGA Phase Type (Group Stage)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 17`** (2 nodes): `PLAYOFF Phase Config Schema`, `PLAYOFF Phase Type (Aggregate Two-Leg)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 18`** (1 nodes): `state.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 19`** (1 nodes): `Graphify Knowledge Graph Instructions`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 20`** (1 nodes): `npx serve Launch Command`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 21`** (1 nodes): `Match Data Schema`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 22`** (1 nodes): `Sorteo Lottery Animation Feature`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 23`** (1 nodes): `Admin Password Guard Feature (v1.91)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 24`** (1 nodes): `Google Fonts (Bebas Neue, Barlow, Barlow Condensed)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 25`** (1 nodes): `equipos_tsc_60.csv Seed Data`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 26`** (1 nodes): `HISTORIAL_TSC_v2.1.xlsx Historical Data`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 27`** (1 nodes): `Rationale: IndexedDB Browser-Native (No Backend)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 28`** (1 nodes): `Rationale: Draft Phase Status Hides from Public`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 29`** (1 nodes): `Rationale: Window Load Order is Critical`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dbGetAll()` connect `Community 0` to `Community 1`, `Community 2`, `Community 3`, `Community 4`, `Community 5`, `Community 6`, `Community 7`, `Community 8`, `Community 10`, `Community 11`?**
  _High betweenness centrality (0.342) - this node is a cross-community bridge._
- **Why does `dbGet()` connect `Community 0` to `Community 1`, `Community 2`, `Community 3`, `Community 5`, `Community 6`, `Community 7`, `Community 8`, `Community 10`, `Community 11`?**
  _High betweenness centrality (0.137) - this node is a cross-community bridge._
- **Why does `showToast()` connect `Community 3` to `Community 0`, `Community 1`, `Community 2`, `Community 4`, `Community 5`, `Community 6`, `Community 7`, `Community 8`, `Community 10`?**
  _High betweenness centrality (0.092) - this node is a cross-community bridge._
- **Are the 85 inferred relationships involving `dbGetAll()` (e.g. with `getTeamLogo()` and `renderBracket()`) actually correct?**
  _`dbGetAll()` has 85 INFERRED edges - model-reasoned connections that need verification._
- **Are the 56 inferred relationships involving `dbGet()` (e.g. with `renderBracket()` and `getStandingsForPhase()`) actually correct?**
  _`dbGet()` has 56 INFERRED edges - model-reasoned connections that need verification._
- **Are the 35 inferred relationships involving `showToast()` (e.g. with `saveSlotRef()` and `removeSlotRef()`) actually correct?**
  _`showToast()` has 35 INFERRED edges - model-reasoned connections that need verification._
- **Are the 29 inferred relationships involving `dbPut()` (e.g. with `saveSlotRef()` and `removeSlotRef()`) actually correct?**
  _`dbPut()` has 29 INFERRED edges - model-reasoned connections that need verification._