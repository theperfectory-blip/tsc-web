# Graph Report - .  (2026-11-20)

## Corpus Check
- solo AST

## Summary
- 1798 nodes · 5030 edges · 29 communities detected
- Extraction: 78% EXTRACTED · 22% INFERRED · 0% AMBIGUOUS · INFERRED: 1097 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Promo APK|Promo APK]]
- [[_COMMUNITY_Perfil del presidente|Perfil del presidente]]
- [[_COMMUNITY_Splash de arranque|Splash de arranque]]
- [[_COMMUNITY_Bracket|Bracket]]
- [[_COMMUNITY_YuNaCoins|YuNaCoins]]
- [[_COMMUNITY_Sonido|Sonido]]
- [[_COMMUNITY_Sorteo en vivo|Sorteo en vivo]]
- [[_COMMUNITY_Tablas de posiciones|Tablas de posiciones]]
- [[_COMMUNITY_Calendario|Calendario]]
- [[_COMMUNITY_Historial y H2H|Historial y H2H]]
- [[_COMMUNITY_Config Cloudinary (ejemplo)|Config Cloudinary (ejemplo)]]
- [[_COMMUNITY_yunacoins-rules.js|yunacoins-rules.js]]
- [[_COMMUNITY_Equipos|Equipos]]
- [[_COMMUNITY_Capa de datos|Capa de datos]]
- [[_COMMUNITY_Delegacion de eventos|Delegacion de eventos]]
- [[_COMMUNITY_Config Firebase (ejemplo)|Config Firebase (ejemplo)]]
- [[_COMMUNITY_Config Firebase|Config Firebase]]
- [[_COMMUNITY_Generador de fechas|Generador de fechas]]
- [[_COMMUNITY_mejoras-page.js|mejoras-page.js]]
- [[_COMMUNITY_pes5-tool.js|pes5-tool.js]]
- [[_COMMUNITY_Palmares (Sala de Trofeos 3D)|Palmares (Sala de Trofeos 3D)]]
- [[_COMMUNITY_pes5-bloqueo.js|pes5-bloqueo.js]]
- [[_COMMUNITY_pes5-clubes.js|pes5-clubes.js]]
- [[_COMMUNITY_pes5-crypt.js|pes5-crypt.js]]
- [[_COMMUNITY_pes5-editor.js|pes5-editor.js]]
- [[_COMMUNITY_pes5-save.js|pes5-save.js]]
- [[_COMMUNITY_Push y Ajustes y arranque|Push y Ajustes y arranque]]
- [[_COMMUNITY_save-publicado.js|save-publicado.js]]
- [[_COMMUNITY_Estado global|Estado global]]

## God Nodes (most connected - your core abstractions)
1. `dbGetAll()` - 140 edges
2. `escHtml()` - 132 edges
3. `showToast()` - 117 edges
4. `dbGet()` - 76 edges
5. `aplicarPedidosSeleccionados()` - 39 edges
6. `_bloqueadoPorPausa()` - 36 edges
7. `dbErrorMsg()` - 34 edges
8. `showConfirm()` - 33 edges
9. `dbPut()` - 32 edges
10. `showMiniToast()` - 31 edges

## Surprising Connections (you probably didn't know these)
- `_calInitHeroCountdown()` --calls--> `countdown()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\emparejar-80\tsc-src\js\calendar.js → D:\Desktop\tsc.web\.claude\worktrees\emparejar-80\tsc-src\js\motion.js
- `dbGetAll()` --calls--> `_palmDuplicate()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\emparejar-80\tsc-src\js\db.js → D:\Desktop\tsc.web\.claude\worktrees\emparejar-80\tsc-src\js\palmares.js
- `getForSeason()` --calls--> `resolveTeamData()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\emparejar-80\tsc-src\js\db.js → D:\Desktop\tsc.web\.claude\worktrees\emparejar-80\tsc-src\js\standings.js
- `_htStatHeadCell()` --calls--> `escHtml()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\emparejar-80\tsc-src\js\history.js → D:\Desktop\tsc.web\.claude\worktrees\emparejar-80\tsc-src\js\sanitize.js
- `remainingForPlayer()` --calls--> `bonoSuscriptor()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\emparejar-80\tsc-src\js\mejoras-page.js → D:\Desktop\tsc.web\.claude\worktrees\emparejar-80\tsc-src\js\yunacoins-rules.js

## Communities

### Community 17 - "Promo APK"
Cohesion: 0.36
Nodes (9): _apkIsNativeApp(), _apkShouldOffer(), _apkAlreadyDownloaded(), _apkClosedRecently(), openApkPromo(), _apkHideOverlay(), closeApkPromo(), tscApkDownloadClick() (+1 more)

### Community 8 - "Perfil del presidente"
Cohesion: 0.04
Nodes (65): _usersCol(), _injectAuthModal(), openAuthModal(), toggleAuthMode(), _renderAuthModalMode(), authForgotPassword(), authSubmit(), _authErrorMsg() (+57 more)

### Community 19 - "Splash de arranque"
Cohesion: 0.4
Nodes (0): 

### Community 1 - "Bracket"
Cohesion: 0.02
Nodes (220): getWinner(), spawnRocket(), loop(), _cleanup(), _onClick(), renderBracket(), buildBracketRounds(), getStandingsForPhase() (+212 more)

### Community 6 - "YuNaCoins"
Cohesion: 0.05
Nodes (84): teamLogoHtml(), _coinsRun(), _coinsTemporadaInfo(), _coinsTemporadaCobro(), _coinsAmount(), renderAdmCoins(), renderCoinsTable(), filterCoinsTable() (+76 more)

### Community 10 - "Sonido"
Cohesion: 0.06
Nodes (45): _getAudioCtx(), resume(), _fwSoundOff(), _soundRocketLaunch(), _soundExplosion(), rgbStr(), Particle, Rocket (+37 more)

### Community 7 - "Sorteo en vivo"
Cohesion: 0.06
Nodes (78): hexToRgb(), lighten(), _mxDeleteOps(), newBomboId(), newBombo(), emptyState(), _journalCapturePhase(), _journalCaptureMatches() (+70 more)

### Community 14 - "Tablas de posiciones"
Cohesion: 0.12
Nodes (22): refBadgeHTML(), saveCriteria(), openCriteriaModal(), closeCriteriaModal(), criteriaDragEnd(), criteriaDrop(), criteriaDropOnContainer(), criteriaDisable() (+14 more)

### Community 4 - "Calendario"
Cohesion: 0.04
Nodes (109): _calFormatDay(), _calTodayStr(), _calViewerTodayStr(), _calMatchInstant(), _calMatchTimeLocal(), _calLocalDateStr(), _calJornadaViewerDate(), _calLogo() (+101 more)

### Community 9 - "Historial y H2H"
Cohesion: 0.06
Nodes (68): _calHeroGoH2H(), _histNorm(), _histResolveExactTeam(), _histResolveTeam(), computeResultado(), loadStaticHistory(), seedHistoryIfEmpty(), _histLoadCtx() (+60 more)

### Community 20 - "Config Cloudinary (ejemplo)"
Cohesion: 1.0
Nodes (2): cloudReady(), uploadImageToCloud()

### Community 5 - "yunacoins-rules.js"
Cohesion: 0.04
Nodes (104): openColorPicker(), _compPickColor(), cargarTopeTemporada(), _topeAtributoVigente(), _perfilTool(), _costoTool(), _resumenLineas(), cobrarMejorasEquipo() (+96 more)

### Community 12 - "Equipos"
Cohesion: 0.07
Nodes (39): resize(), frame(), wake(), stop(), setVariant(), getVariant(), init(), reduced() (+31 more)

### Community 13 - "Capa de datos"
Cohesion: 0.09
Nodes (40): exportFullDB(), downloadJSON(), _dataBackupStores(), _dataTypeOk(), _dataValidateRecord(), _dataValidateStoreItems(), _dataValidateBackup(), _dataWarnings() (+32 more)

### Community 16 - "Delegacion de eventos"
Cohesion: 0.2
Nodes (6): _onTokens(), _onParse(), _onIsNative(), _onEventFor(), _onResolve(), _onRun()

### Community 21 - "Config Firebase (ejemplo)"
Cohesion: 1.0
Nodes (0): 

### Community 22 - "Config Firebase"
Cohesion: 1.0
Nodes (0): 

### Community 15 - "Generador de fechas"
Cohesion: 0.19
Nodes (10): _fxScheduledCount(), _fxShuffle(), fxBuildRoundRobin(), fxBuildLuisRoute(), _fxBuildLuisRouteForLegs(), _fxGenerateCalendarAndRoute(), fxShuffleAgain(), renderFixtureGenModal() (+2 more)

### Community 0 - "mejoras-page.js"
Cohesion: 0.02
Nodes (293): jsq(), openModal(), closeModal(), _syncScrollLock(), showToast(), renderAuthUI(), puedeMandarPedido(), applyTheme() (+285 more)

### Community 2 - "pes5-tool.js"
Cohesion: 0.02
Nodes (211): desmontar(), plantillaParaEditor(), contenidoDelEquipo(), plantillaDesactualizada(), desactualizadas(), debeReescribirPublicacion(), saveMasViejoQuePublicado(), pedidosDeEquipos() (+203 more)

### Community 3 - "Palmares (Sala de Trofeos 3D)"
Cohesion: 0.03
Nodes (118): palmaresCompByKey(), getTrophyStyles(), _uid(), trophyClassica(), trophyImperial(), trophyKonami(), trophyOrejona(), trophySobria() (+110 more)

### Community 23 - "pes5-bloqueo.js"
Cohesion: 1.0
Nodes (0): 

### Community 18 - "pes5-clubes.js"
Cohesion: 0.62
Nodes (6): activos(), vinculado(), duenosDeClub(), otroEquipoConClub(), repetidoDe(), opcionesClub()

### Community 24 - "pes5-crypt.js"
Cohesion: 1.0
Nodes (0): 

### Community 25 - "pes5-editor.js"
Cohesion: 1.0
Nodes (0): 

### Community 26 - "pes5-save.js"
Cohesion: 1.0
Nodes (0): 

### Community 11 - "Push y Ajustes y arranque"
Cohesion: 0.07
Nodes (47): _plugin(), isEnabled(), _clearToken(), _setPendingTokenRemoval(), _clearPendingTokenRemoval(), _pushDocRef(), _currentTimezone(), _syncTokenToFirestore() (+39 more)

### Community 27 - "save-publicado.js"
Cohesion: 1.0
Nodes (0): 

### Community 28 - "Estado global"
Cohesion: 1.0
Nodes (0): 

## Knowledge Gaps
- **Thin community `Config Firebase (ejemplo)`** (1 nodes): `firebase-config.example.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Config Firebase`** (1 nodes): `firebase-config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `pes5-bloqueo.js`** (1 nodes): `pes5-bloqueo.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `pes5-crypt.js`** (1 nodes): `pes5-crypt.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `pes5-editor.js`** (1 nodes): `pes5-editor.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `pes5-save.js`** (1 nodes): `pes5-save.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `save-publicado.js`** (1 nodes): `save-publicado.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Estado global`** (1 nodes): `state.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `escHtml()` connect `YuNaCoins` to `mejoras-page.js`, `Bracket`, `pes5-tool.js`, `Palmares (Sala de Trofeos 3D)`, `Calendario`, `yunacoins-rules.js`, `Sorteo en vivo`, `Perfil del presidente`, `Historial y H2H`, `Push y Ajustes y arranque`, `Equipos`, `Tablas de posiciones`?**
  _High betweenness centrality (0.244) - this node is a cross-community bridge._
- **Why does `dbGetAll()` connect `Bracket` to `mejoras-page.js`, `pes5-tool.js`, `Palmares (Sala de Trofeos 3D)`, `Calendario`, `yunacoins-rules.js`, `YuNaCoins`, `Sorteo en vivo`, `Historial y H2H`, `Equipos`, `Capa de datos`?**
  _High betweenness centrality (0.188) - this node is a cross-community bridge._
- **Why does `showToast()` connect `Bracket` to `pes5-tool.js`, `Palmares (Sala de Trofeos 3D)`, `Calendario`, `yunacoins-rules.js`, `YuNaCoins`, `Sorteo en vivo`, `Perfil del presidente`, `Historial y H2H`, `Sonido`, `Push y Ajustes y arranque`, `Capa de datos`, `Tablas de posiciones`, `Generador de fechas`?**
  _High betweenness centrality (0.178) - this node is a cross-community bridge._
- **Are the 137 inferred relationships involving `dbGetAll()` (e.g. with `renderBracket()` and `getStandingsForPhase()`) actually correct?**
  _`dbGetAll()` has 137 INFERRED edges - model-reasoned connections that need verification._
- **Are the 130 inferred relationships involving `escHtml()` (e.g. with `authForgotPassword()` and `teamLogoHtml()`) actually correct?**
  _`escHtml()` has 130 INFERRED edges - model-reasoned connections that need verification._
- **Are the 113 inferred relationships involving `showToast()` (e.g. with `authForgotPassword()` and `authSignOut()`) actually correct?**
  _`showToast()` has 113 INFERRED edges - model-reasoned connections that need verification._
- **Are the 73 inferred relationships involving `dbGet()` (e.g. with `renderBracket()` and `getStandingsForPhase()`) actually correct?**
  _`dbGet()` has 73 INFERRED edges - model-reasoned connections that need verification._