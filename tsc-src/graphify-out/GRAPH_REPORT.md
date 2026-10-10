# Graph Report - .  (2026-10-10)

## Corpus Check
- solo AST

## Summary
- 996 nodes · 2680 edges · 22 communities detected
- Extraction: 74% EXTRACTED · 26% INFERRED · 0% AMBIGUOUS · INFERRED: 709 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Promo APK|Promo APK]]
- [[_COMMUNITY_Auth y registro|Auth y registro]]
- [[_COMMUNITY_Bracket, partidos y playoff|Bracket, partidos y playoff]]
- [[_COMMUNITY_Equipos y animacion de UI|Equipos y animacion de UI]]
- [[_COMMUNITY_Sonido y efectos de partido|Sonido y efectos de partido]]
- [[_COMMUNITY_Sorteo en vivo|Sorteo en vivo]]
- [[_COMMUNITY_Tablas de posiciones|Tablas de posiciones]]
- [[_COMMUNITY_Calendario|Calendario]]
- [[_COMMUNITY_Navegacion y paginas publicas|Navegacion y paginas publicas]]
- [[_COMMUNITY_Config Cloudinary|Config Cloudinary]]
- [[_COMMUNITY_Selector de color|Selector de color]]
- [[_COMMUNITY_Competiciones|Competiciones]]
- [[_COMMUNITY_Export  import de datos|Export / import de datos]]
- [[_COMMUNITY_Capa de datos y fixture|Capa de datos y fixture]]
- [[_COMMUNITY_Config Firebase (ejemplo)|Config Firebase (ejemplo)]]
- [[_COMMUNITY_Config Firebase|Config Firebase]]
- [[_COMMUNITY_Historial y H2H|Historial y H2H]]
- [[_COMMUNITY_Palmares (Sala de Trofeos 3D)|Palmares (Sala de Trofeos 3D)]]
- [[_COMMUNITY_Perfil y panel del presidente|Perfil y panel del presidente]]
- [[_COMMUNITY_Bracket publico|Bracket publico]]
- [[_COMMUNITY_Push, ajustes y actualizador|Push, ajustes y actualizador]]
- [[_COMMUNITY_Estado global|Estado global]]

## God Nodes (most connected - your core abstractions)
1. `dbGetAll()` - 126 edges
2. `dbGet()` - 89 edges
3. `showToast()` - 73 edges
4. `dbPut()` - 60 edges
5. `dbAdd()` - 31 edges
6. `invalidateStandingsAndSyncBrackets()` - 22 edges
7. `activeBombo()` - 21 edges
8. `renderAdminPage()` - 20 edges
9. `_palmRenderSala()` - 20 edges
10. `getForSeason()` - 19 edges

## Surprising Connections (you probably didn't know these)
- `_calInitHeroCountdown()` --calls--> `countdown()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\calendar.js → D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\motion.js
- `dbMirrorInvalidate()` --calls--> `drawNext()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\db.js → D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\sorteo.js
- `dbGetAll()` --calls--> `openSeasonModal()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\db.js → D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\seasons.js
- `dbGet()` --calls--> `getCustomCriterionName()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\db.js → D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\standings.js
- `getForSeason()` --calls--> `resolveTeamData()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\db.js → D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\standings.js

## Communities

### Community 16 - "Promo APK"
Cohesion: 0.36
Nodes (9): _apkIsNativeApp(), _apkShouldOffer(), _apkAlreadyDownloaded(), _apkClosedRecently(), openApkPromo(), _apkHideOverlay(), closeApkPromo(), tscApkDownloadClick() (+1 more)

### Community 13 - "Auth y registro"
Cohesion: 0.18
Nodes (14): _authEsc(), _usersCol(), _injectAuthModal(), openAuthModal(), toggleAuthMode(), _renderAuthModalMode(), authForgotPassword(), authSubmit() (+6 more)

### Community 0 - "Bracket, partidos y playoff"
Cohesion: 0.03
Nodes (178): getWinner(), getTeamLogo(), spawnRocket(), loop(), _cleanup(), renderBracket(), buildBracketRounds(), getStandingsForPhase() (+170 more)

### Community 6 - "Equipos y animacion de UI"
Cohesion: 0.06
Nodes (46): teamLogoHtml(), resize(), frame(), wake(), stop(), setVariant(), getVariant(), init() (+38 more)

### Community 5 - "Sonido y efectos de partido"
Cohesion: 0.06
Nodes (46): _getAudioCtx(), resume(), _soundRocketLaunch(), _soundExplosion(), rgbStr(), Particle, Rocket, liveStop() (+38 more)

### Community 4 - "Sorteo en vivo"
Cohesion: 0.07
Nodes (70): hexToRgb(), lighten(), refreshSorteoTabVisibility(), newBomboId(), newBombo(), emptyState(), _journalCapturePhase(), _journalCaptureMatches() (+62 more)

### Community 11 - "Tablas de posiciones"
Cohesion: 0.12
Nodes (23): refBadgeHTML(), getCustomCriterionName(), saveCriteria(), openCriteriaModal(), closeCriteriaModal(), criteriaDragEnd(), criteriaDrop(), criteriaDropOnContainer() (+15 more)

### Community 10 - "Calendario"
Cohesion: 0.14
Nodes (26): _esc(), _calFormatDay(), _calTodayStr(), _calMatchInstant(), _calMatchTimeLocal(), _calLocalDateStr(), _calJornadaViewerDate(), _calLogo() (+18 more)

### Community 2 - "Navegacion y paginas publicas"
Cohesion: 0.05
Nodes (76): _calCenterAnchorScroll(), _calHeroGoH2H(), _calHeroGoComp(), _pubSwitchHistoryView(), ticker(), getPublicScrollPages(), getMountedPublicPages(), _isPublicScrollPage() (+68 more)

### Community 17 - "Config Cloudinary"
Cohesion: 1.0
Nodes (2): cloudReady(), uploadImageToCloud()

### Community 18 - "Selector de color"
Cohesion: 1.0
Nodes (0): 

### Community 14 - "Competiciones"
Cohesion: 0.2
Nodes (12): _sortComps(), renderAdmComps(), renderCompsGrid(), closeCompModal(), saveComp(), openCompReorderModal(), _renderCompReorderList(), compReorderDragEnd() (+4 more)

### Community 15 - "Export / import de datos"
Cohesion: 0.27
Nodes (11): _dataEsc(), renderAdmData(), renderDBInfo(), exportFullDB(), downloadJSON(), _dataBackupStores(), _dataValidateRecord(), _dataValidateStoreItems() (+3 more)

### Community 9 - "Capa de datos y fixture"
Cohesion: 0.11
Nodes (25): _isFS(), _assertWritable(), initDB(), dbEnsureCounterAtLeast(), _fsMirrorEnabled(), _fsMirrorDrop(), _fsMirrorSweep(), _fsMirror() (+17 more)

### Community 19 - "Config Firebase (ejemplo)"
Cohesion: 1.0
Nodes (0): 

### Community 20 - "Config Firebase"
Cohesion: 1.0
Nodes (0): 

### Community 3 - "Historial y H2H"
Cohesion: 0.06
Nodes (71): _histNorm(), _histResolveExactTeam(), _histResolveTeam(), computeResultado(), _esc(), loadStaticHistory(), cleanLegacyImportedFromIDB(), seedHistoryIfEmpty() (+63 more)

### Community 1 - "Palmares (Sala de Trofeos 3D)"
Cohesion: 0.03
Nodes (131): loadPalmaresComps(), palmaresCompByKey(), getTrophyStyles(), _uid(), trophyClassica(), trophyImperial(), trophyKonami(), trophyOrejona() (+123 more)

### Community 8 - "Perfil y panel del presidente"
Cohesion: 0.06
Nodes (48): _pfEsc(), _pfPushEscLayer(), _pfPopEscLayer(), _pfCloseProfileModal(), _injectProfileModal(), _profileFocusables(), _onProfileOpen(), _onProfileClose() (+40 more)

### Community 12 - "Bracket publico"
Cohesion: 0.21
Nodes (19): _pbEsc(), _pbFmtDate(), _pbTeamMap(), _pbTeamPublic(), _pbTrophyHTML(), _pbWinBadge(), _pbBracketCards(), _pbCrestMini() (+11 more)

### Community 7 - "Push, ajustes y actualizador"
Cohesion: 0.07
Nodes (48): _plugin(), isEnabled(), _clearToken(), _setPendingTokenRemoval(), _clearPendingTokenRemoval(), _pushDocRef(), _currentTimezone(), _syncTokenToFirestore() (+40 more)

### Community 21 - "Estado global"
Cohesion: 1.0
Nodes (0): 

## Knowledge Gaps
- **Thin community `Selector de color`** (2 nodes): `color-picker.js`, `openColorPicker()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Config Firebase (ejemplo)`** (1 nodes): `firebase-config.example.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Config Firebase`** (1 nodes): `firebase-config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Estado global`** (1 nodes): `state.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dbGetAll()` connect `Bracket, partidos y playoff` to `Palmares (Sala de Trofeos 3D)`, `Navegacion y paginas publicas`, `Historial y H2H`, `Sorteo en vivo`, `Equipos y animacion de UI`, `Push, ajustes y actualizador`, `Capa de datos y fixture`, `Calendario`, `Bracket publico`, `Competiciones`, `Export / import de datos`?**
  _High betweenness centrality (0.274) - this node is a cross-community bridge._
- **Why does `showToast()` connect `Bracket, partidos y playoff` to `Palmares (Sala de Trofeos 3D)`, `Navegacion y paginas publicas`, `Historial y H2H`, `Sorteo en vivo`, `Push, ajustes y actualizador`, `Perfil y panel del presidente`, `Capa de datos y fixture`, `Tablas de posiciones`, `Auth y registro`, `Competiciones`, `Export / import de datos`?**
  _High betweenness centrality (0.166) - this node is a cross-community bridge._
- **Why does `dbGet()` connect `Bracket, partidos y playoff` to `Palmares (Sala de Trofeos 3D)`, `Navegacion y paginas publicas`, `Sorteo en vivo`, `Equipos y animacion de UI`, `Perfil y panel del presidente`, `Capa de datos y fixture`, `Tablas de posiciones`, `Bracket publico`, `Competiciones`?**
  _High betweenness centrality (0.116) - this node is a cross-community bridge._
- **Are the 120 inferred relationships involving `dbGetAll()` (e.g. with `getTeamLogo()` and `renderBracket()`) actually correct?**
  _`dbGetAll()` has 120 INFERRED edges - model-reasoned connections that need verification._
- **Are the 85 inferred relationships involving `dbGet()` (e.g. with `renderBracket()` and `getStandingsForPhase()`) actually correct?**
  _`dbGet()` has 85 INFERRED edges - model-reasoned connections that need verification._
- **Are the 69 inferred relationships involving `showToast()` (e.g. with `authForgotPassword()` and `authSignOut()`) actually correct?**
  _`showToast()` has 69 INFERRED edges - model-reasoned connections that need verification._
- **Are the 56 inferred relationships involving `dbPut()` (e.g. with `_syncBracketSlotsForSourcePhase()` and `_syncOwnBracketRounds()`) actually correct?**
  _`dbPut()` has 56 INFERRED edges - model-reasoned connections that need verification._