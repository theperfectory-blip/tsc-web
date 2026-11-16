# Graph Report - .  (2026-11-16)

## Corpus Check
- solo AST

## Summary
- 1444 nodes · 3863 edges · 30 communities detected
- Extraction: 75% EXTRACTED · 25% INFERRED · 0% AMBIGUOUS · INFERRED: 966 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Promo APK|Promo APK]]
- [[_COMMUNITY_Perfil del presidente|Perfil del presidente]]
- [[_COMMUNITY_Splash de arranque|Splash de arranque]]
- [[_COMMUNITY_Bracket|Bracket]]
- [[_COMMUNITY_Bracket publico|Bracket publico]]
- [[_COMMUNITY_Sonido|Sonido]]
- [[_COMMUNITY_Partidos|Partidos]]
- [[_COMMUNITY_Tablas de posiciones|Tablas de posiciones]]
- [[_COMMUNITY_Calendario|Calendario]]
- [[_COMMUNITY_Navegacion|Navegacion]]
- [[_COMMUNITY_Config Cloudinary (ejemplo)|Config Cloudinary (ejemplo)]]
- [[_COMMUNITY_Equipos|Equipos]]
- [[_COMMUNITY_pes5-yunacoins.js y yunacoins-rules.js|pes5-yunacoins.js y yunacoins-rules.js]]
- [[_COMMUNITY_Capa de datos|Capa de datos]]
- [[_COMMUNITY_Push y Ajustes y arranque|Push y Ajustes y arranque]]
- [[_COMMUNITY_Delegacion de eventos|Delegacion de eventos]]
- [[_COMMUNITY_Config Firebase (ejemplo)|Config Firebase (ejemplo)]]
- [[_COMMUNITY_Config Firebase|Config Firebase]]
- [[_COMMUNITY_Generador de fechas|Generador de fechas]]
- [[_COMMUNITY_Historial y H2H|Historial y H2H]]
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
1. `dbGetAll()` - 138 edges
2. `showToast()` - 101 edges
3. `escHtml()` - 95 edges
4. `dbGet()` - 76 edges
5. `dbErrorMsg()` - 34 edges
6. `dbPut()` - 32 edges
7. `showConfirm()` - 32 edges
8. `renderAdminPage()` - 22 edges
9. `currentPlayer()` - 21 edges
10. `aplicarPedidosSeleccionados()` - 21 edges

## Surprising Connections (you probably didn't know these)
- `_calInitHeroCountdown()` --calls--> `countdown()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\fix-lecturas-historial\tsc-src\js\calendar.js → D:\Desktop\tsc.web\.claude\worktrees\fix-lecturas-historial\tsc-src\js\motion.js
- `getForSeason()` --calls--> `resolveTeamData()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\fix-lecturas-historial\tsc-src\js\db.js → D:\Desktop\tsc.web\.claude\worktrees\fix-lecturas-historial\tsc-src\js\standings.js
- `_htStatHeadCell()` --calls--> `escHtml()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\fix-lecturas-historial\tsc-src\js\history.js → D:\Desktop\tsc.web\.claude\worktrees\fix-lecturas-historial\tsc-src\js\sanitize.js
- `loadDraft()` --calls--> `aplicarCambiosAlJugador()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\fix-lecturas-historial\tsc-src\js\mejoras-page.js → D:\Desktop\tsc.web\.claude\worktrees\fix-lecturas-historial\tsc-src\js\pes5-plantilla.js
- `goAdminPage()` --calls--> `openFasesForComp()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\fix-lecturas-historial\tsc-src\js\nav.js → D:\Desktop\tsc.web\.claude\worktrees\fix-lecturas-historial\tsc-src\js\phases.js

## Communities

### Community 19 - "Promo APK"
Cohesion: 0.36
Nodes (9): _apkIsNativeApp(), _apkShouldOffer(), _apkAlreadyDownloaded(), _apkClosedRecently(), openApkPromo(), _apkHideOverlay(), closeApkPromo(), tscApkDownloadClick() (+1 more)

### Community 8 - "Perfil del presidente"
Cohesion: 0.05
Nodes (63): _usersCol(), _injectAuthModal(), openAuthModal(), toggleAuthMode(), _renderAuthModalMode(), authForgotPassword(), authSubmit(), _authErrorMsg() (+55 more)

### Community 21 - "Splash de arranque"
Cohesion: 0.4
Nodes (0): 

### Community 4 - "Bracket"
Cohesion: 0.05
Nodes (70): getWinner(), hexToRgb(), rgbStr(), lighten(), Particle, spawnRocket(), loop(), _cleanup() (+62 more)

### Community 9 - "Bracket publico"
Cohesion: 0.07
Nodes (61): teamLogoHtml(), _coinsRun(), _coinsTemporadaInfo(), _coinsTemporadaCobro(), _coinsAmount(), renderCoinsTable(), filterCoinsTable(), _coinsCobroLineaHTML() (+53 more)

### Community 11 - "Sonido"
Cohesion: 0.07
Nodes (43): _getAudioCtx(), resume(), _fwSoundOff(), _soundRocketLaunch(), _soundExplosion(), Rocket, liveRadarStart(), _palmAudio() (+35 more)

### Community 1 - "Partidos"
Cohesion: 0.04
Nodes (125): deleteBracketMatch(), calLblNavMonth(), renderAdmCalendarLabels(), renderAdmCoins(), _sortComps(), renderAdmComps(), renderCompsGrid(), closeCompModal() (+117 more)

### Community 16 - "Tablas de posiciones"
Cohesion: 0.1
Nodes (28): refBadgeHTML(), getCriteria(), saveCriteria(), calcGroupStandings(), renderGroupTable(), openCriteriaModal(), closeCriteriaModal(), criteriaDragEnd() (+20 more)

### Community 15 - "Calendario"
Cohesion: 0.12
Nodes (32): _calFormatDay(), _calTodayStr(), _calViewerTodayStr(), _calMatchInstant(), _calMatchTimeLocal(), _calLocalDateStr(), _calJornadaViewerDate(), _calLogo() (+24 more)

### Community 5 - "Navegacion"
Cohesion: 0.06
Nodes (75): _calCenterAnchorScroll(), _calHeroGoH2H(), _calHeroGoComp(), _pubSwitchHistoryView(), liveStop(), liveSubscribe(), liveRadarStop(), liveRadarProximity() (+67 more)

### Community 22 - "Config Cloudinary (ejemplo)"
Cohesion: 1.0
Nodes (2): cloudReady(), uploadImageToCloud()

### Community 13 - "Equipos"
Cohesion: 0.06
Nodes (43): cloudReady(), uploadImageToCloud(), resize(), frame(), wake(), stop(), setVariant(), init() (+35 more)

### Community 10 - "pes5-yunacoins.js y yunacoins-rules.js"
Cohesion: 0.07
Nodes (55): openColorPicker(), _compPickColor(), cargarTemporadaCobro(), cargarTopeTemporada(), R(), esc(), ahora(), haceTexto() (+47 more)

### Community 14 - "Capa de datos"
Cohesion: 0.09
Nodes (43): _deletePhaseCascade(), _dataApplyImport(), _dataRollback(), _isFS(), _assertWritable(), _archNative(), _archFreeze(), _archFetchJSON() (+35 more)

### Community 12 - "Push y Ajustes y arranque"
Cohesion: 0.06
Nodes (50): getVariant(), _plugin(), isEnabled(), _clearToken(), _setPendingTokenRemoval(), _clearPendingTokenRemoval(), _pushDocRef(), _currentTimezone() (+42 more)

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
Cohesion: 0.21
Nodes (9): _fxShuffle(), fxBuildRoundRobin(), fxBuildLuisRoute(), _fxBuildLuisRouteForLegs(), _fxGenerateCalendarAndRoute(), fxShuffleAgain(), renderFixtureGenModal(), _fxSetLoaderProgress() (+1 more)

### Community 7 - "Historial y H2H"
Cohesion: 0.06
Nodes (72): _histNorm(), _histResolveExactTeam(), _histResolveTeam(), computeResultado(), loadStaticHistory(), seedHistoryIfEmpty(), appendOrUpdateHistory(), historyRecordFor() (+64 more)

### Community 0 - "mejoras-page.js"
Cohesion: 0.03
Nodes (138): jsq(), openModal(), closeModal(), _syncScrollLock(), showToast(), renderAuthUI(), puedeMandarPedido(), applyTheme() (+130 more)

### Community 2 - "pes5-tool.js"
Cohesion: 0.04
Nodes (127): cargarReglasFirestore(), cargarTopeExtraEquipo(), recalcularPresupuestoReal(), _hayAplicadoSinPublicar(), jugadorDesdePlantillaReal(), desmontar(), jugadorParaEditor(), plantillaParaEditor() (+119 more)

### Community 3 - "Palmares (Sala de Trofeos 3D)"
Cohesion: 0.03
Nodes (116): loadPalmaresComps(), getTrophyStyles(), _uid(), trophyClassica(), trophyImperial(), trophyKonami(), trophyOrejona(), trophySobria() (+108 more)

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

### Community 6 - "Sorteo en vivo"
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

- **Why does `dbGetAll()` connect `Partidos` to `mejoras-page.js`, `pes5-tool.js`, `Palmares (Sala de Trofeos 3D)`, `Bracket`, `Navegacion`, `Sorteo en vivo`, `Historial y H2H`, `Bracket publico`, `pes5-yunacoins.js y yunacoins-rules.js`, `Push y Ajustes y arranque`, `Equipos`, `Capa de datos`, `Calendario`, `Tablas de posiciones`?**
  _High betweenness centrality (0.205) - this node is a cross-community bridge._
- **Why does `showToast()` connect `Partidos` to `pes5-tool.js`, `Palmares (Sala de Trofeos 3D)`, `Bracket`, `Navegacion`, `Sorteo en vivo`, `Historial y H2H`, `Perfil del presidente`, `Bracket publico`, `pes5-yunacoins.js y yunacoins-rules.js`, `Sonido`, `Push y Ajustes y arranque`, `Equipos`, `Calendario`, `Tablas de posiciones`, `Generador de fechas`?**
  _High betweenness centrality (0.178) - this node is a cross-community bridge._
- **Why does `escHtml()` connect `Bracket publico` to `mejoras-page.js`, `Partidos`, `pes5-tool.js`, `Palmares (Sala de Trofeos 3D)`, `Bracket`, `Navegacion`, `Sorteo en vivo`, `Historial y H2H`, `Perfil del presidente`, `pes5-yunacoins.js y yunacoins-rules.js`, `Push y Ajustes y arranque`, `Equipos`, `Calendario`, `Tablas de posiciones`?**
  _High betweenness centrality (0.175) - this node is a cross-community bridge._
- **Are the 135 inferred relationships involving `dbGetAll()` (e.g. with `renderBracket()` and `getStandingsForPhase()`) actually correct?**
  _`dbGetAll()` has 135 INFERRED edges - model-reasoned connections that need verification._
- **Are the 97 inferred relationships involving `showToast()` (e.g. with `authForgotPassword()` and `authSignOut()`) actually correct?**
  _`showToast()` has 97 INFERRED edges - model-reasoned connections that need verification._
- **Are the 93 inferred relationships involving `escHtml()` (e.g. with `authForgotPassword()` and `teamLogoHtml()`) actually correct?**
  _`escHtml()` has 93 INFERRED edges - model-reasoned connections that need verification._
- **Are the 73 inferred relationships involving `dbGet()` (e.g. with `renderBracket()` and `getStandingsForPhase()`) actually correct?**
  _`dbGet()` has 73 INFERRED edges - model-reasoned connections that need verification._