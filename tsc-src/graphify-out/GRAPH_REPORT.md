# Graph Report - .  (2026-11-08)

## Corpus Check
- solo AST

## Summary
- 1392 nodes · 3824 edges · 31 communities detected
- Extraction: 72% EXTRACTED · 28% INFERRED · 0% AMBIGUOUS · INFERRED: 1054 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Promo APK|Promo APK]]
- [[_COMMUNITY_Perfil del presidente|Perfil del presidente]]
- [[_COMMUNITY_Push|Push]]
- [[_COMMUNITY_Splash de arranque|Splash de arranque]]
- [[_COMMUNITY_Bracket|Bracket]]
- [[_COMMUNITY_Bracket publico|Bracket publico]]
- [[_COMMUNITY_Sonido|Sonido]]
- [[_COMMUNITY_Sorteo en vivo|Sorteo en vivo]]
- [[_COMMUNITY_Tablas de posiciones|Tablas de posiciones]]
- [[_COMMUNITY_Calendario|Calendario]]
- [[_COMMUNITY_Historial y H2H|Historial y H2H]]
- [[_COMMUNITY_Navegacion|Navegacion]]
- [[_COMMUNITY_Config Cloudinary (ejemplo)|Config Cloudinary (ejemplo)]]
- [[_COMMUNITY_Competiciones|Competiciones]]
- [[_COMMUNITY_Equipos|Equipos]]
- [[_COMMUNITY_Ajustes y arranque|Ajustes y arranque]]
- [[_COMMUNITY_Capa de datos|Capa de datos]]
- [[_COMMUNITY_Delegacion de eventos|Delegacion de eventos]]
- [[_COMMUNITY_Config Firebase (ejemplo)|Config Firebase (ejemplo)]]
- [[_COMMUNITY_Config Firebase|Config Firebase]]
- [[_COMMUNITY_Generador de fechas|Generador de fechas]]
- [[_COMMUNITY_mejoras-page.js|mejoras-page.js]]
- [[_COMMUNITY_pes5-tool.js|pes5-tool.js]]
- [[_COMMUNITY_pes5-yunacoins.js y yunacoins-rules.js|pes5-yunacoins.js y yunacoins-rules.js]]
- [[_COMMUNITY_Palmares (Sala de Trofeos 3D)|Palmares (Sala de Trofeos 3D)]]
- [[_COMMUNITY_pes5-bloqueo.js|pes5-bloqueo.js]]
- [[_COMMUNITY_pes5-clubes.js|pes5-clubes.js]]
- [[_COMMUNITY_pes5-crypt.js|pes5-crypt.js]]
- [[_COMMUNITY_pes5-editor.js|pes5-editor.js]]
- [[_COMMUNITY_pes5-save.js|pes5-save.js]]
- [[_COMMUNITY_Estado global|Estado global]]

## God Nodes (most connected - your core abstractions)
1. `dbGetAll()` - 149 edges
2. `showToast()` - 112 edges
3. `dbGet()` - 94 edges
4. `escHtml()` - 91 edges
5. `dbPut()` - 61 edges
6. `dbErrorMsg()` - 35 edges
7. `showConfirm()` - 33 edges
8. `dbAdd()` - 32 edges
9. `renderAdminPage()` - 23 edges
10. `invalidateStandingsAndSyncBrackets()` - 22 edges

## Surprising Connections (you probably didn't know these)
- `_calCenterAnchorScroll()` --calls--> `_focusPublicSectionInner()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\calendar.js → D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\nav.js
- `_calInitHeroCountdown()` --calls--> `countdown()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\calendar.js → D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\motion.js
- `openBulkCoinsModal()` --calls--> `dbGetAll()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\coins.js → D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\db.js
- `_deletePhaseCascade()` --calls--> `dbDeleteMany()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\competitions.js → D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\db.js
- `dbGetAll()` --calls--> `_palmDuplicate()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\db.js → D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\palmares.js

## Communities

### Community 20 - "Promo APK"
Cohesion: 0.36
Nodes (9): _apkIsNativeApp(), _apkShouldOffer(), _apkAlreadyDownloaded(), _apkClosedRecently(), openApkPromo(), _apkHideOverlay(), closeApkPromo(), tscApkDownloadClick() (+1 more)

### Community 6 - "Perfil del presidente"
Cohesion: 0.05
Nodes (64): _usersCol(), _injectAuthModal(), openAuthModal(), toggleAuthMode(), _renderAuthModalMode(), authForgotPassword(), authSubmit(), _authErrorMsg() (+56 more)

### Community 12 - "Push"
Cohesion: 0.08
Nodes (30): authSignOut(), rgbStr(), Particle, Rocket, _plugin(), _clearToken(), _setPendingTokenRemoval(), _clearPendingTokenRemoval() (+22 more)

### Community 22 - "Splash de arranque"
Cohesion: 0.4
Nodes (0): 

### Community 0 - "Bracket"
Cohesion: 0.03
Nodes (209): getWinner(), spawnRocket(), loop(), _cleanup(), _onClick(), renderBracket(), buildBracketRounds(), getStandingsForPhase() (+201 more)

### Community 11 - "Bracket publico"
Cohesion: 0.09
Nodes (41): teamLogoHtml(), _calLogo(), _coinsAmount(), renderAdmCoins(), renderCoinsTable(), filterCoinsTable(), openCoinsModal(), updateCoinsPreview() (+33 more)

### Community 8 - "Sonido"
Cohesion: 0.07
Nodes (42): _getAudioCtx(), resume(), _fwSoundOff(), _soundRocketLaunch(), _soundExplosion(), liveRadarStart(), _palmAudio(), _palmSoundOff() (+34 more)

### Community 4 - "Sorteo en vivo"
Cohesion: 0.06
Nodes (77): hexToRgb(), lighten(), newBomboId(), newBombo(), emptyState(), _journalCapturePhase(), _journalCaptureMatches(), effectiveDrawnIds() (+69 more)

### Community 16 - "Tablas de posiciones"
Cohesion: 0.12
Nodes (22): refBadgeHTML(), saveCriteria(), openCriteriaModal(), closeCriteriaModal(), criteriaDragEnd(), criteriaDrop(), criteriaDropOnContainer(), criteriaDisable() (+14 more)

### Community 14 - "Calendario"
Cohesion: 0.12
Nodes (31): _calFormatDay(), _calTodayStr(), _calViewerTodayStr(), _calMatchInstant(), _calMatchTimeLocal(), _calLocalDateStr(), _calJornadaViewerDate(), _calWhenError() (+23 more)

### Community 7 - "Historial y H2H"
Cohesion: 0.06
Nodes (70): _calHeroGoH2H(), dbIsArchivedSeason(), _histNorm(), _histResolveExactTeam(), _histResolveTeam(), computeResultado(), loadStaticHistory(), seedHistoryIfEmpty() (+62 more)

### Community 5 - "Navegacion"
Cohesion: 0.06
Nodes (71): _calHeroGoComp(), _pubSwitchHistoryView(), liveStop(), liveSubscribe(), liveRadarStop(), liveRadarProximity(), _subscribeAdminMatchesLive(), getPublicScrollPages() (+63 more)

### Community 23 - "Config Cloudinary (ejemplo)"
Cohesion: 1.0
Nodes (2): cloudReady(), uploadImageToCloud()

### Community 17 - "Competiciones"
Cohesion: 0.16
Nodes (14): openColorPicker(), _sortComps(), renderAdmComps(), renderCompsGrid(), _compPickColor(), closeCompModal(), _deletePhaseCascade(), openCompReorderModal() (+6 more)

### Community 10 - "Equipos"
Cohesion: 0.07
Nodes (39): resize(), frame(), wake(), stop(), setVariant(), init(), reduced(), _settle() (+31 more)

### Community 15 - "Ajustes y arranque"
Cohesion: 0.1
Nodes (29): getVariant(), isEnabled(), _handleNotificationData(), getVolume(), closeConfirm(), runConfirm(), setTheme(), toggleThemeKey() (+21 more)

### Community 13 - "Capa de datos"
Cohesion: 0.09
Nodes (37): exportFullDB(), downloadJSON(), _dataBackupStores(), _dataTypeOk(), _dataValidateRecord(), _dataValidateStoreItems(), _dataValidateBackup(), _dataWarnings() (+29 more)

### Community 19 - "Delegacion de eventos"
Cohesion: 0.2
Nodes (6): _onTokens(), _onParse(), _onIsNative(), _onEventFor(), _onResolve(), _onRun()

### Community 24 - "Config Firebase (ejemplo)"
Cohesion: 1.0
Nodes (0): 

### Community 25 - "Config Firebase"
Cohesion: 1.0
Nodes (0): 

### Community 18 - "Generador de fechas"
Cohesion: 0.2
Nodes (9): _fxScheduledCount(), _fxShuffle(), fxBuildRoundRobin(), fxBuildLuisRoute(), _fxBuildLuisRouteForLegs(), _fxGenerateCalendarAndRoute(), fxShuffleAgain(), renderFixtureGenModal() (+1 more)

### Community 1 - "mejoras-page.js"
Cohesion: 0.04
Nodes (133): jsq(), openModal(), closeModal(), _syncScrollLock(), showToast(), renderAuthUI(), puedeMandarPedido(), applyTheme() (+125 more)

### Community 3 - "pes5-tool.js"
Cohesion: 0.05
Nodes (94): cargarReglasFirestore(), jugadorDesdePlantillaReal(), desmontar(), jugadorParaEditor(), plantillaParaEditor(), registroDeId(), cambiosDesdeEditor(), aplicarCambiosAlJugador() (+86 more)

### Community 9 - "pes5-yunacoins.js y yunacoins-rules.js"
Cohesion: 0.09
Nodes (46): recalcularPresupuestoReal(), R(), esc(), ahora(), haceTexto(), emailActual(), leerSync(), guardarSync() (+38 more)

### Community 2 - "Palmares (Sala de Trofeos 3D)"
Cohesion: 0.03
Nodes (113): getTrophyStyles(), _uid(), trophyClassica(), trophyImperial(), trophyKonami(), trophyOrejona(), trophySobria(), trophyModerno() (+105 more)

### Community 26 - "pes5-bloqueo.js"
Cohesion: 1.0
Nodes (0): 

### Community 21 - "pes5-clubes.js"
Cohesion: 0.62
Nodes (6): activos(), vinculado(), duenosDeClub(), otroEquipoConClub(), repetidoDe(), opcionesClub()

### Community 27 - "pes5-crypt.js"
Cohesion: 1.0
Nodes (0): 

### Community 28 - "pes5-editor.js"
Cohesion: 1.0
Nodes (0): 

### Community 29 - "pes5-save.js"
Cohesion: 1.0
Nodes (0): 

### Community 30 - "Estado global"
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

- **Why does `dbGetAll()` connect `Bracket` to `mejoras-page.js`, `Palmares (Sala de Trofeos 3D)`, `pes5-tool.js`, `Sorteo en vivo`, `Navegacion`, `Historial y H2H`, `pes5-yunacoins.js y yunacoins-rules.js`, `Equipos`, `Bracket publico`, `Push`, `Capa de datos`, `Calendario`, `Competiciones`?**
  _High betweenness centrality (0.223) - this node is a cross-community bridge._
- **Why does `escHtml()` connect `Bracket publico` to `Bracket`, `mejoras-page.js`, `Palmares (Sala de Trofeos 3D)`, `pes5-tool.js`, `Sorteo en vivo`, `Navegacion`, `Perfil del presidente`, `Historial y H2H`, `pes5-yunacoins.js y yunacoins-rules.js`, `Equipos`, `Push`, `Calendario`, `Ajustes y arranque`, `Tablas de posiciones`?**
  _High betweenness centrality (0.204) - this node is a cross-community bridge._
- **Why does `showToast()` connect `Bracket` to `Palmares (Sala de Trofeos 3D)`, `pes5-tool.js`, `Sorteo en vivo`, `Navegacion`, `Perfil del presidente`, `Historial y H2H`, `Sonido`, `Bracket publico`, `Push`, `Capa de datos`, `Calendario`, `Ajustes y arranque`, `Tablas de posiciones`, `Competiciones`?**
  _High betweenness centrality (0.196) - this node is a cross-community bridge._
- **Are the 146 inferred relationships involving `dbGetAll()` (e.g. with `renderBracket()` and `getStandingsForPhase()`) actually correct?**
  _`dbGetAll()` has 146 INFERRED edges - model-reasoned connections that need verification._
- **Are the 108 inferred relationships involving `showToast()` (e.g. with `authForgotPassword()` and `authSignOut()`) actually correct?**
  _`showToast()` has 108 INFERRED edges - model-reasoned connections that need verification._
- **Are the 91 inferred relationships involving `dbGet()` (e.g. with `renderBracket()` and `getStandingsForPhase()`) actually correct?**
  _`dbGet()` has 91 INFERRED edges - model-reasoned connections that need verification._
- **Are the 89 inferred relationships involving `escHtml()` (e.g. with `authForgotPassword()` and `teamLogoHtml()`) actually correct?**
  _`escHtml()` has 89 INFERRED edges - model-reasoned connections that need verification._