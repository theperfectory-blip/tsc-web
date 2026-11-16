# Graph Report - .  (2026-11-16)

## Corpus Check
- solo AST

## Summary
- 1442 nodes · 3852 edges · 29 communities detected
- Extraction: 75% EXTRACTED · 25% INFERRED · 0% AMBIGUOUS · INFERRED: 962 edges (avg confidence: 0.8)
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
- [[_COMMUNITY_Tablas de posiciones|Tablas de posiciones]]
- [[_COMMUNITY_Calendario|Calendario]]
- [[_COMMUNITY_Navegacion|Navegacion]]
- [[_COMMUNITY_Config Cloudinary (ejemplo)|Config Cloudinary (ejemplo)]]
- [[_COMMUNITY_yunacoins-rules.js y pes5-yunacoins.js|yunacoins-rules.js y pes5-yunacoins.js]]
- [[_COMMUNITY_Capa de datos|Capa de datos]]
- [[_COMMUNITY_Equipos|Equipos]]
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
- [[_COMMUNITY_Estado global|Estado global]]

## God Nodes (most connected - your core abstractions)
1. `dbGetAll()` - 136 edges
2. `showToast()` - 101 edges
3. `escHtml()` - 94 edges
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
- `dbGetAll()` --calls--> `_palmDuplicate()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\fix-lecturas-historial\tsc-src\js\db.js → D:\Desktop\tsc.web\.claude\worktrees\fix-lecturas-historial\tsc-src\js\palmares.js
- `getForSeason()` --calls--> `resolveTeamData()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\fix-lecturas-historial\tsc-src\js\db.js → D:\Desktop\tsc.web\.claude\worktrees\fix-lecturas-historial\tsc-src\js\standings.js
- `loadDraft()` --calls--> `aplicarCambiosAlJugador()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\fix-lecturas-historial\tsc-src\js\mejoras-page.js → D:\Desktop\tsc.web\.claude\worktrees\fix-lecturas-historial\tsc-src\js\pes5-plantilla.js
- `aplicarPedidosSeleccionados()` --calls--> `motivoRechazoMejora()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\fix-lecturas-historial\tsc-src\js\pes5-tool.js → D:\Desktop\tsc.web\.claude\worktrees\fix-lecturas-historial\tsc-src\js\yunacoins-rules.js

## Communities

### Community 18 - "Promo APK"
Cohesion: 0.36
Nodes (9): _apkIsNativeApp(), _apkShouldOffer(), _apkAlreadyDownloaded(), _apkClosedRecently(), openApkPromo(), _apkHideOverlay(), closeApkPromo(), tscApkDownloadClick() (+1 more)

### Community 4 - "Perfil del presidente"
Cohesion: 0.03
Nodes (79): _usersCol(), _injectAuthModal(), openAuthModal(), toggleAuthMode(), _renderAuthModalMode(), authForgotPassword(), authSubmit(), _authErrorMsg() (+71 more)

### Community 9 - "Push y Ajustes y arranque"
Cohesion: 0.06
Nodes (51): authSignOut(), getVariant(), _plugin(), isEnabled(), _clearToken(), _setPendingTokenRemoval(), _clearPendingTokenRemoval(), _pushDocRef() (+43 more)

### Community 20 - "Splash de arranque"
Cohesion: 0.4
Nodes (0): 

### Community 0 - "Bracket"
Cohesion: 0.03
Nodes (174): getWinner(), spawnRocket(), loop(), _cleanup(), _onClick(), renderBracket(), buildBracketRounds(), getStandingsForPhase() (+166 more)

### Community 7 - "Bracket publico"
Cohesion: 0.07
Nodes (56): teamLogoHtml(), _coinsRun(), _coinsTemporadaInfo(), _coinsTemporadaCobro(), _coinsAmount(), renderAdmCoins(), renderCoinsTable(), filterCoinsTable() (+48 more)

### Community 11 - "Sonido"
Cohesion: 0.07
Nodes (42): _getAudioCtx(), resume(), _fwSoundOff(), _soundRocketLaunch(), _soundExplosion(), liveRadarStart(), _palmAudio(), _palmSoundOff() (+34 more)

### Community 6 - "Sorteo en vivo"
Cohesion: 0.06
Nodes (75): hexToRgb(), lighten(), renderAdmSorteo(), newBomboId(), newBombo(), emptyState(), _journalCapturePhase(), effectiveDrawnIds() (+67 more)

### Community 15 - "Tablas de posiciones"
Cohesion: 0.12
Nodes (22): refBadgeHTML(), saveCriteria(), openCriteriaModal(), closeCriteriaModal(), criteriaDragEnd(), criteriaDrop(), criteriaDropOnContainer(), criteriaDisable() (+14 more)

### Community 14 - "Calendario"
Cohesion: 0.11
Nodes (35): _calFormatDay(), _calTodayStr(), _calViewerTodayStr(), _calMatchInstant(), _calMatchTimeLocal(), _calLocalDateStr(), _calJornadaViewerDate(), _calLogo() (+27 more)

### Community 12 - "Navegacion"
Cohesion: 0.08
Nodes (52): _calCenterAnchorScroll(), _calHeroGoH2H(), _calHeroGoComp(), liveStop(), liveSubscribe(), liveRadarStop(), liveRadarProximity(), _subscribeAdminMatchesLive() (+44 more)

### Community 21 - "Config Cloudinary (ejemplo)"
Cohesion: 1.0
Nodes (2): cloudReady(), uploadImageToCloud()

### Community 8 - "yunacoins-rules.js y pes5-yunacoins.js"
Cohesion: 0.07
Nodes (55): openColorPicker(), _compPickColor(), R(), esc(), ahora(), haceTexto(), emailActual(), leerSync() (+47 more)

### Community 10 - "Capa de datos"
Cohesion: 0.07
Nodes (55): _deletePhaseCascade(), renderAdmData(), renderDBInfo(), exportFullDB(), downloadJSON(), _dataBackupStores(), _dataTypeOk(), _dataValidateRecord() (+47 more)

### Community 13 - "Equipos"
Cohesion: 0.06
Nodes (41): resize(), frame(), wake(), stop(), setVariant(), init(), reduced(), _settle() (+33 more)

### Community 17 - "Delegacion de eventos"
Cohesion: 0.2
Nodes (6): _onTokens(), _onParse(), _onIsNative(), _onEventFor(), _onResolve(), _onRun()

### Community 22 - "Config Firebase (ejemplo)"
Cohesion: 1.0
Nodes (0): 

### Community 23 - "Config Firebase"
Cohesion: 1.0
Nodes (0): 

### Community 16 - "Generador de fechas"
Cohesion: 0.18
Nodes (12): _fxScheduledCount(), _fxShuffle(), fxBuildRoundRobin(), fxBuildLuisRoute(), _fxBuildLuisRouteForLegs(), _fxGenerateCalendarAndRoute(), fxGroupLockReason(), openFixtureGenModal() (+4 more)

### Community 5 - "Historial y H2H"
Cohesion: 0.05
Nodes (85): _histNorm(), _histResolveExactTeam(), _histResolveTeam(), computeResultado(), loadStaticHistory(), seedHistoryIfEmpty(), appendOrUpdateHistory(), historyRecordFor() (+77 more)

### Community 1 - "mejoras-page.js"
Cohesion: 0.03
Nodes (144): jsq(), openModal(), closeModal(), _syncScrollLock(), showToast(), renderAuthUI(), puedeMandarPedido(), applyTheme() (+136 more)

### Community 3 - "pes5-tool.js"
Cohesion: 0.04
Nodes (121): jugadorDesdePlantillaReal(), desmontar(), jugadorParaEditor(), plantillaParaEditor(), registroDeId(), cambiosDesdeEditor(), aplicarCambiosAlJugador(), canonicoJSON() (+113 more)

### Community 2 - "Palmares (Sala de Trofeos 3D)"
Cohesion: 0.03
Nodes (122): loadPalmaresComps(), getTrophyStyles(), _uid(), trophyClassica(), trophyImperial(), trophyKonami(), trophyOrejona(), trophySobria() (+114 more)

### Community 24 - "pes5-bloqueo.js"
Cohesion: 1.0
Nodes (0): 

### Community 19 - "pes5-clubes.js"
Cohesion: 0.62
Nodes (6): activos(), vinculado(), duenosDeClub(), otroEquipoConClub(), repetidoDe(), opcionesClub()

### Community 25 - "pes5-crypt.js"
Cohesion: 1.0
Nodes (0): 

### Community 26 - "pes5-editor.js"
Cohesion: 1.0
Nodes (0): 

### Community 27 - "pes5-save.js"
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
- **Thin community `Estado global`** (1 nodes): `state.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dbGetAll()` connect `Bracket` to `mejoras-page.js`, `Palmares (Sala de Trofeos 3D)`, `pes5-tool.js`, `Perfil del presidente`, `Historial y H2H`, `Sorteo en vivo`, `Bracket publico`, `yunacoins-rules.js y pes5-yunacoins.js`, `Push y Ajustes y arranque`, `Capa de datos`, `Equipos`, `Calendario`, `Generador de fechas`?**
  _High betweenness centrality (0.252) - this node is a cross-community bridge._
- **Why does `escHtml()` connect `Bracket publico` to `Bracket`, `mejoras-page.js`, `Palmares (Sala de Trofeos 3D)`, `pes5-tool.js`, `Perfil del presidente`, `Historial y H2H`, `Sorteo en vivo`, `yunacoins-rules.js y pes5-yunacoins.js`, `Push y Ajustes y arranque`, `Capa de datos`, `Equipos`, `Calendario`, `Tablas de posiciones`?**
  _High betweenness centrality (0.221) - this node is a cross-community bridge._
- **Why does `showToast()` connect `Bracket` to `Palmares (Sala de Trofeos 3D)`, `pes5-tool.js`, `Perfil del presidente`, `Historial y H2H`, `Sorteo en vivo`, `Bracket publico`, `yunacoins-rules.js y pes5-yunacoins.js`, `Push y Ajustes y arranque`, `Capa de datos`, `Sonido`, `Navegacion`, `Calendario`, `Tablas de posiciones`, `Generador de fechas`?**
  _High betweenness centrality (0.147) - this node is a cross-community bridge._
- **Are the 133 inferred relationships involving `dbGetAll()` (e.g. with `renderBracket()` and `getStandingsForPhase()`) actually correct?**
  _`dbGetAll()` has 133 INFERRED edges - model-reasoned connections that need verification._
- **Are the 97 inferred relationships involving `showToast()` (e.g. with `authForgotPassword()` and `authSignOut()`) actually correct?**
  _`showToast()` has 97 INFERRED edges - model-reasoned connections that need verification._
- **Are the 92 inferred relationships involving `escHtml()` (e.g. with `authForgotPassword()` and `teamLogoHtml()`) actually correct?**
  _`escHtml()` has 92 INFERRED edges - model-reasoned connections that need verification._
- **Are the 73 inferred relationships involving `dbGet()` (e.g. with `renderBracket()` and `getStandingsForPhase()`) actually correct?**
  _`dbGet()` has 73 INFERRED edges - model-reasoned connections that need verification._