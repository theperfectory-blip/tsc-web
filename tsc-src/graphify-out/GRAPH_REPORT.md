# Graph Report - .  (2026-11-17)

## Corpus Check
- solo AST

## Summary
- 1567 nodes · 4261 edges · 29 communities detected
- Extraction: 76% EXTRACTED · 24% INFERRED · 0% AMBIGUOUS · INFERRED: 1020 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Promo APK|Promo APK]]
- [[_COMMUNITY_Perfil del presidente|Perfil del presidente]]
- [[_COMMUNITY_Splash de arranque|Splash de arranque]]
- [[_COMMUNITY_Bracket|Bracket]]
- [[_COMMUNITY_Historial y H2H|Historial y H2H]]
- [[_COMMUNITY_Sonido|Sonido]]
- [[_COMMUNITY_Partidos|Partidos]]
- [[_COMMUNITY_Tablas de posiciones|Tablas de posiciones]]
- [[_COMMUNITY_Calendario|Calendario]]
- [[_COMMUNITY_Navegacion|Navegacion]]
- [[_COMMUNITY_Config Cloudinary (ejemplo)|Config Cloudinary (ejemplo)]]
- [[_COMMUNITY_pes5-yunacoins.js|pes5-yunacoins.js]]
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
- [[_COMMUNITY_save-publicado.js|save-publicado.js]]
- [[_COMMUNITY_Sorteo en vivo|Sorteo en vivo]]
- [[_COMMUNITY_Estado global|Estado global]]

## God Nodes (most connected - your core abstractions)
1. `dbGetAll()` - 138 edges
2. `showToast()` - 111 edges
3. `escHtml()` - 101 edges
4. `dbGet()` - 76 edges
5. `dbErrorMsg()` - 34 edges
6. `showConfirm()` - 34 edges
7. `dbPut()` - 32 edges
8. `aplicarPedidosSeleccionados()` - 32 edges
9. `currentPlayer()` - 23 edges
10. `renderAdminPage()` - 22 edges

## Surprising Connections (you probably didn't know these)
- `deleteBracketMatch()` --calls--> `showConfirm()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\emparejar-80\tsc-src\js\bracket.js → D:\Desktop\tsc.web\.claude\worktrees\emparejar-80\tsc-src\js\ui-utils.js
- `_calCenterAnchorScroll()` --calls--> `_focusPublicSectionInner()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\emparejar-80\tsc-src\js\calendar.js → D:\Desktop\tsc.web\.claude\worktrees\emparejar-80\tsc-src\js\nav.js
- `_calInitHeroCountdown()` --calls--> `countdown()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\emparejar-80\tsc-src\js\calendar.js → D:\Desktop\tsc.web\.claude\worktrees\emparejar-80\tsc-src\js\motion.js
- `dbGetAll()` --calls--> `_palmDuplicate()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\emparejar-80\tsc-src\js\db.js → D:\Desktop\tsc.web\.claude\worktrees\emparejar-80\tsc-src\js\palmares.js
- `getForSeason()` --calls--> `resolveTeamData()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\emparejar-80\tsc-src\js\db.js → D:\Desktop\tsc.web\.claude\worktrees\emparejar-80\tsc-src\js\standings.js

## Communities

### Community 17 - "Promo APK"
Cohesion: 0.36
Nodes (9): _apkIsNativeApp(), _apkShouldOffer(), _apkAlreadyDownloaded(), _apkClosedRecently(), openApkPromo(), _apkHideOverlay(), closeApkPromo(), tscApkDownloadClick() (+1 more)

### Community 4 - "Perfil del presidente"
Cohesion: 0.03
Nodes (107): _usersCol(), _injectAuthModal(), openAuthModal(), toggleAuthMode(), _renderAuthModalMode(), authForgotPassword(), authSubmit(), _authErrorMsg() (+99 more)

### Community 19 - "Splash de arranque"
Cohesion: 0.4
Nodes (0): 

### Community 8 - "Bracket"
Cohesion: 0.06
Nodes (64): getWinner(), hexToRgb(), rgbStr(), lighten(), Particle, spawnRocket(), loop(), _cleanup() (+56 more)

### Community 5 - "Historial y H2H"
Cohesion: 0.04
Nodes (96): teamLogoHtml(), _calLogo(), _histNorm(), _histResolveExactTeam(), _histResolveTeam(), computeResultado(), loadStaticHistory(), seedHistoryIfEmpty() (+88 more)

### Community 9 - "Sonido"
Cohesion: 0.06
Nodes (45): _getAudioCtx(), resume(), _fwSoundOff(), _soundRocketLaunch(), _soundExplosion(), Rocket, liveRadarStart(), liveRadarProximity() (+37 more)

### Community 1 - "Partidos"
Cohesion: 0.03
Nodes (189): openSlotRefModal(), _readRefSourceFromModal(), saveSlotRef(), _bkRefPhaseEditable(), removeSlotRef(), _calSeasonLocked(), _calLiveMsg(), calClearSchedule() (+181 more)

### Community 14 - "Tablas de posiciones"
Cohesion: 0.13
Nodes (20): refBadgeHTML(), openCriteriaModal(), closeCriteriaModal(), criteriaDragEnd(), criteriaDrop(), criteriaDropOnContainer(), criteriaDisable(), criteriaRestore() (+12 more)

### Community 13 - "Calendario"
Cohesion: 0.11
Nodes (31): _calFormatDay(), _calTodayStr(), _calViewerTodayStr(), _calMatchInstant(), _calMatchTimeLocal(), _calLocalDateStr(), _calJornadaViewerDate(), _calWhenError() (+23 more)

### Community 7 - "Navegacion"
Cohesion: 0.06
Nodes (71): _calHeroGoComp(), _pubSwitchHistoryView(), liveStop(), liveSubscribe(), liveRadarStop(), getPublicScrollPages(), getMountedPublicPages(), _isPublicScrollPage() (+63 more)

### Community 20 - "Config Cloudinary (ejemplo)"
Cohesion: 1.0
Nodes (2): cloudReady(), uploadImageToCloud()

### Community 12 - "pes5-yunacoins.js"
Cohesion: 0.11
Nodes (40): openColorPicker(), _compPickColor(), R(), esc(), ahora(), haceTexto(), emailActual(), leerSync() (+32 more)

### Community 10 - "Equipos"
Cohesion: 0.06
Nodes (42): resize(), frame(), wake(), stop(), setVariant(), getVariant(), init(), reduced() (+34 more)

### Community 11 - "Capa de datos"
Cohesion: 0.09
Nodes (39): exportFullDB(), downloadJSON(), _dataBackupStores(), _dataTypeOk(), _dataValidateRecord(), _dataValidateStoreItems(), _dataValidateBackup(), _dataWarnings() (+31 more)

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
Nodes (194): jsq(), openModal(), closeModal(), _syncScrollLock(), showToast(), renderAuthUI(), puedeMandarPedido(), applyTheme() (+186 more)

### Community 2 - "pes5-tool.js"
Cohesion: 0.03
Nodes (200): _tiempoPedido(), cargarTopeTemporada(), desmontar(), jugadorParaEditor(), plantillaParaEditor(), cambiosDesdeEditor(), aplicarCambiosAlJugador(), canonicoJSON() (+192 more)

### Community 3 - "Palmares (Sala de Trofeos 3D)"
Cohesion: 0.03
Nodes (117): getTrophyStyles(), _uid(), trophyClassica(), trophyImperial(), trophyKonami(), trophyOrejona(), trophySobria(), trophyModerno() (+109 more)

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

### Community 27 - "save-publicado.js"
Cohesion: 1.0
Nodes (0): 

### Community 6 - "Sorteo en vivo"
Cohesion: 0.06
Nodes (70): newBomboId(), newBombo(), emptyState(), _journalCapturePhase(), _journalCaptureMatches(), effectiveDrawnIds(), ensureBC(), broadcast() (+62 more)

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

- **Why does `escHtml()` connect `Historial y H2H` to `mejoras-page.js`, `Partidos`, `pes5-tool.js`, `Palmares (Sala de Trofeos 3D)`, `Perfil del presidente`, `Sorteo en vivo`, `Navegacion`, `Bracket`, `Equipos`, `pes5-yunacoins.js`, `Calendario`, `Tablas de posiciones`?**
  _High betweenness centrality (0.215) - this node is a cross-community bridge._
- **Why does `dbGetAll()` connect `Partidos` to `mejoras-page.js`, `pes5-tool.js`, `Palmares (Sala de Trofeos 3D)`, `Historial y H2H`, `Sorteo en vivo`, `Navegacion`, `Bracket`, `Equipos`, `Capa de datos`, `pes5-yunacoins.js`, `Calendario`?**
  _High betweenness centrality (0.205) - this node is a cross-community bridge._
- **Why does `showToast()` connect `Partidos` to `pes5-tool.js`, `Palmares (Sala de Trofeos 3D)`, `Perfil del presidente`, `Historial y H2H`, `Sorteo en vivo`, `Navegacion`, `Bracket`, `Sonido`, `Capa de datos`, `pes5-yunacoins.js`, `Calendario`, `Tablas de posiciones`, `Generador de fechas`?**
  _High betweenness centrality (0.179) - this node is a cross-community bridge._
- **Are the 135 inferred relationships involving `dbGetAll()` (e.g. with `renderBracket()` and `getStandingsForPhase()`) actually correct?**
  _`dbGetAll()` has 135 INFERRED edges - model-reasoned connections that need verification._
- **Are the 107 inferred relationships involving `showToast()` (e.g. with `authForgotPassword()` and `authSignOut()`) actually correct?**
  _`showToast()` has 107 INFERRED edges - model-reasoned connections that need verification._
- **Are the 99 inferred relationships involving `escHtml()` (e.g. with `authForgotPassword()` and `teamLogoHtml()`) actually correct?**
  _`escHtml()` has 99 INFERRED edges - model-reasoned connections that need verification._
- **Are the 73 inferred relationships involving `dbGet()` (e.g. with `renderBracket()` and `getStandingsForPhase()`) actually correct?**
  _`dbGet()` has 73 INFERRED edges - model-reasoned connections that need verification._