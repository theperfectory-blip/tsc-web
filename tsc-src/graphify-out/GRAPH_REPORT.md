# Graph Report - .  (2026-10-20)

## Corpus Check
- solo AST

## Summary
- 1075 nodes · 2970 edges · 24 communities detected
- Extraction: 69% EXTRACTED · 31% INFERRED · 0% AMBIGUOUS · INFERRED: 925 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Promo APK|Promo APK]]
- [[_COMMUNITY_Perfil del presidente|Perfil del presidente]]
- [[_COMMUNITY_Splash de arranque|Splash de arranque]]
- [[_COMMUNITY_Bracket|Bracket]]
- [[_COMMUNITY_Bracket publico|Bracket publico]]
- [[_COMMUNITY_Sonido|Sonido]]
- [[_COMMUNITY_YuNaCoins y Usuarios (admin)|YuNaCoins y Usuarios (admin)]]
- [[_COMMUNITY_Partidos|Partidos]]
- [[_COMMUNITY_Tablas de posiciones|Tablas de posiciones]]
- [[_COMMUNITY_Calendario|Calendario]]
- [[_COMMUNITY_Historial y H2H|Historial y H2H]]
- [[_COMMUNITY_Navegacion|Navegacion]]
- [[_COMMUNITY_Config Cloudinary (ejemplo)|Config Cloudinary (ejemplo)]]
- [[_COMMUNITY_Equipos|Equipos]]
- [[_COMMUNITY_Competiciones|Competiciones]]
- [[_COMMUNITY_Push y Ajustes y arranque|Push y Ajustes y arranque]]
- [[_COMMUNITY_Capa de datos|Capa de datos]]
- [[_COMMUNITY_Delegacion de eventos|Delegacion de eventos]]
- [[_COMMUNITY_Config Firebase (ejemplo)|Config Firebase (ejemplo)]]
- [[_COMMUNITY_Config Firebase|Config Firebase]]
- [[_COMMUNITY_Generador de fechas|Generador de fechas]]
- [[_COMMUNITY_Palmares (Sala de Trofeos 3D)|Palmares (Sala de Trofeos 3D)]]
- [[_COMMUNITY_Sorteo en vivo|Sorteo en vivo]]
- [[_COMMUNITY_Estado global|Estado global]]

## God Nodes (most connected - your core abstractions)
1. `dbGetAll()` - 139 edges
2. `showToast()` - 97 edges
3. `dbGet()` - 93 edges
4. `escHtml()` - 69 edges
5. `dbPut()` - 56 edges
6. `dbErrorMsg()` - 34 edges
7. `dbAdd()` - 31 edges
8. `showConfirm()` - 29 edges
9. `invalidateStandingsAndSyncBrackets()` - 22 edges
10. `renderAdminPage()` - 22 edges

## Surprising Connections (you probably didn't know these)
- `deleteBracketMatch()` --calls--> `showConfirm()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\bracket.js → D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\ui-utils.js
- `_calCenterAnchorScroll()` --calls--> `_focusPublicSectionInner()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\calendar.js → D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\nav.js
- `_calInitHeroCountdown()` --calls--> `countdown()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\calendar.js → D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\motion.js
- `openBulkCoinsModal()` --calls--> `dbGetAll()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\coins.js → D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\db.js
- `dbGetAll()` --calls--> `_palmDuplicate()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\db.js → D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\palmares.js

## Communities

### Community 18 - "Promo APK"
Cohesion: 0.36
Nodes (9): _apkIsNativeApp(), _apkShouldOffer(), _apkAlreadyDownloaded(), _apkClosedRecently(), openApkPromo(), _apkHideOverlay(), closeApkPromo(), tscApkDownloadClick() (+1 more)

### Community 4 - "Perfil del presidente"
Cohesion: 0.05
Nodes (63): _usersCol(), _injectAuthModal(), openAuthModal(), toggleAuthMode(), _renderAuthModalMode(), authForgotPassword(), authSubmit(), _authErrorMsg() (+55 more)

### Community 19 - "Splash de arranque"
Cohesion: 0.4
Nodes (0): 

### Community 10 - "Bracket"
Cohesion: 0.08
Nodes (38): getWinner(), hexToRgb(), rgbStr(), lighten(), Particle, spawnRocket(), loop(), _cleanup() (+30 more)

### Community 12 - "Bracket publico"
Cohesion: 0.11
Nodes (34): teamLogoHtml(), _calLogo(), openCompModal(), _histStdRowHTML(), loadPalmaresComps(), createNewCopa(), openPhaseModal(), openPlayoffLegModal() (+26 more)

### Community 9 - "Sonido"
Cohesion: 0.09
Nodes (38): _getAudioCtx(), resume(), _fwSoundOff(), _soundRocketLaunch(), _soundExplosion(), liveRadarStart(), _palmAudio(), _palmSoundOff() (+30 more)

### Community 14 - "YuNaCoins y Usuarios (admin)"
Cohesion: 0.15
Nodes (16): Rocket, _coinsAmount(), renderAdmCoins(), renderCoinsTable(), filterCoinsTable(), openCoinsModal(), updateCoinsPreview(), openBulkCoinsModal() (+8 more)

### Community 0 - "Partidos"
Cohesion: 0.04
Nodes (165): invalidateStandingsAndSyncBrackets(), openSlotRefModal(), _readRefSourceFromModal(), saveSlotRef(), _bkRefPhaseEditable(), removeSlotRef(), rerenderPhaseFromRefTarget(), _calSeasonLocked() (+157 more)

### Community 13 - "Tablas de posiciones"
Cohesion: 0.13
Nodes (22): refBadgeHTML(), openCriteriaModal(), closeCriteriaModal(), criteriaDragEnd(), criteriaDrop(), criteriaDropOnContainer(), criteriaDisable(), criteriaRestore() (+14 more)

### Community 5 - "Calendario"
Cohesion: 0.07
Nodes (54): _calFormatDay(), _calTodayStr(), _calViewerTodayStr(), _calMatchInstant(), _calMatchTimeLocal(), _calLocalDateStr(), _calJornadaViewerDate(), _calWhenError() (+46 more)

### Community 3 - "Historial y H2H"
Cohesion: 0.06
Nodes (71): _calHeroGoH2H(), dbIsArchivedSeason(), _histNorm(), _histResolveExactTeam(), _histResolveTeam(), computeResultado(), loadStaticHistory(), seedHistoryIfEmpty() (+63 more)

### Community 6 - "Navegacion"
Cohesion: 0.08
Nodes (53): _calHeroGoComp(), liveStop(), liveSubscribe(), liveRadarStop(), getPublicScrollPages(), getMountedPublicPages(), _isPublicScrollPage(), _syncPublicNavigation() (+45 more)

### Community 20 - "Config Cloudinary (ejemplo)"
Cohesion: 1.0
Nodes (2): cloudReady(), uploadImageToCloud()

### Community 8 - "Equipos"
Cohesion: 0.06
Nodes (44): cloudReady(), uploadImageToCloud(), resize(), frame(), wake(), stop(), setVariant(), init() (+36 more)

### Community 15 - "Competiciones"
Cohesion: 0.18
Nodes (10): openColorPicker(), _sortComps(), _compPickColor(), closeCompModal(), openCompReorderModal(), _renderCompReorderList(), compReorderDragEnd(), compReorderDrop() (+2 more)

### Community 7 - "Push y Ajustes y arranque"
Cohesion: 0.06
Nodes (48): getVariant(), _plugin(), isEnabled(), _clearToken(), _setPendingTokenRemoval(), _clearPendingTokenRemoval(), _pushDocRef(), _currentTimezone() (+40 more)

### Community 11 - "Capa de datos"
Cohesion: 0.09
Nodes (39): renderAdmData(), renderDBInfo(), exportFullDB(), downloadJSON(), _dataBackupStores(), _dataTypeOk(), _dataValidateRecord(), _dataValidateStoreItems() (+31 more)

### Community 17 - "Delegacion de eventos"
Cohesion: 0.2
Nodes (6): _onTokens(), _onParse(), _onIsNative(), _onEventFor(), _onResolve(), _onRun()

### Community 21 - "Config Firebase (ejemplo)"
Cohesion: 1.0
Nodes (0): 

### Community 22 - "Config Firebase"
Cohesion: 1.0
Nodes (0): 

### Community 16 - "Generador de fechas"
Cohesion: 0.2
Nodes (9): _fxScheduledCount(), _fxShuffle(), fxBuildRoundRobin(), fxBuildLuisRoute(), _fxBuildLuisRouteForLegs(), _fxGenerateCalendarAndRoute(), fxShuffleAgain(), renderFixtureGenModal() (+1 more)

### Community 1 - "Palmares (Sala de Trofeos 3D)"
Cohesion: 0.03
Nodes (117): getTrophyStyles(), _uid(), trophyClassica(), trophyImperial(), trophyKonami(), trophyOrejona(), trophySobria(), trophyModerno() (+109 more)

### Community 2 - "Sorteo en vivo"
Cohesion: 0.06
Nodes (70): newBomboId(), newBombo(), emptyState(), _journalCapturePhase(), effectiveDrawnIds(), ensureBC(), broadcast(), onBroadcast() (+62 more)

### Community 23 - "Estado global"
Cohesion: 1.0
Nodes (0): 

## Knowledge Gaps
- **Thin community `Config Firebase (ejemplo)`** (1 nodes): `firebase-config.example.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Config Firebase`** (1 nodes): `firebase-config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Estado global`** (1 nodes): `state.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dbGetAll()` connect `Partidos` to `Palmares (Sala de Trofeos 3D)`, `Sorteo en vivo`, `Historial y H2H`, `Calendario`, `Navegacion`, `Equipos`, `Bracket`, `Capa de datos`, `Bracket publico`, `Tablas de posiciones`, `YuNaCoins y Usuarios (admin)`?**
  _High betweenness centrality (0.243) - this node is a cross-community bridge._
- **Why does `showToast()` connect `Partidos` to `Palmares (Sala de Trofeos 3D)`, `Sorteo en vivo`, `Historial y H2H`, `Perfil del presidente`, `Calendario`, `Navegacion`, `Push y Ajustes y arranque`, `Equipos`, `Bracket`, `Capa de datos`, `Tablas de posiciones`, `YuNaCoins y Usuarios (admin)`?**
  _High betweenness centrality (0.145) - this node is a cross-community bridge._
- **Why does `escHtml()` connect `Bracket publico` to `Partidos`, `Palmares (Sala de Trofeos 3D)`, `Sorteo en vivo`, `Historial y H2H`, `Perfil del presidente`, `Calendario`, `Navegacion`, `Push y Ajustes y arranque`, `Equipos`, `Bracket`, `Capa de datos`, `Tablas de posiciones`, `YuNaCoins y Usuarios (admin)`?**
  _High betweenness centrality (0.111) - this node is a cross-community bridge._
- **Are the 136 inferred relationships involving `dbGetAll()` (e.g. with `renderBracket()` and `getStandingsForPhase()`) actually correct?**
  _`dbGetAll()` has 136 INFERRED edges - model-reasoned connections that need verification._
- **Are the 93 inferred relationships involving `showToast()` (e.g. with `authForgotPassword()` and `authSignOut()`) actually correct?**
  _`showToast()` has 93 INFERRED edges - model-reasoned connections that need verification._
- **Are the 90 inferred relationships involving `dbGet()` (e.g. with `renderBracket()` and `getStandingsForPhase()`) actually correct?**
  _`dbGet()` has 90 INFERRED edges - model-reasoned connections that need verification._
- **Are the 67 inferred relationships involving `escHtml()` (e.g. with `authForgotPassword()` and `teamLogoHtml()`) actually correct?**
  _`escHtml()` has 67 INFERRED edges - model-reasoned connections that need verification._