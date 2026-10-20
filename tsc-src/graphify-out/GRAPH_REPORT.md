# Graph Report - .  (2026-10-19)

## Corpus Check
- solo AST

## Summary
- 1040 nodes · 2917 edges · 21 communities detected
- Extraction: 71% EXTRACTED · 29% INFERRED · 0% AMBIGUOUS · INFERRED: 854 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Export  import de datos|Export / import de datos]]
- [[_COMMUNITY_Sorteo en vivo|Sorteo en vivo]]
- [[_COMMUNITY_Navegacion y paginas publicas|Navegacion y paginas publicas]]
- [[_COMMUNITY_Tablas de posiciones|Tablas de posiciones]]
- [[_COMMUNITY_Capa de datos y fixture|Capa de datos y fixture]]
- [[_COMMUNITY_Bracket, partidos y playoff|Bracket, partidos y playoff]]
- [[_COMMUNITY_Sonido y efectos de partido|Sonido y efectos de partido]]
- [[_COMMUNITY_Push, ajustes y actualizador|Push, ajustes y actualizador]]
- [[_COMMUNITY_Promo APK|Promo APK]]
- [[_COMMUNITY_Config Cloudinary|Config Cloudinary]]
- [[_COMMUNITY_Calendario|Calendario]]
- [[_COMMUNITY_Perfil y panel del presidente|Perfil y panel del presidente]]
- [[_COMMUNITY_Competiciones|Competiciones]]
- [[_COMMUNITY_Selector de color|Selector de color]]
- [[_COMMUNITY_Config Firebase (ejemplo)|Config Firebase (ejemplo)]]
- [[_COMMUNITY_Auth y registro|Auth y registro]]
- [[_COMMUNITY_Historial y H2H|Historial y H2H]]
- [[_COMMUNITY_Palmares (Sala de Trofeos 3D)|Palmares (Sala de Trofeos 3D)]]
- [[_COMMUNITY_Bracket publico|Bracket publico]]
- [[_COMMUNITY_Equipos y animacion de UI|Equipos y animacion de UI]]
- [[_COMMUNITY_Config Firebase|Config Firebase]]

## God Nodes (most connected - your core abstractions)
1. `dbGetAll()` - 141 edges
2. `dbGet()` - 98 edges
3. `showToast()` - 90 edges
4. `dbPut()` - 61 edges
5. `dbAdd()` - 32 edges
6. `dbErrorMsg()` - 27 edges
7. `invalidateStandingsAndSyncBrackets()` - 23 edges
8. `renderAdminPage()` - 22 edges
9. `getForSeason()` - 21 edges
10. `activeBombo()` - 21 edges

## Surprising Connections (you probably didn't know these)
- `getTeamLogo()` --calls--> `dbGetAll()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\bracket.js → D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\db.js
- `deleteBracketMatch()` --calls--> `showConfirm()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\bracket.js → D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\ui-utils.js
- `notifyStreamTodayClick()` --calls--> `showConfirm()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\calendar.js → D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\ui-utils.js
- `_calInitHeroCountdown()` --calls--> `countdown()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\calendar.js → D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\motion.js
- `openBulkCoinsModal()` --calls--> `dbGetAll()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\coins.js → D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\db.js

## Communities

### Community 15 - "Export / import de datos"
Cohesion: 0.36
Nodes (9): _apkIsNativeApp(), _apkShouldOffer(), _apkAlreadyDownloaded(), _apkClosedRecently(), openApkPromo(), _apkHideOverlay(), closeApkPromo(), tscApkDownloadClick() (+1 more)

### Community 4 - "Sorteo en vivo"
Cohesion: 0.04
Nodes (69): _authEsc(), _usersCol(), _injectAuthModal(), openAuthModal(), toggleAuthMode(), _renderAuthModalMode(), authForgotPassword(), authSubmit() (+61 more)

### Community 2 - "Navegacion y paginas publicas"
Cohesion: 0.04
Nodes (65): getWinner(), getTeamLogo(), _getAudioCtx(), _fwSoundOff(), _soundRocketLaunch(), _soundExplosion(), hexToRgb(), rgbStr() (+57 more)

### Community 11 - "Tablas de posiciones"
Cohesion: 0.1
Nodes (26): teamLogoHtml(), refBadgeHTML(), renderAdmCoins(), renderCoinsTable(), filterCoinsTable(), openCoinsModal(), updateCoinsPreview(), openBulkCoinsModal() (+18 more)

### Community 9 - "Capa de datos y fixture"
Cohesion: 0.08
Nodes (40): resume(), liveStop(), liveSubscribe(), liveRadarStart(), liveRadarStop(), liveRadarProximity(), _subscribeAdminMatchesLive(), _palmAudio() (+32 more)

### Community 0 - "Bracket, partidos y playoff"
Cohesion: 0.04
Nodes (159): renderBracket(), invalidateStandingsAndSyncBrackets(), openSlotRefModal(), _readRefSourceFromModal(), saveSlotRef(), _bkRefPhaseEditable(), removeSlotRef(), rerenderPhaseFromRefTarget() (+151 more)

### Community 5 - "Sonido y efectos de partido"
Cohesion: 0.05
Nodes (67): _esc(), _calFormatDay(), _calTodayStr(), _calViewerTodayStr(), _calMatchInstant(), _calMatchTimeLocal(), _calLocalDateStr(), _calJornadaViewerDate() (+59 more)

### Community 7 - "Push, ajustes y actualizador"
Cohesion: 0.07
Nodes (61): _calCenterAnchorScroll(), getPublicScrollPages(), getMountedPublicPages(), _isPublicScrollPage(), _syncPublicNavigation(), _applyPubSidebar(), closePubSidebar(), _syncAdminSidebarToggle() (+53 more)

### Community 16 - "Promo APK"
Cohesion: 1.0
Nodes (2): cloudReady(), uploadImageToCloud()

### Community 17 - "Config Cloudinary"
Cohesion: 1.0
Nodes (0): 

### Community 10 - "Calendario"
Cohesion: 0.07
Nodes (38): resize(), frame(), wake(), stop(), setVariant(), init(), reduced(), _settle() (+30 more)

### Community 8 - "Perfil y panel del presidente"
Cohesion: 0.07
Nodes (47): getVariant(), _plugin(), isEnabled(), _clearToken(), _setPendingTokenRemoval(), _clearPendingTokenRemoval(), _pushDocRef(), _currentTimezone() (+39 more)

### Community 14 - "Competiciones"
Cohesion: 0.27
Nodes (11): _dataEsc(), renderAdmData(), renderDBInfo(), exportFullDB(), downloadJSON(), _dataBackupStores(), _dataValidateRecord(), _dataValidateStoreItems() (+3 more)

### Community 18 - "Selector de color"
Cohesion: 1.0
Nodes (0): 

### Community 19 - "Config Firebase (ejemplo)"
Cohesion: 1.0
Nodes (0): 

### Community 13 - "Auth y registro"
Cohesion: 0.2
Nodes (9): _fxScheduledCount(), _fxShuffle(), fxBuildRoundRobin(), fxBuildLuisRoute(), _fxBuildLuisRouteForLegs(), _fxGenerateCalendarAndRoute(), fxShuffleAgain(), renderFixtureGenModal() (+1 more)

### Community 3 - "Historial y H2H"
Cohesion: 0.06
Nodes (74): _histNorm(), _histResolveExactTeam(), _histResolveTeam(), computeResultado(), _esc(), loadStaticHistory(), cleanLegacyImportedFromIDB(), seedHistoryIfEmpty() (+66 more)

### Community 1 - "Palmares (Sala de Trofeos 3D)"
Cohesion: 0.03
Nodes (131): loadPalmaresComps(), palmaresCompByKey(), getTrophyStyles(), _uid(), trophyClassica(), trophyImperial(), trophyKonami(), trophyOrejona() (+123 more)

### Community 12 - "Bracket publico"
Cohesion: 0.21
Nodes (19): _pbEsc(), _pbFmtDate(), _pbTeamMap(), _pbTeamPublic(), _pbTrophyHTML(), _pbWinBadge(), _pbBracketCards(), _pbCrestMini() (+11 more)

### Community 6 - "Equipos y animacion de UI"
Cohesion: 0.08
Nodes (64): newBomboId(), newBombo(), emptyState(), _journalCapturePhase(), _journalCaptureMatches(), effectiveDrawnIds(), ensureBC(), broadcast() (+56 more)

### Community 20 - "Config Firebase"
Cohesion: 1.0
Nodes (0): 

## Knowledge Gaps
- **Thin community `Config Cloudinary`** (2 nodes): `color-picker.js`, `openColorPicker()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Selector de color`** (1 nodes): `firebase-config.example.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Config Firebase (ejemplo)`** (1 nodes): `firebase-config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Config Firebase`** (1 nodes): `state.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dbGetAll()` connect `Bracket, partidos y playoff` to `Palmares (Sala de Trofeos 3D)`, `Navegacion y paginas publicas`, `Historial y H2H`, `Sonido y efectos de partido`, `Equipos y animacion de UI`, `Push, ajustes y actualizador`, `Calendario`, `Tablas de posiciones`, `Bracket publico`, `Competiciones`?**
  _High betweenness centrality (0.266) - this node is a cross-community bridge._
- **Why does `showToast()` connect `Bracket, partidos y playoff` to `Palmares (Sala de Trofeos 3D)`, `Navegacion y paginas publicas`, `Historial y H2H`, `Sorteo en vivo`, `Sonido y efectos de partido`, `Equipos y animacion de UI`, `Push, ajustes y actualizador`, `Perfil y panel del presidente`, `Tablas de posiciones`, `Competiciones`?**
  _High betweenness centrality (0.136) - this node is a cross-community bridge._
- **Why does `dbGet()` connect `Bracket, partidos y playoff` to `Palmares (Sala de Trofeos 3D)`, `Navegacion y paginas publicas`, `Sorteo en vivo`, `Sonido y efectos de partido`, `Equipos y animacion de UI`, `Tablas de posiciones`, `Bracket publico`?**
  _High betweenness centrality (0.128) - this node is a cross-community bridge._
- **Are the 134 inferred relationships involving `dbGetAll()` (e.g. with `getTeamLogo()` and `renderBracket()`) actually correct?**
  _`dbGetAll()` has 134 INFERRED edges - model-reasoned connections that need verification._
- **Are the 94 inferred relationships involving `dbGet()` (e.g. with `renderBracket()` and `getStandingsForPhase()`) actually correct?**
  _`dbGet()` has 94 INFERRED edges - model-reasoned connections that need verification._
- **Are the 86 inferred relationships involving `showToast()` (e.g. with `authForgotPassword()` and `authSignOut()`) actually correct?**
  _`showToast()` has 86 INFERRED edges - model-reasoned connections that need verification._
- **Are the 57 inferred relationships involving `dbPut()` (e.g. with `_syncBracketSlotsForSourcePhase()` and `_syncOwnBracketRounds()`) actually correct?**
  _`dbPut()` has 57 INFERRED edges - model-reasoned connections that need verification._