# Graph Report - .  (2026-10-20)

## Corpus Check
- solo AST

## Summary
- 1089 nodes · 3045 edges · 21 communities detected
- Extraction: 70% EXTRACTED · 30% INFERRED · 0% AMBIGUOUS · INFERRED: 910 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Export  import de datos|Export / import de datos]]
- [[_COMMUNITY_Historial y H2H|Historial y H2H]]
- [[_COMMUNITY_Capa de datos y fixture|Capa de datos y fixture]]
- [[_COMMUNITY_Bracket, partidos y playoff|Bracket, partidos y playoff]]
- [[_COMMUNITY_Perfil y panel del presidente|Perfil y panel del presidente]]
- [[_COMMUNITY_Push, ajustes y actualizador|Push, ajustes y actualizador]]
- [[_COMMUNITY_Navegacion y paginas publicas|Navegacion y paginas publicas]]
- [[_COMMUNITY_Bracket publico|Bracket publico]]
- [[_COMMUNITY_Equipos y animacion de UI|Equipos y animacion de UI]]
- [[_COMMUNITY_Promo APK|Promo APK]]
- [[_COMMUNITY_Config Cloudinary|Config Cloudinary]]
- [[_COMMUNITY_Tablas de posiciones|Tablas de posiciones]]
- [[_COMMUNITY_Calendario|Calendario]]
- [[_COMMUNITY_Selector de color|Selector de color]]
- [[_COMMUNITY_Config Firebase (ejemplo)|Config Firebase (ejemplo)]]
- [[_COMMUNITY_Competiciones|Competiciones]]
- [[_COMMUNITY_Sorteo en vivo|Sorteo en vivo]]
- [[_COMMUNITY_Sonido y efectos de partido|Sonido y efectos de partido]]
- [[_COMMUNITY_Palmares (Sala de Trofeos 3D)|Palmares (Sala de Trofeos 3D)]]
- [[_COMMUNITY_Auth y registro|Auth y registro]]
- [[_COMMUNITY_Config Firebase|Config Firebase]]

## God Nodes (most connected - your core abstractions)
1. `dbGetAll()` - 147 edges
2. `dbGet()` - 101 edges
3. `showToast()` - 100 edges
4. `dbPut()` - 59 edges
5. `dbErrorMsg()` - 34 edges
6. `dbAdd()` - 33 edges
7. `showConfirm()` - 30 edges
8. `invalidateStandingsAndSyncBrackets()` - 23 edges
9. `renderAdminPage()` - 22 edges
10. `getForSeason()` - 21 edges

## Surprising Connections (you probably didn't know these)
- `getTeamLogo()` --calls--> `dbGetAll()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\bracket.js → D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\db.js
- `deleteBracketMatch()` --calls--> `showConfirm()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\bracket.js → D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\ui-utils.js
- `_deletePhaseCascade()` --calls--> `dbDeleteMany()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\competitions.js → D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\db.js
- `dbGetAll()` --calls--> `_palmDuplicate()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\db.js → D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\palmares.js
- `dbGet()` --calls--> `getCustomCriterionName()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\db.js → D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\standings.js

## Communities

### Community 15 - "Export / import de datos"
Cohesion: 0.36
Nodes (9): _apkIsNativeApp(), _apkShouldOffer(), _apkAlreadyDownloaded(), _apkClosedRecently(), openApkPromo(), _apkHideOverlay(), closeApkPromo(), tscApkDownloadClick() (+1 more)

### Community 3 - "Historial y H2H"
Cohesion: 0.04
Nodes (71): _authEsc(), _usersCol(), _injectAuthModal(), openAuthModal(), toggleAuthMode(), _renderAuthModalMode(), authForgotPassword(), authSubmit() (+63 more)

### Community 9 - "Capa de datos y fixture"
Cohesion: 0.06
Nodes (49): authSignOut(), getVariant(), _plugin(), isEnabled(), _clearToken(), _setPendingTokenRemoval(), _clearPendingTokenRemoval(), _pushDocRef() (+41 more)

### Community 0 - "Bracket, partidos y playoff"
Cohesion: 0.04
Nodes (140): getWinner(), getTeamLogo(), hexToRgb(), lighten(), spawnRocket(), loop(), _cleanup(), _onClick() (+132 more)

### Community 8 - "Perfil y panel del presidente"
Cohesion: 0.06
Nodes (52): teamLogoHtml(), refBadgeHTML(), openCompModal(), liveSubscribe(), _esc(), _subscribeAdminMatchesLive(), onMatchGroupChange(), renderMatchesList() (+44 more)

### Community 7 - "Push, ajustes y actualizador"
Cohesion: 0.06
Nodes (44): _getAudioCtx(), resume(), _fwSoundOff(), _soundRocketLaunch(), _soundExplosion(), rgbStr(), Particle, Rocket (+36 more)

### Community 2 - "Navegacion y paginas publicas"
Cohesion: 0.05
Nodes (82): renderAdmCalendarLabels(), _coinsSeasonLocked(), _coinsAmount(), renderAdmCoins(), renderCoinsTable(), filterCoinsTable(), updateCoinsPreview(), openCoinsHistory() (+74 more)

### Community 12 - "Bracket publico"
Cohesion: 0.1
Nodes (37): _esc(), _calFormatDay(), _calTodayStr(), _calViewerTodayStr(), _calMatchInstant(), _calMatchTimeLocal(), _calLocalDateStr(), _calJornadaViewerDate() (+29 more)

### Community 6 - "Equipos y animacion de UI"
Cohesion: 0.06
Nodes (70): _calCenterAnchorScroll(), _calHeroGoComp(), liveStop(), ticker(), getPublicScrollPages(), getMountedPublicPages(), _isPublicScrollPage(), _syncPublicNavigation() (+62 more)

### Community 16 - "Promo APK"
Cohesion: 1.0
Nodes (2): cloudReady(), uploadImageToCloud()

### Community 17 - "Config Cloudinary"
Cohesion: 1.0
Nodes (0): 

### Community 11 - "Tablas de posiciones"
Cohesion: 0.08
Nodes (34): resize(), frame(), wake(), stop(), setVariant(), init(), reduced(), _settle() (+26 more)

### Community 10 - "Calendario"
Cohesion: 0.09
Nodes (42): _dataEsc(), exportFullDB(), downloadJSON(), _dataBackupStores(), _dataTypeOk(), _dataValidateRecord(), _dataValidateStoreItems(), _dataValidateBackup() (+34 more)

### Community 18 - "Selector de color"
Cohesion: 1.0
Nodes (0): 

### Community 19 - "Config Firebase (ejemplo)"
Cohesion: 1.0
Nodes (0): 

### Community 14 - "Competiciones"
Cohesion: 0.19
Nodes (11): _fxScheduledCount(), _fxShuffle(), fxBuildRoundRobin(), fxBuildLuisRoute(), _fxBuildLuisRouteForLegs(), _fxGenerateCalendarAndRoute(), fxGroupLockReason(), openFixtureGenModal() (+3 more)

### Community 4 - "Sorteo en vivo"
Cohesion: 0.06
Nodes (74): _histNorm(), _histResolveExactTeam(), _histResolveTeam(), computeResultado(), _esc(), loadStaticHistory(), cleanLegacyImportedFromIDB(), seedHistoryIfEmpty() (+66 more)

### Community 5 - "Sonido y efectos de partido"
Cohesion: 0.06
Nodes (72): _mxDeleteOps(), newBomboId(), newBombo(), emptyState(), _journalCapturePhase(), _journalCaptureMatches(), effectiveDrawnIds(), ensureBC() (+64 more)

### Community 1 - "Palmares (Sala de Trofeos 3D)"
Cohesion: 0.03
Nodes (120): palmaresCompByKey(), getTrophyStyles(), _uid(), trophyClassica(), trophyImperial(), trophyKonami(), trophyOrejona(), trophySobria() (+112 more)

### Community 13 - "Auth y registro"
Cohesion: 0.13
Nodes (22): getCustomCriterionName(), openCriteriaModal(), closeCriteriaModal(), criteriaDragEnd(), criteriaDrop(), criteriaDropOnContainer(), criteriaDisable(), criteriaRestore() (+14 more)

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

- **Why does `dbGetAll()` connect `Navegacion y paginas publicas` to `Bracket, partidos y playoff`, `Palmares (Sala de Trofeos 3D)`, `Historial y H2H`, `Sorteo en vivo`, `Sonido y efectos de partido`, `Equipos y animacion de UI`, `Perfil y panel del presidente`, `Capa de datos y fixture`, `Calendario`, `Tablas de posiciones`, `Bracket publico`, `Competiciones`?**
  _High betweenness centrality (0.271) - this node is a cross-community bridge._
- **Why does `showToast()` connect `Bracket, partidos y playoff` to `Palmares (Sala de Trofeos 3D)`, `Navegacion y paginas publicas`, `Historial y H2H`, `Sorteo en vivo`, `Sonido y efectos de partido`, `Equipos y animacion de UI`, `Perfil y panel del presidente`, `Capa de datos y fixture`, `Calendario`, `Bracket publico`, `Auth y registro`, `Competiciones`?**
  _High betweenness centrality (0.186) - this node is a cross-community bridge._
- **Why does `dbGet()` connect `Bracket, partidos y playoff` to `Palmares (Sala de Trofeos 3D)`, `Navegacion y paginas publicas`, `Historial y H2H`, `Sorteo en vivo`, `Sonido y efectos de partido`, `Equipos y animacion de UI`, `Perfil y panel del presidente`, `Calendario`, `Bracket publico`, `Auth y registro`, `Competiciones`?**
  _High betweenness centrality (0.126) - this node is a cross-community bridge._
- **Are the 143 inferred relationships involving `dbGetAll()` (e.g. with `getTeamLogo()` and `renderBracket()`) actually correct?**
  _`dbGetAll()` has 143 INFERRED edges - model-reasoned connections that need verification._
- **Are the 97 inferred relationships involving `dbGet()` (e.g. with `renderBracket()` and `getStandingsForPhase()`) actually correct?**
  _`dbGet()` has 97 INFERRED edges - model-reasoned connections that need verification._
- **Are the 96 inferred relationships involving `showToast()` (e.g. with `authForgotPassword()` and `authSignOut()`) actually correct?**
  _`showToast()` has 96 INFERRED edges - model-reasoned connections that need verification._
- **Are the 54 inferred relationships involving `dbPut()` (e.g. with `_syncBracketSlotsForSourcePhase()` and `_syncOwnBracketRounds()`) actually correct?**
  _`dbPut()` has 54 INFERRED edges - model-reasoned connections that need verification._