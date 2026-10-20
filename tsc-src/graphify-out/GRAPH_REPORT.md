# Graph Report - .  (2026-10-20)

## Corpus Check
- solo AST

## Summary
- 1054 nodes · 2945 edges · 23 communities detected
- Extraction: 70% EXTRACTED · 30% INFERRED · 0% AMBIGUOUS · INFERRED: 871 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Config Cloudinary|Config Cloudinary]]
- [[_COMMUNITY_Sonido y efectos de partido|Sonido y efectos de partido]]
- [[_COMMUNITY_Equipos y animacion de UI|Equipos y animacion de UI]]
- [[_COMMUNITY_Push, ajustes y actualizador|Push, ajustes y actualizador]]
- [[_COMMUNITY_Perfil y panel del presidente|Perfil y panel del presidente]]
- [[_COMMUNITY_Competiciones|Competiciones]]
- [[_COMMUNITY_Bracket, partidos y playoff|Bracket, partidos y playoff]]
- [[_COMMUNITY_Bracket publico|Bracket publico]]
- [[_COMMUNITY_Tablas de posiciones|Tablas de posiciones]]
- [[_COMMUNITY_Navegacion y paginas publicas|Navegacion y paginas publicas]]
- [[_COMMUNITY_Selector de color|Selector de color]]
- [[_COMMUNITY_Config Firebase (ejemplo)|Config Firebase (ejemplo)]]
- [[_COMMUNITY_Auth y registro|Auth y registro]]
- [[_COMMUNITY_Promo APK|Promo APK]]
- [[_COMMUNITY_Historial y H2H|Historial y H2H]]
- [[_COMMUNITY_Config Firebase|Config Firebase]]
- [[_COMMUNITY_Estado global|Estado global]]
- [[_COMMUNITY_Calendario|Calendario]]
- [[_COMMUNITY_Sorteo en vivo|Sorteo en vivo]]
- [[_COMMUNITY_Palmares (Sala de Trofeos 3D)|Palmares (Sala de Trofeos 3D)]]
- [[_COMMUNITY_Export  import de datos|Export / import de datos]]
- [[_COMMUNITY_Capa de datos y fixture|Capa de datos y fixture]]
- [[_COMMUNITY_Community 22|Community 22]]

## God Nodes (most connected - your core abstractions)
1. `dbGetAll()` - 145 edges
2. `dbGet()` - 99 edges
3. `showToast()` - 93 edges
4. `dbPut()` - 59 edges
5. `dbAdd()` - 32 edges
6. `dbErrorMsg()` - 29 edges
7. `showConfirm()` - 24 edges
8. `invalidateStandingsAndSyncBrackets()` - 23 edges
9. `renderAdminPage()` - 22 edges
10. `getForSeason()` - 21 edges

## Surprising Connections (you probably didn't know these)
- `getTeamLogo()` --calls--> `dbGetAll()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\bracket.js → D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\db.js
- `deleteBracketMatch()` --calls--> `showConfirm()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\bracket.js → D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\ui-utils.js
- `notifyStreamTodayClick()` --calls--> `showConfirm()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\calendar.js → D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\ui-utils.js
- `_calCenterAnchorScroll()` --calls--> `_focusPublicSectionInner()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\calendar.js → D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\nav.js
- `_calInitHeroCountdown()` --calls--> `countdown()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\calendar.js → D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\motion.js

## Communities

### Community 17 - "Config Cloudinary"
Cohesion: 0.36
Nodes (9): _apkIsNativeApp(), _apkShouldOffer(), _apkAlreadyDownloaded(), _apkClosedRecently(), openApkPromo(), _apkHideOverlay(), closeApkPromo(), tscApkDownloadClick() (+1 more)

### Community 5 - "Sonido y efectos de partido"
Cohesion: 0.05
Nodes (63): _authEsc(), _usersCol(), _injectAuthModal(), openAuthModal(), toggleAuthMode(), _renderAuthModalMode(), authForgotPassword(), authSubmit() (+55 more)

### Community 6 - "Equipos y animacion de UI"
Cohesion: 0.07
Nodes (50): getWinner(), getTeamLogo(), hexToRgb(), rgbStr(), lighten(), Particle, spawnRocket(), loop() (+42 more)

### Community 7 - "Push, ajustes y actualizador"
Cohesion: 0.06
Nodes (46): teamLogoHtml(), cloudReady(), uploadImageToCloud(), _coinsAmount(), renderAdmCoins(), renderCoinsTable(), filterCoinsTable(), openCoinsModal() (+38 more)

### Community 8 - "Perfil y panel del presidente"
Cohesion: 0.08
Nodes (41): _getAudioCtx(), resume(), _fwSoundOff(), _soundRocketLaunch(), _soundExplosion(), liveRadarStart(), liveRadarProximity(), _palmAudio() (+33 more)

### Community 14 - "Competiciones"
Cohesion: 0.17
Nodes (22): Rocket, dbErrorMsg(), loadSeasons(), renderAdmSeasons(), saveSeasonModal(), _applySeasonSwitch(), switchToSeason(), confirmFinalizeSeason() (+14 more)

### Community 0 - "Bracket, partidos y playoff"
Cohesion: 0.04
Nodes (141): invalidateStandingsAndSyncBrackets(), openSlotRefModal(), calClearSchedule(), _calDoSaveDayLabel(), _coinsRun(), _coinsSeasonLocked(), saveCoinsTransaction(), openCoinsHistory() (+133 more)

### Community 12 - "Bracket publico"
Cohesion: 0.11
Nodes (27): refBadgeHTML(), renderAdmCalendar(), getCriteria(), getCustomCriterionName(), calcGroupStandings(), renderGroupTable(), openCriteriaModal(), closeCriteriaModal() (+19 more)

### Community 11 - "Tablas de posiciones"
Cohesion: 0.11
Nodes (33): _esc(), _calFormatDay(), _calTodayStr(), _calViewerTodayStr(), _calMatchInstant(), _calMatchTimeLocal(), _calLocalDateStr(), _calJornadaViewerDate() (+25 more)

### Community 2 - "Navegacion y paginas publicas"
Cohesion: 0.06
Nodes (75): _calHeroGoComp(), _sortComps(), _pubSwitchHistoryView(), liveStop(), liveSubscribe(), liveRadarStop(), getPublicScrollPages(), getMountedPublicPages() (+67 more)

### Community 18 - "Selector de color"
Cohesion: 1.0
Nodes (2): cloudReady(), uploadImageToCloud()

### Community 19 - "Config Firebase (ejemplo)"
Cohesion: 1.0
Nodes (0): 

### Community 13 - "Auth y registro"
Cohesion: 0.12
Nodes (24): resize(), frame(), wake(), stop(), setVariant(), getVariant(), init(), reduced() (+16 more)

### Community 16 - "Promo APK"
Cohesion: 0.27
Nodes (11): _dataEsc(), renderAdmData(), renderDBInfo(), exportFullDB(), downloadJSON(), _dataBackupStores(), _dataValidateRecord(), _dataValidateStoreItems() (+3 more)

### Community 3 - "Historial y H2H"
Cohesion: 0.06
Nodes (73): dbMirrorInvalidate(), newBomboId(), newBombo(), emptyState(), _journalCapturePhase(), _journalCaptureMatches(), effectiveDrawnIds(), ensureBC() (+65 more)

### Community 20 - "Config Firebase"
Cohesion: 1.0
Nodes (0): 

### Community 21 - "Estado global"
Cohesion: 1.0
Nodes (0): 

### Community 10 - "Calendario"
Cohesion: 0.07
Nodes (35): _fxScheduledCount(), _fxShuffle(), fxBuildRoundRobin(), fxBuildLuisRoute(), _fxBuildLuisRouteForLegs(), _fxGenerateCalendarAndRoute(), fxGroupLockReason(), openFixtureGenModal() (+27 more)

### Community 4 - "Sorteo en vivo"
Cohesion: 0.06
Nodes (71): _histNorm(), _histResolveExactTeam(), _histResolveTeam(), computeResultado(), _esc(), loadStaticHistory(), seedHistoryIfEmpty(), refreshHistoryForSeason() (+63 more)

### Community 1 - "Palmares (Sala de Trofeos 3D)"
Cohesion: 0.04
Nodes (116): palmaresCompByKey(), getTrophyStyles(), _uid(), trophyClassica(), trophyImperial(), trophyKonami(), trophyOrejona(), trophySobria() (+108 more)

### Community 15 - "Export / import de datos"
Cohesion: 0.21
Nodes (19): _pbEsc(), _pbFmtDate(), _pbTeamMap(), _pbTeamPublic(), _pbTrophyHTML(), _pbWinBadge(), _pbBracketCards(), _pbCrestMini() (+11 more)

### Community 9 - "Capa de datos y fixture"
Cohesion: 0.07
Nodes (45): _plugin(), isEnabled(), _clearToken(), _setPendingTokenRemoval(), _clearPendingTokenRemoval(), _pushDocRef(), _currentTimezone(), _syncTokenToFirestore() (+37 more)

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

- **Why does `dbGetAll()` connect `Bracket, partidos y playoff` to `Palmares (Sala de Trofeos 3D)`, `Navegacion y paginas publicas`, `Historial y H2H`, `Sorteo en vivo`, `Equipos y animacion de UI`, `Push, ajustes y actualizador`, `Calendario`, `Tablas de posiciones`, `Bracket publico`, `Competiciones`, `Export / import de datos`, `Promo APK`?**
  _High betweenness centrality (0.262) - this node is a cross-community bridge._
- **Why does `showToast()` connect `Bracket, partidos y playoff` to `Palmares (Sala de Trofeos 3D)`, `Navegacion y paginas publicas`, `Historial y H2H`, `Sorteo en vivo`, `Sonido y efectos de partido`, `Equipos y animacion de UI`, `Push, ajustes y actualizador`, `Capa de datos y fixture`, `Calendario`, `Bracket publico`, `Competiciones`, `Promo APK`?**
  _High betweenness centrality (0.197) - this node is a cross-community bridge._
- **Why does `dbGet()` connect `Bracket, partidos y playoff` to `Palmares (Sala de Trofeos 3D)`, `Navegacion y paginas publicas`, `Historial y H2H`, `Sonido y efectos de partido`, `Equipos y animacion de UI`, `Push, ajustes y actualizador`, `Calendario`, `Tablas de posiciones`, `Bracket publico`, `Export / import de datos`?**
  _High betweenness centrality (0.124) - this node is a cross-community bridge._
- **Are the 138 inferred relationships involving `dbGetAll()` (e.g. with `getTeamLogo()` and `renderBracket()`) actually correct?**
  _`dbGetAll()` has 138 INFERRED edges - model-reasoned connections that need verification._
- **Are the 95 inferred relationships involving `dbGet()` (e.g. with `renderBracket()` and `getStandingsForPhase()`) actually correct?**
  _`dbGet()` has 95 INFERRED edges - model-reasoned connections that need verification._
- **Are the 89 inferred relationships involving `showToast()` (e.g. with `authForgotPassword()` and `authSignOut()`) actually correct?**
  _`showToast()` has 89 INFERRED edges - model-reasoned connections that need verification._
- **Are the 55 inferred relationships involving `dbPut()` (e.g. with `_syncBracketSlotsForSourcePhase()` and `_syncOwnBracketRounds()`) actually correct?**
  _`dbPut()` has 55 INFERRED edges - model-reasoned connections that need verification._