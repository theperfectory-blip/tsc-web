# Graph Report - .  (2026-10-12)

## Corpus Check
- solo AST

## Summary
- 1008 nodes · 2758 edges · 21 communities detected
- Extraction: 73% EXTRACTED · 27% INFERRED · 0% AMBIGUOUS · INFERRED: 758 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Export  import de datos|Export / import de datos]]
- [[_COMMUNITY_Sorteo en vivo|Sorteo en vivo]]
- [[_COMMUNITY_Bracket, partidos y playoff|Bracket, partidos y playoff]]
- [[_COMMUNITY_Calendario|Calendario]]
- [[_COMMUNITY_Capa de datos y fixture|Capa de datos y fixture]]
- [[_COMMUNITY_Sonido y efectos de partido|Sonido y efectos de partido]]
- [[_COMMUNITY_Auth y registro|Auth y registro]]
- [[_COMMUNITY_Tablas de posiciones|Tablas de posiciones]]
- [[_COMMUNITY_Bracket publico|Bracket publico]]
- [[_COMMUNITY_Historial y H2H|Historial y H2H]]
- [[_COMMUNITY_Push, ajustes y actualizador|Push, ajustes y actualizador]]
- [[_COMMUNITY_Promo APK|Promo APK]]
- [[_COMMUNITY_Equipos y animacion de UI|Equipos y animacion de UI]]
- [[_COMMUNITY_Config Cloudinary|Config Cloudinary]]
- [[_COMMUNITY_Selector de color|Selector de color]]
- [[_COMMUNITY_Config Firebase (ejemplo)|Config Firebase (ejemplo)]]
- [[_COMMUNITY_Competiciones|Competiciones]]
- [[_COMMUNITY_Perfil y panel del presidente|Perfil y panel del presidente]]
- [[_COMMUNITY_Palmares (Sala de Trofeos 3D)|Palmares (Sala de Trofeos 3D)]]
- [[_COMMUNITY_Navegacion y paginas publicas|Navegacion y paginas publicas]]
- [[_COMMUNITY_Config Firebase|Config Firebase]]

## God Nodes (most connected - your core abstractions)
1. `dbGetAll()` - 127 edges
2. `dbGet()` - 89 edges
3. `showToast()` - 74 edges
4. `dbPut()` - 60 edges
5. `dbAdd()` - 31 edges
6. `invalidateStandingsAndSyncBrackets()` - 22 edges
7. `renderAdminPage()` - 22 edges
8. `getForSeason()` - 21 edges
9. `activeBombo()` - 21 edges
10. `_palmRenderSala()` - 20 edges

## Surprising Connections (you probably didn't know these)
- `_calCenterAnchorScroll()` --calls--> `_focusPublicSectionInner()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\calendar.js → D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\nav.js
- `_calInitHeroCountdown()` --calls--> `countdown()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\calendar.js → D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\motion.js
- `dbGet()` --calls--> `openAssignDateToJornada()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\db.js → D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\matches.js
- `dbGet()` --calls--> `getCustomCriterionName()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\db.js → D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\standings.js
- `getForSeason()` --calls--> `resolveTeamData()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\db.js → D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\standings.js

## Communities

### Community 15 - "Export / import de datos"
Cohesion: 0.36
Nodes (9): _apkIsNativeApp(), _apkShouldOffer(), _apkAlreadyDownloaded(), _apkClosedRecently(), openApkPromo(), _apkHideOverlay(), closeApkPromo(), tscApkDownloadClick() (+1 more)

### Community 4 - "Sorteo en vivo"
Cohesion: 0.05
Nodes (47): _authEsc(), _usersCol(), _injectAuthModal(), openAuthModal(), toggleAuthMode(), _renderAuthModalMode(), authForgotPassword(), authSubmit() (+39 more)

### Community 0 - "Bracket, partidos y playoff"
Cohesion: 0.04
Nodes (154): getWinner(), getTeamLogo(), spawnRocket(), loop(), _cleanup(), _onClick(), renderBracket(), buildBracketRounds() (+146 more)

### Community 10 - "Calendario"
Cohesion: 0.08
Nodes (45): teamLogoHtml(), _esc(), onMatchGroupChange(), renderMatchesList(), navegarRonda(), _fmtJornadaDateCore(), formatJornadaDateRange(), openAssignDateToJornada() (+37 more)

### Community 9 - "Capa de datos y fixture"
Cohesion: 0.08
Nodes (39): _getAudioCtx(), resume(), _fwSoundOff(), _soundRocketLaunch(), _soundExplosion(), frame(), liveRadarStart(), _palmAudio() (+31 more)

### Community 5 - "Sonido y efectos de partido"
Cohesion: 0.07
Nodes (56): hexToRgb(), lighten(), dbMirrorInvalidate(), renderAdmSorteo(), newBomboId(), newBombo(), emptyState(), effectiveDrawnIds() (+48 more)

### Community 13 - "Auth y registro"
Cohesion: 0.12
Nodes (23): refBadgeHTML(), getCustomCriterionName(), openCriteriaModal(), closeCriteriaModal(), criteriaDragEnd(), criteriaDrop(), criteriaDropOnContainer(), criteriaDisable() (+15 more)

### Community 11 - "Tablas de posiciones"
Cohesion: 0.11
Nodes (36): deleteBracketMatch(), notifyStreamTodayClick(), deleteComp(), _dataEsc(), renderAdmData(), renderDBInfo(), exportFullDB(), exportSeason() (+28 more)

### Community 12 - "Bracket publico"
Cohesion: 0.14
Nodes (26): _esc(), _calFormatDay(), _calTodayStr(), _calViewerTodayStr(), _calMatchInstant(), _calMatchTimeLocal(), _calLocalDateStr(), _calJornadaViewerDate() (+18 more)

### Community 3 - "Historial y H2H"
Cohesion: 0.06
Nodes (71): _calHeroGoH2H(), _histNorm(), _histResolveExactTeam(), _histResolveTeam(), computeResultado(), _esc(), loadStaticHistory(), seedHistoryIfEmpty() (+63 more)

### Community 7 - "Push, ajustes y actualizador"
Cohesion: 0.06
Nodes (51): _calHeroGoComp(), _calResolveAnchorPhase(), getActiveCompPhase(), getDefaultPhaseId(), _sortComps(), renderAdmComps(), renderCompsGrid(), closeCompModal() (+43 more)

### Community 16 - "Promo APK"
Cohesion: 1.0
Nodes (2): cloudReady(), uploadImageToCloud()

### Community 6 - "Equipos y animacion de UI"
Cohesion: 0.05
Nodes (49): cloudReady(), uploadImageToCloud(), resize(), wake(), stop(), setVariant(), getVariant(), init() (+41 more)

### Community 17 - "Config Cloudinary"
Cohesion: 1.0
Nodes (0): 

### Community 18 - "Selector de color"
Cohesion: 1.0
Nodes (0): 

### Community 19 - "Config Firebase (ejemplo)"
Cohesion: 1.0
Nodes (0): 

### Community 14 - "Competiciones"
Cohesion: 0.2
Nodes (9): _fxShuffle(), fxBuildRoundRobin(), fxBuildLuisRoute(), _fxBuildLuisRouteForLegs(), _fxGenerateCalendarAndRoute(), fxShuffleAgain(), renderFixtureGenModal(), closeFixtureGenModal() (+1 more)

### Community 8 - "Perfil y panel del presidente"
Cohesion: 0.08
Nodes (49): liveStop(), liveSubscribe(), liveRadarStop(), liveRadarProximity(), _subscribeAdminMatchesLive(), getPublicScrollPages(), getMountedPublicPages(), _isPublicScrollPage() (+41 more)

### Community 1 - "Palmares (Sala de Trofeos 3D)"
Cohesion: 0.04
Nodes (127): loadPalmaresComps(), palmaresCompByKey(), getTrophyStyles(), _uid(), trophyClassica(), trophyImperial(), trophyKonami(), trophyOrejona() (+119 more)

### Community 2 - "Navegacion y paginas publicas"
Cohesion: 0.04
Nodes (73): _pfEsc(), _pfPushEscLayer(), _pfPopEscLayer(), _pfCloseProfileModal(), _injectProfileModal(), _profileFocusables(), _onProfileOpen(), _onProfileClose() (+65 more)

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

- **Why does `dbGetAll()` connect `Bracket, partidos y playoff` to `Palmares (Sala de Trofeos 3D)`, `Historial y H2H`, `Sorteo en vivo`, `Sonido y efectos de partido`, `Equipos y animacion de UI`, `Push, ajustes y actualizador`, `Perfil y panel del presidente`, `Calendario`, `Tablas de posiciones`, `Bracket publico`?**
  _High betweenness centrality (0.256) - this node is a cross-community bridge._
- **Why does `showToast()` connect `Bracket, partidos y playoff` to `Palmares (Sala de Trofeos 3D)`, `Navegacion y paginas publicas`, `Historial y H2H`, `Sorteo en vivo`, `Equipos y animacion de UI`, `Push, ajustes y actualizador`, `Perfil y panel del presidente`, `Calendario`, `Tablas de posiciones`, `Auth y registro`?**
  _High betweenness centrality (0.156) - this node is a cross-community bridge._
- **Why does `dbGet()` connect `Bracket, partidos y playoff` to `Palmares (Sala de Trofeos 3D)`, `Navegacion y paginas publicas`, `Sonido y efectos de partido`, `Equipos y animacion de UI`, `Push, ajustes y actualizador`, `Calendario`, `Tablas de posiciones`, `Bracket publico`, `Auth y registro`?**
  _High betweenness centrality (0.090) - this node is a cross-community bridge._
- **Are the 121 inferred relationships involving `dbGetAll()` (e.g. with `getTeamLogo()` and `renderBracket()`) actually correct?**
  _`dbGetAll()` has 121 INFERRED edges - model-reasoned connections that need verification._
- **Are the 85 inferred relationships involving `dbGet()` (e.g. with `renderBracket()` and `getStandingsForPhase()`) actually correct?**
  _`dbGet()` has 85 INFERRED edges - model-reasoned connections that need verification._
- **Are the 70 inferred relationships involving `showToast()` (e.g. with `authForgotPassword()` and `authSignOut()`) actually correct?**
  _`showToast()` has 70 INFERRED edges - model-reasoned connections that need verification._
- **Are the 56 inferred relationships involving `dbPut()` (e.g. with `_syncBracketSlotsForSourcePhase()` and `_syncOwnBracketRounds()`) actually correct?**
  _`dbPut()` has 56 INFERRED edges - model-reasoned connections that need verification._