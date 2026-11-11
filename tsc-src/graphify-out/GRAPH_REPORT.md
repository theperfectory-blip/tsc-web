# Graph Report - .  (2026-11-11)

## Corpus Check
- solo AST

## Summary
- 1423 nodes · 3920 edges · 31 communities detected
- Extraction: 72% EXTRACTED · 28% INFERRED · 0% AMBIGUOUS · INFERRED: 1080 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Promo APK|Promo APK]]
- [[_COMMUNITY_Perfil del presidente|Perfil del presidente]]
- [[_COMMUNITY_Push y Ajustes y arranque|Push y Ajustes y arranque]]
- [[_COMMUNITY_Splash de arranque|Splash de arranque]]
- [[_COMMUNITY_Bracket|Bracket]]
- [[_COMMUNITY_Bracket publico|Bracket publico]]
- [[_COMMUNITY_Sonido|Sonido]]
- [[_COMMUNITY_Sorteo en vivo|Sorteo en vivo]]
- [[_COMMUNITY_Bracket y Usuarios (admin)|Bracket y Usuarios (admin)]]
- [[_COMMUNITY_Tablas de posiciones|Tablas de posiciones]]
- [[_COMMUNITY_Calendario|Calendario]]
- [[_COMMUNITY_Historial y H2H|Historial y H2H]]
- [[_COMMUNITY_Navegacion|Navegacion]]
- [[_COMMUNITY_Config Cloudinary (ejemplo)|Config Cloudinary (ejemplo)]]
- [[_COMMUNITY_Competiciones|Competiciones]]
- [[_COMMUNITY_Equipos|Equipos]]
- [[_COMMUNITY_Export  import|Export / import]]
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
- [[_COMMUNITY_pes5-yunacoins.js y yunacoins-rules.js|pes5-yunacoins.js y yunacoins-rules.js]]
- [[_COMMUNITY_Estado global|Estado global]]

## God Nodes (most connected - your core abstractions)
1. `dbGetAll()` - 149 edges
2. `showToast()` - 115 edges
3. `dbGet()` - 94 edges
4. `escHtml()` - 94 edges
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

### Community 19 - "Promo APK"
Cohesion: 0.36
Nodes (9): _apkIsNativeApp(), _apkShouldOffer(), _apkAlreadyDownloaded(), _apkClosedRecently(), openApkPromo(), _apkHideOverlay(), closeApkPromo(), tscApkDownloadClick() (+1 more)

### Community 6 - "Perfil del presidente"
Cohesion: 0.05
Nodes (64): _usersCol(), _injectAuthModal(), openAuthModal(), toggleAuthMode(), _renderAuthModalMode(), authForgotPassword(), authSubmit(), _authErrorMsg() (+56 more)

### Community 8 - "Push y Ajustes y arranque"
Cohesion: 0.06
Nodes (49): authSignOut(), getVariant(), _plugin(), isEnabled(), _clearToken(), _setPendingTokenRemoval(), _clearPendingTokenRemoval(), _pushDocRef() (+41 more)

### Community 22 - "Splash de arranque"
Cohesion: 0.4
Nodes (0): 

### Community 0 - "Bracket"
Cohesion: 0.03
Nodes (241): getWinner(), spawnRocket(), loop(), _cleanup(), _onClick(), renderBracket(), buildBracketRounds(), getStandingsForPhase() (+233 more)

### Community 10 - "Bracket publico"
Cohesion: 0.08
Nodes (45): teamLogoHtml(), _coinsAmount(), renderAdmCoins(), renderCoinsTable(), filterCoinsTable(), openCoinsModal(), updateCoinsPreview(), openBulkCoinsModal() (+37 more)

### Community 9 - "Sonido"
Cohesion: 0.07
Nodes (42): _getAudioCtx(), resume(), _fwSoundOff(), _soundRocketLaunch(), _soundExplosion(), liveRadarStart(), _palmAudio(), _palmSoundOff() (+34 more)

### Community 4 - "Sorteo en vivo"
Cohesion: 0.06
Nodes (77): hexToRgb(), lighten(), newBomboId(), newBombo(), emptyState(), _journalCapturePhase(), _journalCaptureMatches(), effectiveDrawnIds() (+69 more)

### Community 15 - "Bracket y Usuarios (admin)"
Cohesion: 0.16
Nodes (11): rgbStr(), Particle, Rocket, renderAdmUsuarios(), _uaBackfillUsernames(), adminSetUserLock(), adminSetUserRole(), adminSetUserTeam() (+3 more)

### Community 14 - "Tablas de posiciones"
Cohesion: 0.13
Nodes (21): refBadgeHTML(), openCriteriaModal(), closeCriteriaModal(), criteriaDragEnd(), criteriaDrop(), criteriaDropOnContainer(), criteriaDisable(), criteriaRestore() (+13 more)

### Community 13 - "Calendario"
Cohesion: 0.12
Nodes (30): _calFormatDay(), _calTodayStr(), _calViewerTodayStr(), _calMatchInstant(), _calMatchTimeLocal(), _calLocalDateStr(), _calJornadaViewerDate(), _calLogo() (+22 more)

### Community 7 - "Historial y H2H"
Cohesion: 0.06
Nodes (69): _calHeroGoH2H(), dbIsArchivedSeason(), _histNorm(), _histResolveExactTeam(), _histResolveTeam(), computeResultado(), loadStaticHistory(), seedHistoryIfEmpty() (+61 more)

### Community 5 - "Navegacion"
Cohesion: 0.06
Nodes (73): _calHeroGoComp(), _pubSwitchHistoryView(), liveStop(), liveSubscribe(), liveRadarStop(), liveRadarProximity(), getPublicScrollPages(), getMountedPublicPages() (+65 more)

### Community 23 - "Config Cloudinary (ejemplo)"
Cohesion: 1.0
Nodes (2): cloudReady(), uploadImageToCloud()

### Community 16 - "Competiciones"
Cohesion: 0.17
Nodes (11): openColorPicker(), _sortComps(), _compPickColor(), closeCompModal(), _deletePhaseCascade(), openCompReorderModal(), _renderCompReorderList(), compReorderDragEnd() (+3 more)

### Community 11 - "Equipos"
Cohesion: 0.06
Nodes (41): resize(), frame(), wake(), stop(), setVariant(), init(), reduced(), _settle() (+33 more)

### Community 20 - "Export / import"
Cohesion: 0.46
Nodes (7): _dataBackupStores(), _dataTypeOk(), _dataValidateRecord(), _dataValidateStoreItems(), _dataValidateBackup(), _dataWarnings(), importDB()

### Community 18 - "Delegacion de eventos"
Cohesion: 0.2
Nodes (6): _onTokens(), _onParse(), _onIsNative(), _onEventFor(), _onResolve(), _onRun()

### Community 24 - "Config Firebase (ejemplo)"
Cohesion: 1.0
Nodes (0): 

### Community 25 - "Config Firebase"
Cohesion: 1.0
Nodes (0): 

### Community 17 - "Generador de fechas"
Cohesion: 0.2
Nodes (9): _fxScheduledCount(), _fxShuffle(), fxBuildRoundRobin(), fxBuildLuisRoute(), _fxBuildLuisRouteForLegs(), _fxGenerateCalendarAndRoute(), fxShuffleAgain(), renderFixtureGenModal() (+1 more)

### Community 1 - "mejoras-page.js"
Cohesion: 0.03
Nodes (138): jsq(), openModal(), closeModal(), _syncScrollLock(), showToast(), renderAuthUI(), puedeMandarPedido(), applyTheme() (+130 more)

### Community 2 - "pes5-tool.js"
Cohesion: 0.04
Nodes (120): cargarReglasFirestore(), cargarTopeExtraEquipo(), recalcularPresupuestoReal(), _hayAplicadoSinPublicar(), jugadorDesdePlantillaReal(), jugadorParaEditor(), plantillaParaEditor(), registroDeId() (+112 more)

### Community 3 - "Palmares (Sala de Trofeos 3D)"
Cohesion: 0.03
Nodes (109): getTrophyStyles(), _uid(), trophyClassica(), trophyImperial(), trophyKonami(), trophyOrejona(), trophySobria(), trophyModerno() (+101 more)

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

### Community 12 - "pes5-yunacoins.js y yunacoins-rules.js"
Cohesion: 0.09
Nodes (45): R(), esc(), ahora(), haceTexto(), emailActual(), leerSync(), guardarSync(), obtenerSaldosLoyalty() (+37 more)

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

- **Why does `dbGetAll()` connect `Bracket` to `mejoras-page.js`, `pes5-tool.js`, `Palmares (Sala de Trofeos 3D)`, `Sorteo en vivo`, `Navegacion`, `Historial y H2H`, `Bracket publico`, `Equipos`, `pes5-yunacoins.js y yunacoins-rules.js`, `Calendario`, `Bracket y Usuarios (admin)`?**
  _High betweenness centrality (0.223) - this node is a cross-community bridge._
- **Why does `escHtml()` connect `Bracket publico` to `Bracket`, `mejoras-page.js`, `pes5-tool.js`, `Palmares (Sala de Trofeos 3D)`, `Sorteo en vivo`, `Navegacion`, `Perfil del presidente`, `Historial y H2H`, `Push y Ajustes y arranque`, `Equipos`, `pes5-yunacoins.js y yunacoins-rules.js`, `Calendario`, `Tablas de posiciones`, `Bracket y Usuarios (admin)`?**
  _High betweenness centrality (0.177) - this node is a cross-community bridge._
- **Why does `showToast()` connect `Bracket` to `pes5-tool.js`, `Sorteo en vivo`, `Navegacion`, `Perfil del presidente`, `Historial y H2H`, `Push y Ajustes y arranque`, `Sonido`, `Bracket publico`, `Calendario`, `Tablas de posiciones`, `Bracket y Usuarios (admin)`, `Export / import`?**
  _High betweenness centrality (0.158) - this node is a cross-community bridge._
- **Are the 146 inferred relationships involving `dbGetAll()` (e.g. with `renderBracket()` and `getStandingsForPhase()`) actually correct?**
  _`dbGetAll()` has 146 INFERRED edges - model-reasoned connections that need verification._
- **Are the 111 inferred relationships involving `showToast()` (e.g. with `authForgotPassword()` and `authSignOut()`) actually correct?**
  _`showToast()` has 111 INFERRED edges - model-reasoned connections that need verification._
- **Are the 91 inferred relationships involving `dbGet()` (e.g. with `renderBracket()` and `getStandingsForPhase()`) actually correct?**
  _`dbGet()` has 91 INFERRED edges - model-reasoned connections that need verification._
- **Are the 92 inferred relationships involving `escHtml()` (e.g. with `authForgotPassword()` and `teamLogoHtml()`) actually correct?**
  _`escHtml()` has 92 INFERRED edges - model-reasoned connections that need verification._