# Graph Report - .  (2026-11-15)

## Corpus Check
- solo AST

## Summary
- 1423 nodes · 3778 edges · 30 communities detected
- Extraction: 75% EXTRACTED · 25% INFERRED · 0% AMBIGUOUS · INFERRED: 938 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Promo APK|Promo APK]]
- [[_COMMUNITY_Perfil del presidente|Perfil del presidente]]
- [[_COMMUNITY_Push|Push]]
- [[_COMMUNITY_Splash de arranque|Splash de arranque]]
- [[_COMMUNITY_Bracket|Bracket]]
- [[_COMMUNITY_Historial y H2H|Historial y H2H]]
- [[_COMMUNITY_Sonido|Sonido]]
- [[_COMMUNITY_Partidos|Partidos]]
- [[_COMMUNITY_Tablas de posiciones|Tablas de posiciones]]
- [[_COMMUNITY_Calendario|Calendario]]
- [[_COMMUNITY_Navegacion|Navegacion]]
- [[_COMMUNITY_Config Cloudinary (ejemplo)|Config Cloudinary (ejemplo)]]
- [[_COMMUNITY_pes5-yunacoins.js y yunacoins-rules.js|pes5-yunacoins.js y yunacoins-rules.js]]
- [[_COMMUNITY_Equipos|Equipos]]
- [[_COMMUNITY_Capa de datos|Capa de datos]]
- [[_COMMUNITY_Delegacion de eventos|Delegacion de eventos]]
- [[_COMMUNITY_Config Firebase (ejemplo)|Config Firebase (ejemplo)]]
- [[_COMMUNITY_Config Firebase|Config Firebase]]
- [[_COMMUNITY_Generador de fechas|Generador de fechas]]
- [[_COMMUNITY_Partido en vivo|Partido en vivo]]
- [[_COMMUNITY_mejoras-page.js|mejoras-page.js]]
- [[_COMMUNITY_pes5-tool.js|pes5-tool.js]]
- [[_COMMUNITY_Palmares (Sala de Trofeos 3D)|Palmares (Sala de Trofeos 3D)]]
- [[_COMMUNITY_pes5-bloqueo.js|pes5-bloqueo.js]]
- [[_COMMUNITY_pes5-clubes.js|pes5-clubes.js]]
- [[_COMMUNITY_pes5-crypt.js|pes5-crypt.js]]
- [[_COMMUNITY_pes5-editor.js|pes5-editor.js]]
- [[_COMMUNITY_pes5-save.js|pes5-save.js]]
- [[_COMMUNITY_Sorteo en vivo|Sorteo en vivo]]
- [[_COMMUNITY_Estado global|Estado global]]

## God Nodes (most connected - your core abstractions)
1. `dbGetAll()` - 131 edges
2. `showToast()` - 99 edges
3. `escHtml()` - 92 edges
4. `dbGet()` - 76 edges
5. `dbErrorMsg()` - 34 edges
6. `dbPut()` - 32 edges
7. `showConfirm()` - 32 edges
8. `renderAdminPage()` - 22 edges
9. `currentPlayer()` - 21 edges
10. `activeBombo()` - 21 edges

## Surprising Connections (you probably didn't know these)
- `deleteBracketMatch()` --calls--> `showConfirm()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\fix-lecturas-historial\tsc-src\js\bracket.js → D:\Desktop\tsc.web\.claude\worktrees\fix-lecturas-historial\tsc-src\js\ui-utils.js
- `_calInitHeroCountdown()` --calls--> `countdown()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\fix-lecturas-historial\tsc-src\js\calendar.js → D:\Desktop\tsc.web\.claude\worktrees\fix-lecturas-historial\tsc-src\js\motion.js
- `dbGetAll()` --calls--> `_palmDuplicate()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\fix-lecturas-historial\tsc-src\js\db.js → D:\Desktop\tsc.web\.claude\worktrees\fix-lecturas-historial\tsc-src\js\palmares.js
- `getForSeason()` --calls--> `resolveTeamData()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\fix-lecturas-historial\tsc-src\js\db.js → D:\Desktop\tsc.web\.claude\worktrees\fix-lecturas-historial\tsc-src\js\standings.js
- `loadDraft()` --calls--> `aplicarCambiosAlJugador()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\fix-lecturas-historial\tsc-src\js\mejoras-page.js → D:\Desktop\tsc.web\.claude\worktrees\fix-lecturas-historial\tsc-src\js\pes5-plantilla.js

## Communities

### Community 19 - "Promo APK"
Cohesion: 0.36
Nodes (9): _apkIsNativeApp(), _apkShouldOffer(), _apkAlreadyDownloaded(), _apkClosedRecently(), openApkPromo(), _apkHideOverlay(), closeApkPromo(), tscApkDownloadClick() (+1 more)

### Community 8 - "Perfil del presidente"
Cohesion: 0.05
Nodes (62): _usersCol(), _injectAuthModal(), openAuthModal(), toggleAuthMode(), _renderAuthModalMode(), authForgotPassword(), authSubmit(), _authErrorMsg() (+54 more)

### Community 16 - "Push"
Cohesion: 0.17
Nodes (20): authSignOut(), _plugin(), _clearToken(), _setPendingTokenRemoval(), _clearPendingTokenRemoval(), _pushDocRef(), _currentTimezone(), _syncTokenToFirestore() (+12 more)

### Community 21 - "Splash de arranque"
Cohesion: 0.4
Nodes (0): 

### Community 9 - "Bracket"
Cohesion: 0.07
Nodes (44): getWinner(), _getAudioCtx(), _fwSoundOff(), _soundRocketLaunch(), _soundExplosion(), hexToRgb(), rgbStr(), lighten() (+36 more)

### Community 4 - "Historial y H2H"
Cohesion: 0.04
Nodes (105): teamLogoHtml(), _bkResultOps(), _calHeroGoH2H(), openCoinsModal(), openCompModal(), dbIsArchivedSeason(), _histNorm(), _histResolveExactTeam() (+97 more)

### Community 10 - "Sonido"
Cohesion: 0.08
Nodes (38): resume(), liveRadarStart(), _palmAudio(), _palmSoundOff(), _palmApplyVol(), playPalmZoom(), playPalmZoomOut(), _PalmSmoke (+30 more)

### Community 0 - "Partidos"
Cohesion: 0.03
Nodes (146): invalidateStandingsCache(), resolveGroupRefsFor(), saveSlotRef(), _bkRefPhaseEditable(), removeSlotRef(), rerenderPhaseFromRefTarget(), cloudReady(), uploadImageToCloud() (+138 more)

### Community 14 - "Tablas de posiciones"
Cohesion: 0.1
Nodes (28): refBadgeHTML(), getCriteria(), saveCriteria(), calcGroupStandings(), renderGroupTable(), openCriteriaModal(), closeCriteriaModal(), criteriaDragEnd() (+20 more)

### Community 13 - "Calendario"
Cohesion: 0.11
Nodes (34): _calFormatDay(), _calTodayStr(), _calViewerTodayStr(), _calMatchInstant(), _calMatchTimeLocal(), _calLocalDateStr(), _calJornadaViewerDate(), _calLogo() (+26 more)

### Community 6 - "Navegacion"
Cohesion: 0.06
Nodes (74): _calCenterAnchorScroll(), _calHeroGoComp(), _pubSwitchHistoryView(), liveStop(), liveSubscribe(), liveRadarStop(), liveRadarProximity(), _subscribeAdminMatchesLive() (+66 more)

### Community 22 - "Config Cloudinary (ejemplo)"
Cohesion: 1.0
Nodes (2): cloudReady(), uploadImageToCloud()

### Community 11 - "pes5-yunacoins.js y yunacoins-rules.js"
Cohesion: 0.08
Nodes (47): openColorPicker(), _compPickColor(), R(), esc(), ahora(), haceTexto(), emailActual(), leerSync() (+39 more)

### Community 12 - "Equipos"
Cohesion: 0.07
Nodes (37): resize(), frame(), wake(), stop(), setVariant(), init(), reduced(), _settle() (+29 more)

### Community 7 - "Capa de datos"
Cohesion: 0.05
Nodes (71): getVariant(), _dataApplyImport(), _dataRollback(), _isFS(), _assertWritable(), _archNative(), _archFreeze(), _archFetchJSON() (+63 more)

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

### Community 15 - "Partido en vivo"
Cohesion: 0.17
Nodes (22): _liveMustHaveWinner(), _liveCanEdit(), _lmEnqueue(), _lmLiveDoc(), _findOtherLiveMatch(), _blockIfOtherLive(), _lmStart(), startLiveGroupMatch() (+14 more)

### Community 2 - "mejoras-page.js"
Cohesion: 0.03
Nodes (138): jsq(), openModal(), closeModal(), _syncScrollLock(), showToast(), renderAuthUI(), puedeMandarPedido(), applyTheme() (+130 more)

### Community 3 - "pes5-tool.js"
Cohesion: 0.04
Nodes (119): cargarReglasFirestore(), cargarTopeExtraEquipo(), recalcularPresupuestoReal(), _hayAplicadoSinPublicar(), jugadorDesdePlantillaReal(), jugadorParaEditor(), plantillaParaEditor(), registroDeId() (+111 more)

### Community 1 - "Palmares (Sala de Trofeos 3D)"
Cohesion: 0.03
Nodes (134): loadPalmaresComps(), palmaresCompByKey(), getTrophyStyles(), _uid(), trophyClassica(), trophyImperial(), trophyKonami(), trophyOrejona() (+126 more)

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

### Community 5 - "Sorteo en vivo"
Cohesion: 0.06
Nodes (73): newBomboId(), newBombo(), emptyState(), _journalCapturePhase(), _journalCaptureMatches(), effectiveDrawnIds(), ensureBC(), broadcast() (+65 more)

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

- **Why does `dbGetAll()` connect `Partidos` to `Palmares (Sala de Trofeos 3D)`, `mejoras-page.js`, `pes5-tool.js`, `Historial y H2H`, `Sorteo en vivo`, `Navegacion`, `Capa de datos`, `Bracket`, `pes5-yunacoins.js y yunacoins-rules.js`, `Equipos`, `Calendario`, `Tablas de posiciones`, `Partido en vivo`?**
  _High betweenness centrality (0.237) - this node is a cross-community bridge._
- **Why does `escHtml()` connect `Historial y H2H` to `Partidos`, `Palmares (Sala de Trofeos 3D)`, `mejoras-page.js`, `pes5-tool.js`, `Sorteo en vivo`, `Navegacion`, `Capa de datos`, `Perfil del presidente`, `Bracket`, `pes5-yunacoins.js y yunacoins-rules.js`, `Equipos`, `Calendario`, `Tablas de posiciones`?**
  _High betweenness centrality (0.196) - this node is a cross-community bridge._
- **Why does `showToast()` connect `Partidos` to `Palmares (Sala de Trofeos 3D)`, `pes5-tool.js`, `Historial y H2H`, `Sorteo en vivo`, `Navegacion`, `Capa de datos`, `Perfil del presidente`, `Bracket`, `Sonido`, `Calendario`, `Tablas de posiciones`, `Partido en vivo`, `Push`, `Generador de fechas`?**
  _High betweenness centrality (0.171) - this node is a cross-community bridge._
- **Are the 128 inferred relationships involving `dbGetAll()` (e.g. with `renderBracket()` and `getStandingsForPhase()`) actually correct?**
  _`dbGetAll()` has 128 INFERRED edges - model-reasoned connections that need verification._
- **Are the 95 inferred relationships involving `showToast()` (e.g. with `authForgotPassword()` and `authSignOut()`) actually correct?**
  _`showToast()` has 95 INFERRED edges - model-reasoned connections that need verification._
- **Are the 90 inferred relationships involving `escHtml()` (e.g. with `authForgotPassword()` and `teamLogoHtml()`) actually correct?**
  _`escHtml()` has 90 INFERRED edges - model-reasoned connections that need verification._
- **Are the 73 inferred relationships involving `dbGet()` (e.g. with `renderBracket()` and `getStandingsForPhase()`) actually correct?**
  _`dbGet()` has 73 INFERRED edges - model-reasoned connections that need verification._