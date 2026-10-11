# Graph Report - .  (2026-10-10)

## Corpus Check
- solo AST

## Summary
- 997 nodes · 2710 edges · 21 communities detected
- Extraction: 73% EXTRACTED · 27% INFERRED · 0% AMBIGUOUS · INFERRED: 738 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Export  import de datos|Export / import de datos]]
- [[_COMMUNITY_Sonido y efectos de partido|Sonido y efectos de partido]]
- [[_COMMUNITY_Bracket, partidos y playoff|Bracket, partidos y playoff]]
- [[_COMMUNITY_Calendario|Calendario]]
- [[_COMMUNITY_Capa de datos y fixture|Capa de datos y fixture]]
- [[_COMMUNITY_Sorteo en vivo|Sorteo en vivo]]
- [[_COMMUNITY_Competiciones|Competiciones]]
- [[_COMMUNITY_Auth y registro|Auth y registro]]
- [[_COMMUNITY_Equipos y animacion de UI|Equipos y animacion de UI]]
- [[_COMMUNITY_Tablas de posiciones|Tablas de posiciones]]
- [[_COMMUNITY_Historial y H2H|Historial y H2H]]
- [[_COMMUNITY_Promo APK|Promo APK]]
- [[_COMMUNITY_Push, ajustes y actualizador|Push, ajustes y actualizador]]
- [[_COMMUNITY_Config Cloudinary|Config Cloudinary]]
- [[_COMMUNITY_Perfil y panel del presidente|Perfil y panel del presidente]]
- [[_COMMUNITY_Bracket publico|Bracket publico]]
- [[_COMMUNITY_Selector de color|Selector de color]]
- [[_COMMUNITY_Config Firebase (ejemplo)|Config Firebase (ejemplo)]]
- [[_COMMUNITY_Navegacion y paginas publicas|Navegacion y paginas publicas]]
- [[_COMMUNITY_Palmares (Sala de Trofeos 3D)|Palmares (Sala de Trofeos 3D)]]
- [[_COMMUNITY_Config Firebase|Config Firebase]]

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
- `openBulkCoinsModal()` --calls--> `dbGetAll()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\coins.js → D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\db.js
- `dbMirrorInvalidate()` --calls--> `drawNext()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\db.js → D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\sorteo.js
- `dbGetAll()` --calls--> `openSeasonModal()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\db.js → D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\seasons.js
- `dbGet()` --calls--> `getCustomCriterionName()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\db.js → D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\standings.js
- `goAdminPage()` --calls--> `openFasesForComp()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\nav.js → D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\phases.js

## Communities

### Community 15 - "Export / import de datos"
Cohesion: 0.36
Nodes (9): _apkIsNativeApp(), _apkShouldOffer(), _apkAlreadyDownloaded(), _apkClosedRecently(), openApkPromo(), _apkHideOverlay(), closeApkPromo(), tscApkDownloadClick() (+1 more)

### Community 5 - "Sonido y efectos de partido"
Cohesion: 0.05
Nodes (63): _authEsc(), _usersCol(), _injectAuthModal(), openAuthModal(), toggleAuthMode(), _renderAuthModalMode(), authForgotPassword(), authSubmit() (+55 more)

### Community 0 - "Bracket, partidos y playoff"
Cohesion: 0.04
Nodes (153): getWinner(), getTeamLogo(), spawnRocket(), loop(), _cleanup(), renderBracket(), buildBracketRounds(), getStandingsForPhase() (+145 more)

### Community 10 - "Calendario"
Cohesion: 0.1
Nodes (34): teamLogoHtml(), renderAdmCoins(), renderCoinsTable(), filterCoinsTable(), openCoinsModal(), updateCoinsPreview(), closeCoinsModal(), saveCoinsTransaction() (+26 more)

### Community 9 - "Capa de datos y fixture"
Cohesion: 0.08
Nodes (39): _getAudioCtx(), resume(), _soundRocketLaunch(), _soundExplosion(), liveRadarStart(), liveRadarStop(), _palmAudio(), _palmSoundOff() (+31 more)

### Community 4 - "Sorteo en vivo"
Cohesion: 0.07
Nodes (68): hexToRgb(), lighten(), newBomboId(), newBombo(), emptyState(), _journalCapturePhase(), _journalCaptureMatches(), effectiveDrawnIds() (+60 more)

### Community 14 - "Competiciones"
Cohesion: 0.15
Nodes (10): rgbStr(), Particle, Rocket, _uaEsc(), renderAdmUsuarios(), adminSetUserLock(), adminSetUserRole(), adminSetUserTeam() (+2 more)

### Community 13 - "Auth y registro"
Cohesion: 0.13
Nodes (23): refBadgeHTML(), getCustomCriterionName(), openCriteriaModal(), closeCriteriaModal(), criteriaDragEnd(), criteriaDrop(), criteriaDropOnContainer(), criteriaDisable() (+15 more)

### Community 6 - "Equipos y animacion de UI"
Cohesion: 0.06
Nodes (52): deleteBracketMatch(), notifyStreamTodayClick(), _sortComps(), renderAdmComps(), renderCompsGrid(), closeCompModal(), saveComp(), deleteComp() (+44 more)

### Community 11 - "Tablas de posiciones"
Cohesion: 0.12
Nodes (29): _esc(), _calFormatDay(), _calTodayStr(), _calMatchInstant(), _calMatchTimeLocal(), _calLocalDateStr(), _calJornadaViewerDate(), _calLogo() (+21 more)

### Community 3 - "Historial y H2H"
Cohesion: 0.06
Nodes (68): _calCenterAnchorScroll(), _calHeroGoH2H(), _calHeroGoComp(), _pubSwitchHistoryView(), liveStop(), liveSubscribe(), _subscribeAdminMatchesLive(), getPublicScrollPages() (+60 more)

### Community 16 - "Promo APK"
Cohesion: 1.0
Nodes (2): cloudReady(), uploadImageToCloud()

### Community 7 - "Push, ajustes y actualizador"
Cohesion: 0.06
Nodes (46): cloudReady(), uploadImageToCloud(), resize(), frame(), wake(), stop(), setVariant(), init() (+38 more)

### Community 17 - "Config Cloudinary"
Cohesion: 1.0
Nodes (0): 

### Community 8 - "Perfil y panel del presidente"
Cohesion: 0.07
Nodes (47): getVariant(), _plugin(), isEnabled(), _clearToken(), _setPendingTokenRemoval(), _clearPendingTokenRemoval(), _pushDocRef(), _currentTimezone() (+39 more)

### Community 12 - "Bracket publico"
Cohesion: 0.11
Nodes (25): _isFS(), _assertWritable(), initDB(), dbEnsureCounterAtLeast(), _fsMirrorEnabled(), _fsMirrorDrop(), _fsMirrorSweep(), _fsMirror() (+17 more)

### Community 18 - "Selector de color"
Cohesion: 1.0
Nodes (0): 

### Community 19 - "Config Firebase (ejemplo)"
Cohesion: 1.0
Nodes (0): 

### Community 2 - "Navegacion y paginas publicas"
Cohesion: 0.06
Nodes (71): _histNorm(), _histResolveExactTeam(), _histResolveTeam(), computeResultado(), _esc(), loadStaticHistory(), seedHistoryIfEmpty(), refreshHistoryForSeason() (+63 more)

### Community 1 - "Palmares (Sala de Trofeos 3D)"
Cohesion: 0.04
Nodes (116): palmaresCompByKey(), getTrophyStyles(), _uid(), trophyClassica(), trophyImperial(), trophyKonami(), trophyOrejona(), trophySobria() (+108 more)

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

- **Why does `dbGetAll()` connect `Bracket, partidos y playoff` to `Palmares (Sala de Trofeos 3D)`, `Navegacion y paginas publicas`, `Historial y H2H`, `Sorteo en vivo`, `Sonido y efectos de partido`, `Equipos y animacion de UI`, `Push, ajustes y actualizador`, `Calendario`, `Tablas de posiciones`, `Bracket publico`, `Auth y registro`, `Competiciones`?**
  _High betweenness centrality (0.268) - this node is a cross-community bridge._
- **Why does `showToast()` connect `Bracket, partidos y playoff` to `Palmares (Sala de Trofeos 3D)`, `Navegacion y paginas publicas`, `Historial y H2H`, `Sorteo en vivo`, `Sonido y efectos de partido`, `Equipos y animacion de UI`, `Push, ajustes y actualizador`, `Perfil y panel del presidente`, `Calendario`, `Bracket publico`, `Auth y registro`, `Competiciones`?**
  _High betweenness centrality (0.163) - this node is a cross-community bridge._
- **Why does `dbGet()` connect `Bracket, partidos y playoff` to `Palmares (Sala de Trofeos 3D)`, `Historial y H2H`, `Sorteo en vivo`, `Sonido y efectos de partido`, `Equipos y animacion de UI`, `Push, ajustes y actualizador`, `Calendario`, `Bracket publico`, `Auth y registro`?**
  _High betweenness centrality (0.109) - this node is a cross-community bridge._
- **Are the 120 inferred relationships involving `dbGetAll()` (e.g. with `getTeamLogo()` and `renderBracket()`) actually correct?**
  _`dbGetAll()` has 120 INFERRED edges - model-reasoned connections that need verification._
- **Are the 85 inferred relationships involving `dbGet()` (e.g. with `renderBracket()` and `getStandingsForPhase()`) actually correct?**
  _`dbGet()` has 85 INFERRED edges - model-reasoned connections that need verification._
- **Are the 69 inferred relationships involving `showToast()` (e.g. with `authForgotPassword()` and `authSignOut()`) actually correct?**
  _`showToast()` has 69 INFERRED edges - model-reasoned connections that need verification._
- **Are the 56 inferred relationships involving `dbPut()` (e.g. with `_syncBracketSlotsForSourcePhase()` and `_syncOwnBracketRounds()`) actually correct?**
  _`dbPut()` has 56 INFERRED edges - model-reasoned connections that need verification._