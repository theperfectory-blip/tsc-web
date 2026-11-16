# Graph Report - .  (2026-11-16)

## Corpus Check
- solo AST

## Summary
- 1424 nodes · 3787 edges · 30 communities detected
- Extraction: 75% EXTRACTED · 25% INFERRED · 0% AMBIGUOUS · INFERRED: 943 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Promo APK|Promo APK]]
- [[_COMMUNITY_Perfil del presidente|Perfil del presidente]]
- [[_COMMUNITY_Splash de arranque|Splash de arranque]]
- [[_COMMUNITY_Bracket|Bracket]]
- [[_COMMUNITY_Historial y H2H|Historial y H2H]]
- [[_COMMUNITY_Sonido|Sonido]]
- [[_COMMUNITY_Sorteo en vivo|Sorteo en vivo]]
- [[_COMMUNITY_Bracket y Usuarios (admin)|Bracket y Usuarios (admin)]]
- [[_COMMUNITY_Tablas de posiciones|Tablas de posiciones]]
- [[_COMMUNITY_Calendario|Calendario]]
- [[_COMMUNITY_Navegacion|Navegacion]]
- [[_COMMUNITY_Config Cloudinary (ejemplo)|Config Cloudinary (ejemplo)]]
- [[_COMMUNITY_pes5-yunacoins.js y yunacoins-rules.js|pes5-yunacoins.js y yunacoins-rules.js]]
- [[_COMMUNITY_Equipos|Equipos]]
- [[_COMMUNITY_Push y Ajustes y arranque|Push y Ajustes y arranque]]
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
- [[_COMMUNITY_Estado global|Estado global]]

## God Nodes (most connected - your core abstractions)
1. `dbGetAll()` - 133 edges
2. `showToast()` - 100 edges
3. `escHtml()` - 93 edges
4. `dbGet()` - 76 edges
5. `dbErrorMsg()` - 34 edges
6. `dbPut()` - 32 edges
7. `showConfirm()` - 32 edges
8. `renderAdminPage()` - 22 edges
9. `currentPlayer()` - 21 edges
10. `activeBombo()` - 21 edges

## Surprising Connections (you probably didn't know these)
- `_calCenterAnchorScroll()` --calls--> `_focusPublicSectionInner()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\fix-lecturas-historial\tsc-src\js\calendar.js → D:\Desktop\tsc.web\.claude\worktrees\fix-lecturas-historial\tsc-src\js\nav.js
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

### Community 7 - "Perfil del presidente"
Cohesion: 0.04
Nodes (65): _usersCol(), _injectAuthModal(), openAuthModal(), toggleAuthMode(), _renderAuthModalMode(), authForgotPassword(), authSubmit(), _authErrorMsg() (+57 more)

### Community 21 - "Splash de arranque"
Cohesion: 0.4
Nodes (0): 

### Community 0 - "Bracket"
Cohesion: 0.03
Nodes (212): getWinner(), spawnRocket(), loop(), _cleanup(), _onClick(), renderBracket(), buildBracketRounds(), getStandingsForPhase() (+204 more)

### Community 4 - "Historial y H2H"
Cohesion: 0.05
Nodes (90): teamLogoHtml(), _histNorm(), _histResolveExactTeam(), _histResolveTeam(), computeResultado(), loadStaticHistory(), seedHistoryIfEmpty(), _applyFilters() (+82 more)

### Community 8 - "Sonido"
Cohesion: 0.07
Nodes (42): _getAudioCtx(), resume(), _fwSoundOff(), _soundRocketLaunch(), _soundExplosion(), liveRadarStart(), _palmAudio(), _palmSoundOff() (+34 more)

### Community 5 - "Sorteo en vivo"
Cohesion: 0.06
Nodes (74): hexToRgb(), lighten(), newBomboId(), newBombo(), emptyState(), _journalCapturePhase(), effectiveDrawnIds(), ensureBC() (+66 more)

### Community 15 - "Bracket y Usuarios (admin)"
Cohesion: 0.17
Nodes (9): rgbStr(), Particle, Rocket, renderAdmUsuarios(), _uaBackfillUsernames(), adminSetUserLock(), adminSetUserRole(), adminSetUserTeam() (+1 more)

### Community 14 - "Tablas de posiciones"
Cohesion: 0.13
Nodes (20): refBadgeHTML(), openCriteriaModal(), closeCriteriaModal(), criteriaDragEnd(), criteriaDrop(), criteriaDropOnContainer(), criteriaDisable(), criteriaRestore() (+12 more)

### Community 13 - "Calendario"
Cohesion: 0.11
Nodes (31): _calFormatDay(), _calTodayStr(), _calViewerTodayStr(), _calMatchInstant(), _calMatchTimeLocal(), _calLocalDateStr(), _calJornadaViewerDate(), _calLogo() (+23 more)

### Community 6 - "Navegacion"
Cohesion: 0.06
Nodes (72): _calHeroGoComp(), _pubSwitchHistoryView(), liveStop(), liveSubscribe(), liveRadarStop(), liveRadarProximity(), getPublicScrollPages(), getMountedPublicPages() (+64 more)

### Community 22 - "Config Cloudinary (ejemplo)"
Cohesion: 1.0
Nodes (2): cloudReady(), uploadImageToCloud()

### Community 10 - "pes5-yunacoins.js y yunacoins-rules.js"
Cohesion: 0.08
Nodes (50): openColorPicker(), _compPickColor(), recalcularPresupuestoReal(), R(), esc(), ahora(), haceTexto(), emailActual() (+42 more)

### Community 12 - "Equipos"
Cohesion: 0.06
Nodes (41): resize(), frame(), wake(), stop(), setVariant(), init(), reduced(), _settle() (+33 more)

### Community 9 - "Push y Ajustes y arranque"
Cohesion: 0.06
Nodes (48): getVariant(), _plugin(), isEnabled(), _clearToken(), _setPendingTokenRemoval(), _clearPendingTokenRemoval(), _pushDocRef(), _currentTimezone() (+40 more)

### Community 11 - "Capa de datos"
Cohesion: 0.07
Nodes (48): exportFullDB(), downloadJSON(), _dataBackupStores(), _dataTypeOk(), _dataValidateRecord(), _dataValidateStoreItems(), _dataValidateBackup(), _dataWarnings() (+40 more)

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

### Community 16 - "Partido en vivo"
Cohesion: 0.22
Nodes (15): _liveMustHaveWinner(), _liveCanEdit(), _lmEnqueue(), startLiveGroupMatch(), startLiveBracketMatch(), startLiveBracketLeg(), startLivePlayoffLeg(), openLiveMatch() (+7 more)

### Community 1 - "mejoras-page.js"
Cohesion: 0.03
Nodes (138): jsq(), openModal(), closeModal(), _syncScrollLock(), showToast(), renderAuthUI(), puedeMandarPedido(), applyTheme() (+130 more)

### Community 3 - "pes5-tool.js"
Cohesion: 0.04
Nodes (117): cargarReglasFirestore(), cargarTopeExtraEquipo(), _hayAplicadoSinPublicar(), jugadorDesdePlantillaReal(), jugadorParaEditor(), plantillaParaEditor(), registroDeId(), cambiosDesdeEditor() (+109 more)

### Community 2 - "Palmares (Sala de Trofeos 3D)"
Cohesion: 0.03
Nodes (121): palmaresCompByKey(), getTrophyStyles(), _uid(), trophyClassica(), trophyImperial(), trophyKonami(), trophyOrejona(), trophySobria() (+113 more)

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

- **Why does `escHtml()` connect `Historial y H2H` to `Bracket`, `mejoras-page.js`, `Palmares (Sala de Trofeos 3D)`, `pes5-tool.js`, `Sorteo en vivo`, `Navegacion`, `Perfil del presidente`, `Push y Ajustes y arranque`, `pes5-yunacoins.js y yunacoins-rules.js`, `Equipos`, `Calendario`, `Tablas de posiciones`, `Bracket y Usuarios (admin)`?**
  _High betweenness centrality (0.226) - this node is a cross-community bridge._
- **Why does `dbGetAll()` connect `Bracket` to `mejoras-page.js`, `Palmares (Sala de Trofeos 3D)`, `pes5-tool.js`, `Historial y H2H`, `Sorteo en vivo`, `Navegacion`, `pes5-yunacoins.js y yunacoins-rules.js`, `Capa de datos`, `Equipos`, `Calendario`, `Bracket y Usuarios (admin)`, `Partido en vivo`?**
  _High betweenness centrality (0.214) - this node is a cross-community bridge._
- **Why does `showToast()` connect `Bracket` to `Palmares (Sala de Trofeos 3D)`, `pes5-tool.js`, `Historial y H2H`, `Sorteo en vivo`, `Navegacion`, `Perfil del presidente`, `Sonido`, `Push y Ajustes y arranque`, `pes5-yunacoins.js y yunacoins-rules.js`, `Capa de datos`, `Calendario`, `Tablas de posiciones`, `Bracket y Usuarios (admin)`, `Partido en vivo`, `Generador de fechas`?**
  _High betweenness centrality (0.157) - this node is a cross-community bridge._
- **Are the 130 inferred relationships involving `dbGetAll()` (e.g. with `renderBracket()` and `getStandingsForPhase()`) actually correct?**
  _`dbGetAll()` has 130 INFERRED edges - model-reasoned connections that need verification._
- **Are the 96 inferred relationships involving `showToast()` (e.g. with `authForgotPassword()` and `authSignOut()`) actually correct?**
  _`showToast()` has 96 INFERRED edges - model-reasoned connections that need verification._
- **Are the 91 inferred relationships involving `escHtml()` (e.g. with `authForgotPassword()` and `teamLogoHtml()`) actually correct?**
  _`escHtml()` has 91 INFERRED edges - model-reasoned connections that need verification._
- **Are the 73 inferred relationships involving `dbGet()` (e.g. with `renderBracket()` and `getStandingsForPhase()`) actually correct?**
  _`dbGet()` has 73 INFERRED edges - model-reasoned connections that need verification._