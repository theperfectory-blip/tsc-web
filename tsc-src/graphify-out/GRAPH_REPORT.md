# Graph Report - .  (2026-11-11)

## Corpus Check
- solo AST

## Summary
- 1416 nodes · 3747 edges · 30 communities detected
- Extraction: 75% EXTRACTED · 25% INFERRED · 0% AMBIGUOUS · INFERRED: 932 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Promo APK|Promo APK]]
- [[_COMMUNITY_Perfil del presidente|Perfil del presidente]]
- [[_COMMUNITY_Splash de arranque|Splash de arranque]]
- [[_COMMUNITY_Bracket|Bracket]]
- [[_COMMUNITY_Sonido|Sonido]]
- [[_COMMUNITY_Sorteo en vivo|Sorteo en vivo]]
- [[_COMMUNITY_Partidos|Partidos]]
- [[_COMMUNITY_Tablas de posiciones|Tablas de posiciones]]
- [[_COMMUNITY_Calendario|Calendario]]
- [[_COMMUNITY_Navegacion|Navegacion]]
- [[_COMMUNITY_Config Cloudinary (ejemplo)|Config Cloudinary (ejemplo)]]
- [[_COMMUNITY_Equipos|Equipos]]
- [[_COMMUNITY_pes5-yunacoins.js y yunacoins-rules.js|pes5-yunacoins.js y yunacoins-rules.js]]
- [[_COMMUNITY_Capa de datos|Capa de datos]]
- [[_COMMUNITY_Delegacion de eventos|Delegacion de eventos]]
- [[_COMMUNITY_Config Firebase (ejemplo)|Config Firebase (ejemplo)]]
- [[_COMMUNITY_Config Firebase|Config Firebase]]
- [[_COMMUNITY_Generador de fechas|Generador de fechas]]
- [[_COMMUNITY_Historial y H2H|Historial y H2H]]
- [[_COMMUNITY_Partido en vivo|Partido en vivo]]
- [[_COMMUNITY_mejoras-page.js|mejoras-page.js]]
- [[_COMMUNITY_pes5-tool.js|pes5-tool.js]]
- [[_COMMUNITY_Palmares (Sala de Trofeos 3D)|Palmares (Sala de Trofeos 3D)]]
- [[_COMMUNITY_pes5-bloqueo.js|pes5-bloqueo.js]]
- [[_COMMUNITY_pes5-clubes.js|pes5-clubes.js]]
- [[_COMMUNITY_pes5-crypt.js|pes5-crypt.js]]
- [[_COMMUNITY_pes5-editor.js|pes5-editor.js]]
- [[_COMMUNITY_pes5-save.js|pes5-save.js]]
- [[_COMMUNITY_Push y Ajustes y arranque|Push y Ajustes y arranque]]
- [[_COMMUNITY_Estado global|Estado global]]

## God Nodes (most connected - your core abstractions)
1. `dbGetAll()` - 131 edges
2. `showToast()` - 98 edges
3. `escHtml()` - 90 edges
4. `dbGet()` - 76 edges
5. `dbErrorMsg()` - 34 edges
6. `dbPut()` - 32 edges
7. `showConfirm()` - 32 edges
8. `renderAdminPage()` - 22 edges
9. `activeBombo()` - 21 edges
10. `_palmRenderSala()` - 20 edges

## Surprising Connections (you probably didn't know these)
- `deleteBracketMatch()` --calls--> `showConfirm()`  [INFERRED]
  D:\Desktop\tsc.web-tope\tsc-src\js\bracket.js → D:\Desktop\tsc.web-tope\tsc-src\js\ui-utils.js
- `_calCenterAnchorScroll()` --calls--> `_focusPublicSectionInner()`  [INFERRED]
  D:\Desktop\tsc.web-tope\tsc-src\js\calendar.js → D:\Desktop\tsc.web-tope\tsc-src\js\nav.js
- `_calInitHeroCountdown()` --calls--> `countdown()`  [INFERRED]
  D:\Desktop\tsc.web-tope\tsc-src\js\calendar.js → D:\Desktop\tsc.web-tope\tsc-src\js\motion.js
- `dbGetAll()` --calls--> `_palmDuplicate()`  [INFERRED]
  D:\Desktop\tsc.web-tope\tsc-src\js\db.js → D:\Desktop\tsc.web-tope\tsc-src\js\palmares.js
- `getForSeason()` --calls--> `resolveTeamData()`  [INFERRED]
  D:\Desktop\tsc.web-tope\tsc-src\js\db.js → D:\Desktop\tsc.web-tope\tsc-src\js\standings.js

## Communities

### Community 19 - "Promo APK"
Cohesion: 0.36
Nodes (9): _apkIsNativeApp(), _apkShouldOffer(), _apkAlreadyDownloaded(), _apkClosedRecently(), openApkPromo(), _apkHideOverlay(), closeApkPromo(), tscApkDownloadClick() (+1 more)

### Community 8 - "Perfil del presidente"
Cohesion: 0.04
Nodes (61): _usersCol(), _injectAuthModal(), openAuthModal(), toggleAuthMode(), _renderAuthModalMode(), authForgotPassword(), authSubmit(), _authErrorMsg() (+53 more)

### Community 21 - "Splash de arranque"
Cohesion: 0.4
Nodes (0): 

### Community 4 - "Bracket"
Cohesion: 0.04
Nodes (100): getWinner(), teamLogoHtml(), spawnRocket(), loop(), _cleanup(), _onClick(), renderBracket(), buildBracketRounds() (+92 more)

### Community 9 - "Sonido"
Cohesion: 0.06
Nodes (46): _getAudioCtx(), resume(), _fwSoundOff(), _soundRocketLaunch(), _soundExplosion(), rgbStr(), Particle, Rocket (+38 more)

### Community 5 - "Sorteo en vivo"
Cohesion: 0.06
Nodes (77): hexToRgb(), lighten(), newBomboId(), newBombo(), emptyState(), _journalCapturePhase(), _journalCaptureMatches(), effectiveDrawnIds() (+69 more)

### Community 2 - "Partidos"
Cohesion: 0.04
Nodes (116): invalidateStandingsCache(), resolveGroupRefsFor(), saveSlotRef(), _bkRefPhaseEditable(), removeSlotRef(), _calSeasonLocked(), _calDoSaveDayLabel(), renderAdmCalendarLabels() (+108 more)

### Community 15 - "Tablas de posiciones"
Cohesion: 0.12
Nodes (22): refBadgeHTML(), saveCriteria(), openCriteriaModal(), closeCriteriaModal(), criteriaDragEnd(), criteriaDrop(), criteriaDropOnContainer(), criteriaDisable() (+14 more)

### Community 14 - "Calendario"
Cohesion: 0.11
Nodes (32): _calFormatDay(), _calTodayStr(), _calViewerTodayStr(), _calMatchInstant(), _calMatchTimeLocal(), _calLocalDateStr(), _calJornadaViewerDate(), _calWhenError() (+24 more)

### Community 6 - "Navegacion"
Cohesion: 0.06
Nodes (74): _calHeroGoComp(), _pubSwitchHistoryView(), liveStop(), liveSubscribe(), liveRadarStop(), _subscribeAdminMatchesLive(), getPublicScrollPages(), getMountedPublicPages() (+66 more)

### Community 22 - "Config Cloudinary (ejemplo)"
Cohesion: 1.0
Nodes (2): cloudReady(), uploadImageToCloud()

### Community 11 - "Equipos"
Cohesion: 0.06
Nodes (46): cloudReady(), uploadImageToCloud(), resize(), frame(), wake(), stop(), setVariant(), getVariant() (+38 more)

### Community 13 - "pes5-yunacoins.js y yunacoins-rules.js"
Cohesion: 0.09
Nodes (45): openColorPicker(), _compPickColor(), R(), esc(), ahora(), haceTexto(), emailActual(), leerSync() (+37 more)

### Community 12 - "Capa de datos"
Cohesion: 0.07
Nodes (52): exportFullDB(), downloadJSON(), _dataBackupStores(), _dataTypeOk(), _dataValidateRecord(), _dataValidateStoreItems(), _dataValidateBackup(), _dataWarnings() (+44 more)

### Community 18 - "Delegacion de eventos"
Cohesion: 0.2
Nodes (6): _onTokens(), _onParse(), _onIsNative(), _onEventFor(), _onResolve(), _onRun()

### Community 23 - "Config Firebase (ejemplo)"
Cohesion: 1.0
Nodes (0): 

### Community 24 - "Config Firebase"
Cohesion: 1.0
Nodes (0): 

### Community 17 - "Generador de fechas"
Cohesion: 0.19
Nodes (10): _fxScheduledCount(), _fxShuffle(), fxBuildRoundRobin(), fxBuildLuisRoute(), _fxBuildLuisRouteForLegs(), _fxGenerateCalendarAndRoute(), fxShuffleAgain(), renderFixtureGenModal() (+2 more)

### Community 7 - "Historial y H2H"
Cohesion: 0.06
Nodes (70): _histNorm(), _histResolveExactTeam(), _histResolveTeam(), computeResultado(), loadStaticHistory(), seedHistoryIfEmpty(), appendOrUpdateHistory(), historyRecordFor() (+62 more)

### Community 16 - "Partido en vivo"
Cohesion: 0.17
Nodes (22): _liveMustHaveWinner(), _liveCanEdit(), _lmEnqueue(), _lmLiveDoc(), _findOtherLiveMatch(), _blockIfOtherLive(), _lmStart(), startLiveGroupMatch() (+14 more)

### Community 0 - "mejoras-page.js"
Cohesion: 0.04
Nodes (135): jsq(), openModal(), closeModal(), _syncScrollLock(), showToast(), renderAuthUI(), puedeMandarPedido(), applyTheme() (+127 more)

### Community 3 - "pes5-tool.js"
Cohesion: 0.04
Nodes (117): cargarReglasFirestore(), cargarTopeExtraEquipo(), recalcularPresupuestoReal(), _hayAplicadoSinPublicar(), jugadorDesdePlantillaReal(), jugadorParaEditor(), plantillaParaEditor(), registroDeId() (+109 more)

### Community 1 - "Palmares (Sala de Trofeos 3D)"
Cohesion: 0.03
Nodes (121): getTrophyStyles(), _uid(), trophyClassica(), trophyImperial(), trophyKonami(), trophyOrejona(), trophySobria(), trophyModerno() (+113 more)

### Community 25 - "pes5-bloqueo.js"
Cohesion: 1.0
Nodes (0): 

### Community 20 - "pes5-clubes.js"
Cohesion: 0.62
Nodes (6): activos(), vinculado(), duenosDeClub(), otroEquipoConClub(), repetidoDe(), opcionesClub()

### Community 26 - "pes5-crypt.js"
Cohesion: 1.0
Nodes (0): 

### Community 27 - "pes5-editor.js"
Cohesion: 1.0
Nodes (0): 

### Community 28 - "pes5-save.js"
Cohesion: 1.0
Nodes (0): 

### Community 10 - "Push y Ajustes y arranque"
Cohesion: 0.06
Nodes (49): _plugin(), isEnabled(), _clearToken(), _setPendingTokenRemoval(), _clearPendingTokenRemoval(), _pushDocRef(), _currentTimezone(), _syncTokenToFirestore() (+41 more)

### Community 29 - "Estado global"
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
- **Thin community `Estado global`** (1 nodes): `state.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dbGetAll()` connect `Partidos` to `mejoras-page.js`, `Palmares (Sala de Trofeos 3D)`, `pes5-tool.js`, `Bracket`, `Sorteo en vivo`, `Navegacion`, `Historial y H2H`, `Push y Ajustes y arranque`, `Equipos`, `Capa de datos`, `pes5-yunacoins.js y yunacoins-rules.js`, `Calendario`, `Partido en vivo`?**
  _High betweenness centrality (0.222) - this node is a cross-community bridge._
- **Why does `escHtml()` connect `Bracket` to `mejoras-page.js`, `Palmares (Sala de Trofeos 3D)`, `Partidos`, `pes5-tool.js`, `Sorteo en vivo`, `Navegacion`, `Historial y H2H`, `Perfil del presidente`, `Push y Ajustes y arranque`, `Equipos`, `pes5-yunacoins.js y yunacoins-rules.js`, `Calendario`, `Tablas de posiciones`?**
  _High betweenness centrality (0.212) - this node is a cross-community bridge._
- **Why does `showToast()` connect `Partidos` to `Palmares (Sala de Trofeos 3D)`, `pes5-tool.js`, `Bracket`, `Sorteo en vivo`, `Navegacion`, `Historial y H2H`, `Perfil del presidente`, `Sonido`, `Push y Ajustes y arranque`, `Equipos`, `Capa de datos`, `Calendario`, `Tablas de posiciones`, `Partido en vivo`, `Generador de fechas`?**
  _High betweenness centrality (0.139) - this node is a cross-community bridge._
- **Are the 128 inferred relationships involving `dbGetAll()` (e.g. with `renderBracket()` and `getStandingsForPhase()`) actually correct?**
  _`dbGetAll()` has 128 INFERRED edges - model-reasoned connections that need verification._
- **Are the 94 inferred relationships involving `showToast()` (e.g. with `authForgotPassword()` and `authSignOut()`) actually correct?**
  _`showToast()` has 94 INFERRED edges - model-reasoned connections that need verification._
- **Are the 88 inferred relationships involving `escHtml()` (e.g. with `authForgotPassword()` and `teamLogoHtml()`) actually correct?**
  _`escHtml()` has 88 INFERRED edges - model-reasoned connections that need verification._
- **Are the 73 inferred relationships involving `dbGet()` (e.g. with `renderBracket()` and `getStandingsForPhase()`) actually correct?**
  _`dbGet()` has 73 INFERRED edges - model-reasoned connections that need verification._