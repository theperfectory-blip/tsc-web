# Graph Report - .  (2026-10-20)

## Corpus Check
- solo AST

## Summary
- 1070 nodes · 3027 edges · 22 communities detected
- Extraction: 68% EXTRACTED · 32% INFERRED · 0% AMBIGUOUS · INFERRED: 967 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Promo APK|Promo APK]]
- [[_COMMUNITY_Bracket publico|Bracket publico]]
- [[_COMMUNITY_Navegacion y paginas publicas|Navegacion y paginas publicas]]
- [[_COMMUNITY_Equipos y animacion de UI|Equipos y animacion de UI]]
- [[_COMMUNITY_Calendario|Calendario]]
- [[_COMMUNITY_Historial y H2H|Historial y H2H]]
- [[_COMMUNITY_Palmares (Sala de Trofeos 3D)|Palmares (Sala de Trofeos 3D)]]
- [[_COMMUNITY_Auth y registro|Auth y registro]]
- [[_COMMUNITY_Sorteo en vivo|Sorteo en vivo]]
- [[_COMMUNITY_Config Cloudinary|Config Cloudinary]]
- [[_COMMUNITY_Push, ajustes y actualizador|Push, ajustes y actualizador]]
- [[_COMMUNITY_Selector de color|Selector de color]]
- [[_COMMUNITY_Competiciones|Competiciones]]
- [[_COMMUNITY_Tablas de posiciones|Tablas de posiciones]]
- [[_COMMUNITY_Sonido y efectos de partido|Sonido y efectos de partido]]
- [[_COMMUNITY_Config Firebase (ejemplo)|Config Firebase (ejemplo)]]
- [[_COMMUNITY_Config Firebase|Config Firebase]]
- [[_COMMUNITY_Export  import de datos|Export / import de datos]]
- [[_COMMUNITY_Bracket, partidos y playoff|Bracket, partidos y playoff]]
- [[_COMMUNITY_Capa de datos y fixture|Capa de datos y fixture]]
- [[_COMMUNITY_Perfil y panel del presidente|Perfil y panel del presidente]]
- [[_COMMUNITY_Estado global|Estado global]]

## God Nodes (most connected - your core abstractions)
1. `dbGetAll()` - 147 edges
2. `dbGet()` - 101 edges
3. `showToast()` - 100 edges
4. `escHtml()` - 71 edges
5. `dbPut()` - 59 edges
6. `dbErrorMsg()` - 34 edges
7. `dbAdd()` - 33 edges
8. `showConfirm()` - 30 edges
9. `invalidateStandingsAndSyncBrackets()` - 23 edges
10. `renderAdminPage()` - 22 edges

## Surprising Connections (you probably didn't know these)
- `getTeamLogo()` --calls--> `dbGetAll()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\bracket.js → D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\db.js
- `_calCenterAnchorScroll()` --calls--> `_focusPublicSectionInner()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\calendar.js → D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\nav.js
- `openBulkCoinsModal()` --calls--> `dbGetAll()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\coins.js → D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\db.js
- `_deletePhaseCascade()` --calls--> `dbDeleteMany()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\competitions.js → D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\db.js
- `dbGetAll()` --calls--> `_palmDuplicate()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\db.js → D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\palmares.js

## Communities

### Community 16 - "Promo APK"
Cohesion: 0.36
Nodes (9): _apkIsNativeApp(), _apkShouldOffer(), _apkAlreadyDownloaded(), _apkClosedRecently(), openApkPromo(), _apkHideOverlay(), closeApkPromo(), tscApkDownloadClick() (+1 more)

### Community 12 - "Bracket publico"
Cohesion: 0.08
Nodes (25): _usersCol(), _injectAuthModal(), openAuthModal(), toggleAuthMode(), _renderAuthModalMode(), authForgotPassword(), authSubmit(), _authErrorMsg() (+17 more)

### Community 2 - "Navegacion y paginas publicas"
Cohesion: 0.05
Nodes (88): getWinner(), getTeamLogo(), spawnRocket(), loop(), _cleanup(), _onClick(), renderBracket(), buildBracketRounds() (+80 more)

### Community 6 - "Equipos y animacion de UI"
Cohesion: 0.07
Nodes (53): teamLogoHtml(), _calLogo(), _calCtaBtn(), _calHeroHtml(), _coinsSeasonLocked(), _coinsAmount(), renderAdmCoins(), renderCoinsTable() (+45 more)

### Community 10 - "Calendario"
Cohesion: 0.09
Nodes (38): _getAudioCtx(), resume(), _fwSoundOff(), _soundRocketLaunch(), _soundExplosion(), liveRadarStart(), _palmAudio(), _palmSoundOff() (+30 more)

### Community 3 - "Historial y H2H"
Cohesion: 0.06
Nodes (73): hexToRgb(), lighten(), newBomboId(), newBombo(), emptyState(), _journalCapturePhase(), effectiveDrawnIds(), ensureBC() (+65 more)

### Community 1 - "Palmares (Sala de Trofeos 3D)"
Cohesion: 0.05
Nodes (117): invalidateStandingsAndSyncBrackets(), deleteBracketMatch(), _calSeasonLocked(), calClearSchedule(), _calDoSaveDayLabel(), _coinsRun(), saveCoinsTransaction(), saveBulkCoins() (+109 more)

### Community 13 - "Auth y registro"
Cohesion: 0.1
Nodes (32): _calFormatDay(), _calTodayStr(), _calViewerTodayStr(), _calMatchInstant(), _calMatchTimeLocal(), _calLocalDateStr(), _calJornadaViewerDate(), _calWhenError() (+24 more)

### Community 4 - "Sorteo en vivo"
Cohesion: 0.06
Nodes (71): _calHeroGoComp(), _pubSwitchHistoryView(), liveStop(), liveSubscribe(), liveRadarStop(), _subscribeAdminMatchesLive(), getPublicScrollPages(), getMountedPublicPages() (+63 more)

### Community 17 - "Config Cloudinary"
Cohesion: 1.0
Nodes (2): cloudReady(), uploadImageToCloud()

### Community 7 - "Push, ajustes y actualizador"
Cohesion: 0.06
Nodes (47): cloudReady(), uploadImageToCloud(), resize(), frame(), wake(), stop(), setVariant(), getVariant() (+39 more)

### Community 18 - "Selector de color"
Cohesion: 1.0
Nodes (0): 

### Community 14 - "Competiciones"
Cohesion: 0.11
Nodes (27): _sortComps(), renderAdmComps(), renderCompsGrid(), closeCompModal(), saveComp(), _collectPhaseCascade(), _deletePhaseCascade(), _cascadeSummary() (+19 more)

### Community 11 - "Tablas de posiciones"
Cohesion: 0.09
Nodes (43): renderAdmData(), renderDBInfo(), exportFullDB(), downloadJSON(), _dataBackupStores(), _dataTypeOk(), _dataValidateRecord(), _dataValidateStoreItems() (+35 more)

### Community 5 - "Sonido y efectos de partido"
Cohesion: 0.06
Nodes (70): dbIsArchivedSeason(), _histNorm(), _histResolveExactTeam(), _histResolveTeam(), computeResultado(), loadStaticHistory(), cleanLegacyImportedFromIDB(), seedHistoryIfEmpty() (+62 more)

### Community 19 - "Config Firebase (ejemplo)"
Cohesion: 1.0
Nodes (0): 

### Community 20 - "Config Firebase"
Cohesion: 1.0
Nodes (0): 

### Community 15 - "Export / import de datos"
Cohesion: 0.19
Nodes (11): _fxScheduledCount(), _fxShuffle(), fxBuildRoundRobin(), fxBuildLuisRoute(), _fxBuildLuisRouteForLegs(), _fxGenerateCalendarAndRoute(), fxGroupLockReason(), openFixtureGenModal() (+3 more)

### Community 0 - "Bracket, partidos y playoff"
Cohesion: 0.03
Nodes (117): getTrophyStyles(), _uid(), trophyClassica(), trophyImperial(), trophyKonami(), trophyOrejona(), trophySobria(), trophyModerno() (+109 more)

### Community 9 - "Capa de datos y fixture"
Cohesion: 0.07
Nodes (46): _pfPushEscLayer(), _pfPopEscLayer(), _pfCloseProfileModal(), _injectProfileModal(), _profileFocusables(), _onProfileOpen(), _onProfileClose(), _profileTrapKeydown() (+38 more)

### Community 8 - "Perfil y panel del presidente"
Cohesion: 0.07
Nodes (46): _plugin(), isEnabled(), _clearToken(), _setPendingTokenRemoval(), _clearPendingTokenRemoval(), _pushDocRef(), _currentTimezone(), _syncTokenToFirestore() (+38 more)

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

- **Why does `dbGetAll()` connect `Palmares (Sala de Trofeos 3D)` to `Bracket, partidos y playoff`, `Navegacion y paginas publicas`, `Historial y H2H`, `Sorteo en vivo`, `Sonido y efectos de partido`, `Equipos y animacion de UI`, `Push, ajustes y actualizador`, `Tablas de posiciones`, `Bracket publico`, `Auth y registro`, `Competiciones`, `Export / import de datos`?**
  _High betweenness centrality (0.249) - this node is a cross-community bridge._
- **Why does `showToast()` connect `Palmares (Sala de Trofeos 3D)` to `Bracket, partidos y playoff`, `Navegacion y paginas publicas`, `Historial y H2H`, `Sorteo en vivo`, `Sonido y efectos de partido`, `Equipos y animacion de UI`, `Push, ajustes y actualizador`, `Perfil y panel del presidente`, `Capa de datos y fixture`, `Tablas de posiciones`, `Bracket publico`, `Auth y registro`, `Competiciones`, `Export / import de datos`?**
  _High betweenness centrality (0.141) - this node is a cross-community bridge._
- **Why does `escHtml()` connect `Equipos y animacion de UI` to `Bracket, partidos y playoff`, `Palmares (Sala de Trofeos 3D)`, `Navegacion y paginas publicas`, `Historial y H2H`, `Sorteo en vivo`, `Sonido y efectos de partido`, `Push, ajustes y actualizador`, `Perfil y panel del presidente`, `Capa de datos y fixture`, `Tablas de posiciones`, `Bracket publico`, `Auth y registro`?**
  _High betweenness centrality (0.114) - this node is a cross-community bridge._
- **Are the 143 inferred relationships involving `dbGetAll()` (e.g. with `getTeamLogo()` and `renderBracket()`) actually correct?**
  _`dbGetAll()` has 143 INFERRED edges - model-reasoned connections that need verification._
- **Are the 97 inferred relationships involving `dbGet()` (e.g. with `renderBracket()` and `getStandingsForPhase()`) actually correct?**
  _`dbGet()` has 97 INFERRED edges - model-reasoned connections that need verification._
- **Are the 96 inferred relationships involving `showToast()` (e.g. with `authForgotPassword()` and `authSignOut()`) actually correct?**
  _`showToast()` has 96 INFERRED edges - model-reasoned connections that need verification._
- **Are the 69 inferred relationships involving `escHtml()` (e.g. with `authForgotPassword()` and `teamLogoHtml()`) actually correct?**
  _`escHtml()` has 69 INFERRED edges - model-reasoned connections that need verification._