# Graph Report - .  (2026-10-19)

## Corpus Check
- solo AST

## Summary
- 1014 nodes · 2811 edges · 23 communities detected
- Extraction: 72% EXTRACTED · 28% INFERRED · 0% AMBIGUOUS · INFERRED: 795 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Config Cloudinary|Config Cloudinary]]
- [[_COMMUNITY_Competiciones|Competiciones]]
- [[_COMMUNITY_Auth y registro|Auth y registro]]
- [[_COMMUNITY_Bracket, partidos y playoff|Bracket, partidos y playoff]]
- [[_COMMUNITY_Tablas de posiciones|Tablas de posiciones]]
- [[_COMMUNITY_Sonido y efectos de partido|Sonido y efectos de partido]]
- [[_COMMUNITY_Sorteo en vivo|Sorteo en vivo]]
- [[_COMMUNITY_Perfil y panel del presidente|Perfil y panel del presidente]]
- [[_COMMUNITY_Bracket publico|Bracket publico]]
- [[_COMMUNITY_Calendario|Calendario]]
- [[_COMMUNITY_Historial y H2H|Historial y H2H]]
- [[_COMMUNITY_Push, ajustes y actualizador|Push, ajustes y actualizador]]
- [[_COMMUNITY_Selector de color|Selector de color]]
- [[_COMMUNITY_Equipos y animacion de UI|Equipos y animacion de UI]]
- [[_COMMUNITY_Config Firebase (ejemplo)|Config Firebase (ejemplo)]]
- [[_COMMUNITY_Export  import de datos|Export / import de datos]]
- [[_COMMUNITY_Config Firebase|Config Firebase]]
- [[_COMMUNITY_Estado global|Estado global]]
- [[_COMMUNITY_Promo APK|Promo APK]]
- [[_COMMUNITY_Capa de datos y fixture|Capa de datos y fixture]]
- [[_COMMUNITY_Palmares (Sala de Trofeos 3D)|Palmares (Sala de Trofeos 3D)]]
- [[_COMMUNITY_Navegacion y paginas publicas|Navegacion y paginas publicas]]
- [[_COMMUNITY_Community 22|Community 22]]

## God Nodes (most connected - your core abstractions)
1. `dbGetAll()` - 133 edges
2. `dbGet()` - 90 edges
3. `showToast()` - 78 edges
4. `dbPut()` - 60 edges
5. `dbAdd()` - 31 edges
6. `invalidateStandingsAndSyncBrackets()` - 22 edges
7. `renderAdminPage()` - 22 edges
8. `getForSeason()` - 21 edges
9. `activeBombo()` - 21 edges
10. `dbErrorMsg()` - 20 edges

## Surprising Connections (you probably didn't know these)
- `_calCenterAnchorScroll()` --calls--> `_focusPublicSectionInner()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\calendar.js → D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\nav.js
- `_calInitHeroCountdown()` --calls--> `countdown()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\calendar.js → D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\motion.js
- `_deletePhaseCascade()` --calls--> `dbDeleteMany()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\competitions.js → D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\db.js
- `dbMirrorInvalidate()` --calls--> `drawNext()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\db.js → D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\sorteo.js
- `dbGet()` --calls--> `openAssignDateToJornada()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\db.js → D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\matches.js

## Communities

### Community 17 - "Config Cloudinary"
Cohesion: 0.36
Nodes (9): _apkIsNativeApp(), _apkShouldOffer(), _apkAlreadyDownloaded(), _apkClosedRecently(), openApkPromo(), _apkHideOverlay(), closeApkPromo(), tscApkDownloadClick() (+1 more)

### Community 14 - "Competiciones"
Cohesion: 0.18
Nodes (14): _authEsc(), _usersCol(), _injectAuthModal(), openAuthModal(), toggleAuthMode(), _renderAuthModalMode(), authForgotPassword(), authSubmit() (+6 more)

### Community 13 - "Auth y registro"
Cohesion: 0.15
Nodes (22): authSignOut(), _plugin(), isEnabled(), _clearToken(), _setPendingTokenRemoval(), _clearPendingTokenRemoval(), _pushDocRef(), _currentTimezone() (+14 more)

### Community 0 - "Bracket, partidos y playoff"
Cohesion: 0.04
Nodes (168): getWinner(), getTeamLogo(), spawnRocket(), loop(), _cleanup(), _onClick(), renderBracket(), buildBracketRounds() (+160 more)

### Community 11 - "Tablas de posiciones"
Cohesion: 0.1
Nodes (32): teamLogoHtml(), openCompModal(), liveSubscribe(), _esc(), _subscribeAdminMatchesLive(), onMatchGroupChange(), renderMatchesList(), navegarRonda() (+24 more)

### Community 5 - "Sonido y efectos de partido"
Cohesion: 0.06
Nodes (43): _getAudioCtx(), resume(), _fwSoundOff(), _soundRocketLaunch(), _soundExplosion(), rgbStr(), Particle, Rocket (+35 more)

### Community 4 - "Sorteo en vivo"
Cohesion: 0.07
Nodes (68): hexToRgb(), lighten(), newBomboId(), newBombo(), emptyState(), _journalCapturePhase(), _journalCaptureMatches(), effectiveDrawnIds() (+60 more)

### Community 8 - "Perfil y panel del presidente"
Cohesion: 0.09
Nodes (42): deleteBracketMatch(), notifyStreamTodayClick(), _dataEsc(), renderAdmData(), renderDBInfo(), exportFullDB(), downloadJSON(), _dataBackupStores() (+34 more)

### Community 12 - "Bracket publico"
Cohesion: 0.13
Nodes (22): refBadgeHTML(), getCustomCriterionName(), openCriteriaModal(), closeCriteriaModal(), criteriaDragEnd(), criteriaDrop(), criteriaDropOnContainer(), criteriaDisable() (+14 more)

### Community 10 - "Calendario"
Cohesion: 0.12
Nodes (32): _esc(), _calFormatDay(), _calTodayStr(), _calViewerTodayStr(), _calMatchInstant(), _calMatchTimeLocal(), _calLocalDateStr(), _calJornadaViewerDate() (+24 more)

### Community 3 - "Historial y H2H"
Cohesion: 0.06
Nodes (71): _calHeroGoH2H(), _histNorm(), _histResolveExactTeam(), _histResolveTeam(), computeResultado(), _esc(), loadStaticHistory(), seedHistoryIfEmpty() (+63 more)

### Community 7 - "Push, ajustes y actualizador"
Cohesion: 0.09
Nodes (50): _calHeroGoComp(), liveStop(), liveRadarStop(), getPublicScrollPages(), getMountedPublicPages(), _isPublicScrollPage(), _syncPublicNavigation(), _applyPubSidebar() (+42 more)

### Community 18 - "Selector de color"
Cohesion: 1.0
Nodes (2): cloudReady(), uploadImageToCloud()

### Community 6 - "Equipos y animacion de UI"
Cohesion: 0.05
Nodes (51): cloudReady(), uploadImageToCloud(), resize(), frame(), wake(), stop(), setVariant(), getVariant() (+43 more)

### Community 19 - "Config Firebase (ejemplo)"
Cohesion: 1.0
Nodes (0): 

### Community 15 - "Export / import de datos"
Cohesion: 0.19
Nodes (10): _sortComps(), closeCompModal(), _deletePhaseCascade(), openCompReorderModal(), _renderCompReorderList(), compReorderDragEnd(), compReorderDrop(), compReorderDropOnContainer() (+2 more)

### Community 20 - "Config Firebase"
Cohesion: 1.0
Nodes (0): 

### Community 21 - "Estado global"
Cohesion: 1.0
Nodes (0): 

### Community 16 - "Promo APK"
Cohesion: 0.2
Nodes (9): _fxShuffle(), fxBuildRoundRobin(), fxBuildLuisRoute(), _fxBuildLuisRouteForLegs(), _fxGenerateCalendarAndRoute(), fxShuffleAgain(), renderFixtureGenModal(), closeFixtureGenModal() (+1 more)

### Community 9 - "Capa de datos y fixture"
Cohesion: 0.09
Nodes (41): _pubSwitchHistoryView(), ticker(), _pbEsc(), _pbFmtDate(), _pbTeamMap(), _pbTeamPublic(), _pbTrophyHTML(), _pbWinBadge() (+33 more)

### Community 1 - "Palmares (Sala de Trofeos 3D)"
Cohesion: 0.04
Nodes (115): palmaresCompByKey(), getTrophyStyles(), _uid(), trophyClassica(), trophyImperial(), trophyKonami(), trophyOrejona(), trophySobria() (+107 more)

### Community 2 - "Navegacion y paginas publicas"
Cohesion: 0.04
Nodes (73): _pfEsc(), _pfPushEscLayer(), _pfPopEscLayer(), _pfCloseProfileModal(), _injectProfileModal(), _profileFocusables(), _onProfileOpen(), _onProfileClose() (+65 more)

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

- **Why does `dbGetAll()` connect `Bracket, partidos y playoff` to `Palmares (Sala de Trofeos 3D)`, `Historial y H2H`, `Sorteo en vivo`, `Equipos y animacion de UI`, `Push, ajustes y actualizador`, `Perfil y panel del presidente`, `Capa de datos y fixture`, `Calendario`, `Tablas de posiciones`?**
  _High betweenness centrality (0.285) - this node is a cross-community bridge._
- **Why does `showToast()` connect `Bracket, partidos y playoff` to `Palmares (Sala de Trofeos 3D)`, `Navegacion y paginas publicas`, `Historial y H2H`, `Sorteo en vivo`, `Equipos y animacion de UI`, `Push, ajustes y actualizador`, `Perfil y panel del presidente`, `Tablas de posiciones`, `Bracket publico`, `Auth y registro`, `Competiciones`, `Export / import de datos`?**
  _High betweenness centrality (0.144) - this node is a cross-community bridge._
- **Why does `dbGet()` connect `Bracket, partidos y playoff` to `Palmares (Sala de Trofeos 3D)`, `Navegacion y paginas publicas`, `Sorteo en vivo`, `Equipos y animacion de UI`, `Capa de datos y fixture`, `Calendario`, `Tablas de posiciones`, `Bracket publico`?**
  _High betweenness centrality (0.105) - this node is a cross-community bridge._
- **Are the 127 inferred relationships involving `dbGetAll()` (e.g. with `getTeamLogo()` and `renderBracket()`) actually correct?**
  _`dbGetAll()` has 127 INFERRED edges - model-reasoned connections that need verification._
- **Are the 86 inferred relationships involving `dbGet()` (e.g. with `renderBracket()` and `getStandingsForPhase()`) actually correct?**
  _`dbGet()` has 86 INFERRED edges - model-reasoned connections that need verification._
- **Are the 74 inferred relationships involving `showToast()` (e.g. with `authForgotPassword()` and `authSignOut()`) actually correct?**
  _`showToast()` has 74 INFERRED edges - model-reasoned connections that need verification._
- **Are the 56 inferred relationships involving `dbPut()` (e.g. with `_syncBracketSlotsForSourcePhase()` and `_syncOwnBracketRounds()`) actually correct?**
  _`dbPut()` has 56 INFERRED edges - model-reasoned connections that need verification._