# Graph Report - .  (2026-10-20)

## Corpus Check
- solo AST

## Summary
- 1070 nodes · 2989 edges · 23 communities detected
- Extraction: 70% EXTRACTED · 30% INFERRED · 0% AMBIGUOUS · INFERRED: 899 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Config Cloudinary|Config Cloudinary]]
- [[_COMMUNITY_Equipos y animacion de UI|Equipos y animacion de UI]]
- [[_COMMUNITY_Calendario|Calendario]]
- [[_COMMUNITY_Push, ajustes y actualizador|Push, ajustes y actualizador]]
- [[_COMMUNITY_Perfil y panel del presidente|Perfil y panel del presidente]]
- [[_COMMUNITY_Bracket, partidos y playoff|Bracket, partidos y playoff]]
- [[_COMMUNITY_Auth y registro|Auth y registro]]
- [[_COMMUNITY_Tablas de posiciones|Tablas de posiciones]]
- [[_COMMUNITY_Sonido y efectos de partido|Sonido y efectos de partido]]
- [[_COMMUNITY_Historial y H2H|Historial y H2H]]
- [[_COMMUNITY_Selector de color|Selector de color]]
- [[_COMMUNITY_Navegacion y paginas publicas|Navegacion y paginas publicas]]
- [[_COMMUNITY_Config Firebase (ejemplo)|Config Firebase (ejemplo)]]
- [[_COMMUNITY_Export  import de datos|Export / import de datos]]
- [[_COMMUNITY_Capa de datos y fixture|Capa de datos y fixture]]
- [[_COMMUNITY_Bracket publico|Bracket publico]]
- [[_COMMUNITY_Config Firebase|Config Firebase]]
- [[_COMMUNITY_Estado global|Estado global]]
- [[_COMMUNITY_Promo APK|Promo APK]]
- [[_COMMUNITY_Competiciones|Competiciones]]
- [[_COMMUNITY_Palmares (Sala de Trofeos 3D)|Palmares (Sala de Trofeos 3D)]]
- [[_COMMUNITY_Sorteo en vivo|Sorteo en vivo]]
- [[_COMMUNITY_Community 22|Community 22]]

## God Nodes (most connected - your core abstractions)
1. `dbGetAll()` - 149 edges
2. `dbGet()` - 101 edges
3. `showToast()` - 98 edges
4. `dbPut()` - 58 edges
5. `dbErrorMsg()` - 33 edges
6. `dbAdd()` - 32 edges
7. `showConfirm()` - 29 edges
8. `invalidateStandingsAndSyncBrackets()` - 23 edges
9. `renderAdminPage()` - 22 edges
10. `getForSeason()` - 21 edges

## Surprising Connections (you probably didn't know these)
- `getTeamLogo()` --calls--> `dbGetAll()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\bracket.js → D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\db.js
- `deleteBracketMatch()` --calls--> `showConfirm()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\bracket.js → D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\ui-utils.js
- `_calCenterAnchorScroll()` --calls--> `_focusPublicSectionInner()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\calendar.js → D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\nav.js
- `_calInitHeroCountdown()` --calls--> `countdown()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\calendar.js → D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\motion.js
- `openBulkCoinsModal()` --calls--> `dbGetAll()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\coins.js → D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\db.js

## Communities

### Community 17 - "Config Cloudinary"
Cohesion: 0.36
Nodes (9): _apkIsNativeApp(), _apkShouldOffer(), _apkAlreadyDownloaded(), _apkClosedRecently(), openApkPromo(), _apkHideOverlay(), closeApkPromo(), tscApkDownloadClick() (+1 more)

### Community 6 - "Equipos y animacion de UI"
Cohesion: 0.07
Nodes (43): _authEsc(), _usersCol(), _injectAuthModal(), openAuthModal(), toggleAuthMode(), _renderAuthModalMode(), authForgotPassword(), authSubmit() (+35 more)

### Community 10 - "Calendario"
Cohesion: 0.07
Nodes (35): getWinner(), getTeamLogo(), hexToRgb(), rgbStr(), lighten(), Particle, spawnRocket(), loop() (+27 more)

### Community 7 - "Push, ajustes y actualizador"
Cohesion: 0.06
Nodes (43): teamLogoHtml(), _coinsAmount(), renderAdmCoins(), renderCoinsTable(), filterCoinsTable(), openCoinsModal(), updateCoinsPreview(), openBulkCoinsModal() (+35 more)

### Community 8 - "Perfil y panel del presidente"
Cohesion: 0.08
Nodes (39): _getAudioCtx(), resume(), _fwSoundOff(), _soundRocketLaunch(), _soundExplosion(), liveRadarStart(), _palmAudio(), _palmSoundOff() (+31 more)

### Community 0 - "Bracket, partidos y playoff"
Cohesion: 0.04
Nodes (166): renderBracket(), buildBracketRounds(), invalidateStandingsAndSyncBrackets(), openSlotRefModal(), saveSlotRef(), _bkRefPhaseEditable(), removeSlotRef(), rerenderPhaseFromRefTarget() (+158 more)

### Community 13 - "Auth y registro"
Cohesion: 0.13
Nodes (22): refBadgeHTML(), getCustomCriterionName(), openCriteriaModal(), closeCriteriaModal(), criteriaDragEnd(), criteriaDrop(), criteriaDropOnContainer(), criteriaDisable() (+14 more)

### Community 11 - "Tablas de posiciones"
Cohesion: 0.11
Nodes (34): _esc(), _calFormatDay(), _calTodayStr(), _calViewerTodayStr(), _calMatchInstant(), _calMatchTimeLocal(), _calLocalDateStr(), _calJornadaViewerDate() (+26 more)

### Community 5 - "Sonido y efectos de partido"
Cohesion: 0.06
Nodes (71): _calHeroGoH2H(), _histNorm(), _histResolveExactTeam(), _histResolveTeam(), computeResultado(), _esc(), loadStaticHistory(), seedHistoryIfEmpty() (+63 more)

### Community 3 - "Historial y H2H"
Cohesion: 0.06
Nodes (71): _calHeroGoComp(), _pubSwitchHistoryView(), liveStop(), liveSubscribe(), liveRadarStop(), liveRadarProximity(), getPublicScrollPages(), getMountedPublicPages() (+63 more)

### Community 18 - "Selector de color"
Cohesion: 1.0
Nodes (2): cloudReady(), uploadImageToCloud()

### Community 2 - "Navegacion y paginas publicas"
Cohesion: 0.04
Nodes (79): cloudReady(), uploadImageToCloud(), _pfEsc(), _pfPushEscLayer(), _pfPopEscLayer(), _pfCloseProfileModal(), _injectProfileModal(), _profileFocusables() (+71 more)

### Community 19 - "Config Firebase (ejemplo)"
Cohesion: 1.0
Nodes (0): 

### Community 15 - "Export / import de datos"
Cohesion: 0.18
Nodes (10): _sortComps(), closeCompModal(), _deletePhaseCascade(), openCompReorderModal(), _renderCompReorderList(), compReorderDragEnd(), compReorderDrop(), compReorderDropOnContainer() (+2 more)

### Community 9 - "Capa de datos y fixture"
Cohesion: 0.07
Nodes (41): resize(), frame(), wake(), stop(), setVariant(), getVariant(), init(), reduced() (+33 more)

### Community 12 - "Bracket publico"
Cohesion: 0.12
Nodes (32): _dataEsc(), renderAdmData(), renderDBInfo(), exportFullDB(), downloadJSON(), _dataBackupStores(), _dataTypeOk(), _dataValidateRecord() (+24 more)

### Community 20 - "Config Firebase"
Cohesion: 1.0
Nodes (0): 

### Community 21 - "Estado global"
Cohesion: 1.0
Nodes (0): 

### Community 16 - "Promo APK"
Cohesion: 0.2
Nodes (9): _fxScheduledCount(), _fxShuffle(), fxBuildRoundRobin(), fxBuildLuisRoute(), _fxBuildLuisRouteForLegs(), _fxGenerateCalendarAndRoute(), fxShuffleAgain(), renderFixtureGenModal() (+1 more)

### Community 14 - "Competiciones"
Cohesion: 0.19
Nodes (21): _histStdRowHTML(), _pbEsc(), _pbFmtDate(), _pbTeamMap(), _pbTeamPublic(), _pbTrophyHTML(), _pbWinBadge(), _pbBracketCards() (+13 more)

### Community 1 - "Palmares (Sala de Trofeos 3D)"
Cohesion: 0.03
Nodes (118): palmaresCompByKey(), getTrophyStyles(), _uid(), trophyClassica(), trophyImperial(), trophyKonami(), trophyOrejona(), trophySobria() (+110 more)

### Community 4 - "Sorteo en vivo"
Cohesion: 0.07
Nodes (70): newBomboId(), newBombo(), emptyState(), _journalCapturePhase(), effectiveDrawnIds(), ensureBC(), broadcast(), onBroadcast() (+62 more)

### Community 22 - "Community 22"
Cohesion: 1.0
Nodes (0): 

## Knowledge Gaps
- **Thin community `Config Firebase (ejemplo)`** (2 nodes): `color-picker.js`, `openColorPicker()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Config Firebase`** (1 nodes): `firebase-config.example.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Estado global`** (1 nodes): `firebase-config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 22`** (1 nodes): `state.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dbGetAll()` connect `Bracket, partidos y playoff` to `Palmares (Sala de Trofeos 3D)`, `Historial y H2H`, `Sorteo en vivo`, `Sonido y efectos de partido`, `Equipos y animacion de UI`, `Push, ajustes y actualizador`, `Capa de datos y fixture`, `Calendario`, `Tablas de posiciones`, `Bracket publico`, `Competiciones`?**
  _High betweenness centrality (0.260) - this node is a cross-community bridge._
- **Why does `showToast()` connect `Bracket, partidos y playoff` to `Palmares (Sala de Trofeos 3D)`, `Navegacion y paginas publicas`, `Historial y H2H`, `Sorteo en vivo`, `Sonido y efectos de partido`, `Equipos y animacion de UI`, `Push, ajustes y actualizador`, `Calendario`, `Tablas de posiciones`, `Bracket publico`, `Auth y registro`?**
  _High betweenness centrality (0.194) - this node is a cross-community bridge._
- **Why does `dbGet()` connect `Bracket, partidos y playoff` to `Palmares (Sala de Trofeos 3D)`, `Navegacion y paginas publicas`, `Historial y H2H`, `Sorteo en vivo`, `Push, ajustes y actualizador`, `Calendario`, `Tablas de posiciones`, `Bracket publico`, `Auth y registro`, `Competiciones`?**
  _High betweenness centrality (0.117) - this node is a cross-community bridge._
- **Are the 142 inferred relationships involving `dbGetAll()` (e.g. with `getTeamLogo()` and `renderBracket()`) actually correct?**
  _`dbGetAll()` has 142 INFERRED edges - model-reasoned connections that need verification._
- **Are the 97 inferred relationships involving `dbGet()` (e.g. with `renderBracket()` and `getStandingsForPhase()`) actually correct?**
  _`dbGet()` has 97 INFERRED edges - model-reasoned connections that need verification._
- **Are the 94 inferred relationships involving `showToast()` (e.g. with `authForgotPassword()` and `authSignOut()`) actually correct?**
  _`showToast()` has 94 INFERRED edges - model-reasoned connections that need verification._
- **Are the 54 inferred relationships involving `dbPut()` (e.g. with `_syncBracketSlotsForSourcePhase()` and `_syncOwnBracketRounds()`) actually correct?**
  _`dbPut()` has 54 INFERRED edges - model-reasoned connections that need verification._