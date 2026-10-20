# Graph Report - .  (2026-10-19)

## Corpus Check
- solo AST

## Summary
- 1037 nodes · 2904 edges · 19 communities detected
- Extraction: 71% EXTRACTED · 29% INFERRED · 0% AMBIGUOUS · INFERRED: 841 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Auth y registro|Auth y registro]]
- [[_COMMUNITY_Historial y H2H|Historial y H2H]]
- [[_COMMUNITY_Perfil y panel del presidente|Perfil y panel del presidente]]
- [[_COMMUNITY_Navegacion y paginas publicas|Navegacion y paginas publicas]]
- [[_COMMUNITY_Palmares (Sala de Trofeos 3D)|Palmares (Sala de Trofeos 3D)]]
- [[_COMMUNITY_Calendario|Calendario]]
- [[_COMMUNITY_Push, ajustes y actualizador|Push, ajustes y actualizador]]
- [[_COMMUNITY_Equipos y animacion de UI|Equipos y animacion de UI]]
- [[_COMMUNITY_Tablas de posiciones|Tablas de posiciones]]
- [[_COMMUNITY_Sonido y efectos de partido|Sonido y efectos de partido]]
- [[_COMMUNITY_Competiciones|Competiciones]]
- [[_COMMUNITY_Export  import de datos|Export / import de datos]]
- [[_COMMUNITY_Capa de datos y fixture|Capa de datos y fixture]]
- [[_COMMUNITY_Promo APK|Promo APK]]
- [[_COMMUNITY_Config Cloudinary|Config Cloudinary]]
- [[_COMMUNITY_Sorteo en vivo|Sorteo en vivo]]
- [[_COMMUNITY_Bracket, partidos y playoff|Bracket, partidos y playoff]]
- [[_COMMUNITY_Bracket publico|Bracket publico]]
- [[_COMMUNITY_Selector de color|Selector de color]]

## God Nodes (most connected - your core abstractions)
1. `dbGetAll()` - 141 edges
2. `dbGet()` - 96 edges
3. `showToast()` - 87 edges
4. `dbPut()` - 60 edges
5. `dbAdd()` - 31 edges
6. `dbErrorMsg()` - 27 edges
7. `invalidateStandingsAndSyncBrackets()` - 22 edges
8. `renderAdminPage()` - 22 edges
9. `getForSeason()` - 21 edges
10. `activeBombo()` - 21 edges

## Surprising Connections (you probably didn't know these)
- `_calCenterAnchorScroll()` --calls--> `_focusPublicSectionInner()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\calendar.js → D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\nav.js
- `_calInitHeroCountdown()` --calls--> `countdown()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\calendar.js → D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\motion.js
- `openBulkCoinsModal()` --calls--> `dbGetAll()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\coins.js → D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\db.js
- `dbMirrorInvalidate()` --calls--> `drawNext()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\db.js → D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\sorteo.js
- `dbGet()` --calls--> `getCustomCriterionName()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\db.js → D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\standings.js

## Communities

### Community 13 - "Auth y registro"
Cohesion: 0.36
Nodes (9): _apkIsNativeApp(), _apkShouldOffer(), _apkAlreadyDownloaded(), _apkClosedRecently(), openApkPromo(), _apkHideOverlay(), closeApkPromo(), tscApkDownloadClick() (+1 more)

### Community 3 - "Historial y H2H"
Cohesion: 0.04
Nodes (69): _authEsc(), _usersCol(), _injectAuthModal(), openAuthModal(), toggleAuthMode(), _renderAuthModalMode(), authForgotPassword(), authSubmit() (+61 more)

### Community 8 - "Perfil y panel del presidente"
Cohesion: 0.06
Nodes (51): authSignOut(), getVariant(), _plugin(), isEnabled(), _clearToken(), _setPendingTokenRemoval(), _clearPendingTokenRemoval(), _pushDocRef() (+43 more)

### Community 2 - "Navegacion y paginas publicas"
Cohesion: 0.04
Nodes (112): getWinner(), spawnRocket(), loop(), _cleanup(), _onClick(), renderBracket(), buildBracketRounds(), getStandingsForPhase() (+104 more)

### Community 1 - "Palmares (Sala de Trofeos 3D)"
Cohesion: 0.04
Nodes (127): getTeamLogo(), deleteBracketMatch(), calClearSchedule(), notifyStreamTodayClick(), _calDoSaveDayLabel(), renderAdmCoins(), closeCoinsModal(), saveCoinsTransaction() (+119 more)

### Community 10 - "Calendario"
Cohesion: 0.08
Nodes (39): teamLogoHtml(), refBadgeHTML(), renderCoinsTable(), filterCoinsTable(), openCoinsModal(), updateCoinsPreview(), openCoinsHistory(), openBulkCoinsModal() (+31 more)

### Community 7 - "Push, ajustes y actualizador"
Cohesion: 0.06
Nodes (43): _getAudioCtx(), resume(), _fwSoundOff(), _soundRocketLaunch(), _soundExplosion(), rgbStr(), Particle, Rocket (+35 more)

### Community 6 - "Equipos y animacion de UI"
Cohesion: 0.07
Nodes (68): hexToRgb(), lighten(), newBomboId(), newBombo(), emptyState(), _journalCapturePhase(), _journalCaptureMatches(), effectiveDrawnIds() (+60 more)

### Community 11 - "Tablas de posiciones"
Cohesion: 0.12
Nodes (30): _esc(), _calFormatDay(), _calTodayStr(), _calViewerTodayStr(), _calMatchInstant(), _calMatchTimeLocal(), _calLocalDateStr(), _calJornadaViewerDate() (+22 more)

### Community 5 - "Sonido y efectos de partido"
Cohesion: 0.06
Nodes (70): _calHeroGoComp(), _pubSwitchHistoryView(), liveStop(), liveRadarStop(), getPublicScrollPages(), getMountedPublicPages(), _isPublicScrollPage(), _syncPublicNavigation() (+62 more)

### Community 14 - "Competiciones"
Cohesion: 1.0
Nodes (2): cloudReady(), uploadImageToCloud()

### Community 15 - "Export / import de datos"
Cohesion: 1.0
Nodes (0): 

### Community 9 - "Capa de datos y fixture"
Cohesion: 0.07
Nodes (39): resize(), frame(), wake(), stop(), setVariant(), init(), reduced(), _settle() (+31 more)

### Community 16 - "Promo APK"
Cohesion: 1.0
Nodes (0): 

### Community 17 - "Config Cloudinary"
Cohesion: 1.0
Nodes (0): 

### Community 4 - "Sorteo en vivo"
Cohesion: 0.06
Nodes (72): _histNorm(), _histResolveExactTeam(), _histResolveTeam(), computeResultado(), _esc(), loadStaticHistory(), cleanLegacyImportedFromIDB(), seedHistoryIfEmpty() (+64 more)

### Community 0 - "Bracket, partidos y playoff"
Cohesion: 0.03
Nodes (132): loadPalmaresComps(), palmaresCompByKey(), getTrophyStyles(), _uid(), trophyClassica(), trophyImperial(), trophyKonami(), trophyOrejona() (+124 more)

### Community 12 - "Bracket publico"
Cohesion: 0.11
Nodes (26): getCustomCriterionName(), saveCriteria(), calcGroupStandings(), openCriteriaModal(), closeCriteriaModal(), criteriaDragEnd(), criteriaDrop(), criteriaDropOnContainer() (+18 more)

### Community 18 - "Selector de color"
Cohesion: 1.0
Nodes (0): 

## Knowledge Gaps
- **Thin community `Export / import de datos`** (2 nodes): `color-picker.js`, `openColorPicker()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Promo APK`** (1 nodes): `firebase-config.example.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Config Cloudinary`** (1 nodes): `firebase-config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Selector de color`** (1 nodes): `state.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dbGetAll()` connect `Palmares (Sala de Trofeos 3D)` to `Bracket, partidos y playoff`, `Navegacion y paginas publicas`, `Historial y H2H`, `Sorteo en vivo`, `Sonido y efectos de partido`, `Equipos y animacion de UI`, `Perfil y panel del presidente`, `Capa de datos y fixture`, `Calendario`, `Tablas de posiciones`, `Bracket publico`?**
  _High betweenness centrality (0.317) - this node is a cross-community bridge._
- **Why does `showToast()` connect `Palmares (Sala de Trofeos 3D)` to `Bracket, partidos y playoff`, `Navegacion y paginas publicas`, `Historial y H2H`, `Sorteo en vivo`, `Sonido y efectos de partido`, `Equipos y animacion de UI`, `Perfil y panel del presidente`, `Bracket publico`?**
  _High betweenness centrality (0.145) - this node is a cross-community bridge._
- **Why does `dbGet()` connect `Navegacion y paginas publicas` to `Bracket, partidos y playoff`, `Palmares (Sala de Trofeos 3D)`, `Historial y H2H`, `Sonido y efectos de partido`, `Equipos y animacion de UI`, `Calendario`, `Tablas de posiciones`, `Bracket publico`?**
  _High betweenness centrality (0.094) - this node is a cross-community bridge._
- **Are the 134 inferred relationships involving `dbGetAll()` (e.g. with `getTeamLogo()` and `renderBracket()`) actually correct?**
  _`dbGetAll()` has 134 INFERRED edges - model-reasoned connections that need verification._
- **Are the 92 inferred relationships involving `dbGet()` (e.g. with `renderBracket()` and `getStandingsForPhase()`) actually correct?**
  _`dbGet()` has 92 INFERRED edges - model-reasoned connections that need verification._
- **Are the 83 inferred relationships involving `showToast()` (e.g. with `authForgotPassword()` and `authSignOut()`) actually correct?**
  _`showToast()` has 83 INFERRED edges - model-reasoned connections that need verification._
- **Are the 56 inferred relationships involving `dbPut()` (e.g. with `_syncBracketSlotsForSourcePhase()` and `_syncOwnBracketRounds()`) actually correct?**
  _`dbPut()` has 56 INFERRED edges - model-reasoned connections that need verification._