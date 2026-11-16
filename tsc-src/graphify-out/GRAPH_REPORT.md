# Graph Report - .  (2026-11-16)

## Corpus Check
- solo AST

## Summary
- 1517 nodes · 4123 edges · 28 communities detected
- Extraction: 76% EXTRACTED · 24% INFERRED · 0% AMBIGUOUS · INFERRED: 1007 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Promo APK|Promo APK]]
- [[_COMMUNITY_Perfil del presidente|Perfil del presidente]]
- [[_COMMUNITY_Splash de arranque|Splash de arranque]]
- [[_COMMUNITY_Bracket|Bracket]]
- [[_COMMUNITY_Bracket publico|Bracket publico]]
- [[_COMMUNITY_Sonido|Sonido]]
- [[_COMMUNITY_Sorteo en vivo|Sorteo en vivo]]
- [[_COMMUNITY_Tablas de posiciones|Tablas de posiciones]]
- [[_COMMUNITY_Calendario|Calendario]]
- [[_COMMUNITY_Config Cloudinary (ejemplo)|Config Cloudinary (ejemplo)]]
- [[_COMMUNITY_Equipos|Equipos]]
- [[_COMMUNITY_pes5-yunacoins.js|pes5-yunacoins.js]]
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
- [[_COMMUNITY_Estado global|Estado global]]

## God Nodes (most connected - your core abstractions)
1. `dbGetAll()` - 138 edges
2. `showToast()` - 107 edges
3. `escHtml()` - 99 edges
4. `dbGet()` - 76 edges
5. `dbErrorMsg()` - 34 edges
6. `showConfirm()` - 33 edges
7. `dbPut()` - 32 edges
8. `aplicarPedidosSeleccionados()` - 32 edges
9. `currentPlayer()` - 23 edges
10. `renderAdminPage()` - 22 edges

## Surprising Connections (you probably didn't know these)
- `_calInitHeroCountdown()` --calls--> `countdown()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\emparejar-80\tsc-src\js\calendar.js → D:\Desktop\tsc.web\.claude\worktrees\emparejar-80\tsc-src\js\motion.js
- `getForSeason()` --calls--> `resolveTeamData()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\emparejar-80\tsc-src\js\db.js → D:\Desktop\tsc.web\.claude\worktrees\emparejar-80\tsc-src\js\standings.js
- `loadDraft()` --calls--> `aplicarCambiosAlJugador()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\emparejar-80\tsc-src\js\mejoras-page.js → D:\Desktop\tsc.web\.claude\worktrees\emparejar-80\tsc-src\js\pes5-plantilla.js
- `goAdminPage()` --calls--> `openFasesForComp()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\emparejar-80\tsc-src\js\nav.js → D:\Desktop\tsc.web\.claude\worktrees\emparejar-80\tsc-src\js\phases.js
- `publicarDesactualizadasClick()` --calls--> `showConfirm()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\emparejar-80\tsc-src\js\pes5-tool.js → D:\Desktop\tsc.web\.claude\worktrees\emparejar-80\tsc-src\js\ui-utils.js

## Communities

### Community 17 - "Promo APK"
Cohesion: 0.36
Nodes (9): _apkIsNativeApp(), _apkShouldOffer(), _apkAlreadyDownloaded(), _apkClosedRecently(), openApkPromo(), _apkHideOverlay(), closeApkPromo(), tscApkDownloadClick() (+1 more)

### Community 8 - "Perfil del presidente"
Cohesion: 0.05
Nodes (61): _usersCol(), _injectAuthModal(), openAuthModal(), toggleAuthMode(), _renderAuthModalMode(), authForgotPassword(), authSubmit(), _authErrorMsg() (+53 more)

### Community 19 - "Splash de arranque"
Cohesion: 0.4
Nodes (0): 

### Community 1 - "Bracket"
Cohesion: 0.03
Nodes (172): getWinner(), spawnRocket(), loop(), _cleanup(), _onClick(), renderBracket(), buildBracketRounds(), getStandingsForPhase() (+164 more)

### Community 12 - "Bracket publico"
Cohesion: 0.08
Nodes (47): teamLogoHtml(), _calLogo(), _coinsRun(), _coinsTemporadaInfo(), _coinsTemporadaCobro(), _coinsAmount(), renderAdmCoins(), renderCoinsTable() (+39 more)

### Community 6 - "Sonido"
Cohesion: 0.05
Nodes (53): _getAudioCtx(), resume(), _fwSoundOff(), _soundRocketLaunch(), _soundExplosion(), rgbStr(), Particle, Rocket (+45 more)

### Community 5 - "Sorteo en vivo"
Cohesion: 0.06
Nodes (77): hexToRgb(), lighten(), newBomboId(), newBombo(), emptyState(), _journalCapturePhase(), _journalCaptureMatches(), effectiveDrawnIds() (+69 more)

### Community 14 - "Tablas de posiciones"
Cohesion: 0.12
Nodes (24): refBadgeHTML(), saveCriteria(), openCriteriaModal(), closeCriteriaModal(), criteriaDragEnd(), criteriaDrop(), criteriaDropOnContainer(), criteriaDisable() (+16 more)

### Community 4 - "Calendario"
Cohesion: 0.04
Nodes (107): _calFormatDay(), _calTodayStr(), _calViewerTodayStr(), _calMatchInstant(), _calMatchTimeLocal(), _calLocalDateStr(), _calJornadaViewerDate(), _calWhenError() (+99 more)

### Community 20 - "Config Cloudinary (ejemplo)"
Cohesion: 1.0
Nodes (2): cloudReady(), uploadImageToCloud()

### Community 9 - "Equipos"
Cohesion: 0.06
Nodes (48): cloudReady(), uploadImageToCloud(), resize(), frame(), wake(), stop(), setVariant(), init() (+40 more)

### Community 13 - "pes5-yunacoins.js"
Cohesion: 0.15
Nodes (31): openColorPicker(), _compPickColor(), R(), esc(), ahora(), haceTexto(), emailActual(), leerSync() (+23 more)

### Community 11 - "Capa de datos"
Cohesion: 0.07
Nodes (53): _deletePhaseCascade(), exportFullDB(), downloadJSON(), _dataBackupStores(), _dataTypeOk(), _dataValidateRecord(), _dataValidateStoreItems(), _dataValidateBackup() (+45 more)

### Community 10 - "Push y Ajustes y arranque"
Cohesion: 0.06
Nodes (49): getVariant(), _plugin(), isEnabled(), _clearToken(), _setPendingTokenRemoval(), _clearPendingTokenRemoval(), _pushDocRef(), _currentTimezone() (+41 more)

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

### Community 7 - "Historial y H2H"
Cohesion: 0.06
Nodes (71): _histNorm(), _histResolveExactTeam(), _histResolveTeam(), computeResultado(), loadStaticHistory(), seedHistoryIfEmpty(), appendOrUpdateHistory(), historyRecordFor() (+63 more)

### Community 2 - "mejoras-page.js"
Cohesion: 0.03
Nodes (172): jsq(), openModal(), closeModal(), _syncScrollLock(), showToast(), renderAuthUI(), puedeMandarPedido(), applyTheme() (+164 more)

### Community 0 - "pes5-tool.js"
Cohesion: 0.03
Nodes (185): cargarReglasFirestore(), cargarTopeTemporada(), jugadorParaEditor(), plantillaParaEditor(), atributosDeEditor(), cambiosDesdeEditor(), aplicarCambiosAlJugador(), canonicoJSON() (+177 more)

### Community 3 - "Palmares (Sala de Trofeos 3D)"
Cohesion: 0.03
Nodes (131): loadPalmaresComps(), palmaresCompByKey(), getTrophyStyles(), _uid(), trophyClassica(), trophyImperial(), trophyKonami(), trophyOrejona() (+123 more)

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

### Community 27 - "Estado global"
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

- **Why does `escHtml()` connect `Bracket publico` to `pes5-tool.js`, `Bracket`, `mejoras-page.js`, `Palmares (Sala de Trofeos 3D)`, `Calendario`, `Sorteo en vivo`, `Sonido`, `Historial y H2H`, `Perfil del presidente`, `Equipos`, `Push y Ajustes y arranque`, `pes5-yunacoins.js`, `Tablas de posiciones`?**
  _High betweenness centrality (0.232) - this node is a cross-community bridge._
- **Why does `dbGetAll()` connect `Bracket` to `pes5-tool.js`, `mejoras-page.js`, `Palmares (Sala de Trofeos 3D)`, `Calendario`, `Sorteo en vivo`, `Sonido`, `Historial y H2H`, `Equipos`, `Push y Ajustes y arranque`, `Capa de datos`, `Bracket publico`, `pes5-yunacoins.js`, `Tablas de posiciones`?**
  _High betweenness centrality (0.215) - this node is a cross-community bridge._
- **Why does `showToast()` connect `Bracket` to `pes5-tool.js`, `Palmares (Sala de Trofeos 3D)`, `Calendario`, `Sorteo en vivo`, `Sonido`, `Historial y H2H`, `Perfil del presidente`, `Equipos`, `Push y Ajustes y arranque`, `Capa de datos`, `Bracket publico`, `pes5-yunacoins.js`, `Tablas de posiciones`, `Generador de fechas`?**
  _High betweenness centrality (0.167) - this node is a cross-community bridge._
- **Are the 135 inferred relationships involving `dbGetAll()` (e.g. with `renderBracket()` and `getStandingsForPhase()`) actually correct?**
  _`dbGetAll()` has 135 INFERRED edges - model-reasoned connections that need verification._
- **Are the 103 inferred relationships involving `showToast()` (e.g. with `authForgotPassword()` and `authSignOut()`) actually correct?**
  _`showToast()` has 103 INFERRED edges - model-reasoned connections that need verification._
- **Are the 97 inferred relationships involving `escHtml()` (e.g. with `authForgotPassword()` and `teamLogoHtml()`) actually correct?**
  _`escHtml()` has 97 INFERRED edges - model-reasoned connections that need verification._
- **Are the 73 inferred relationships involving `dbGet()` (e.g. with `renderBracket()` and `getStandingsForPhase()`) actually correct?**
  _`dbGet()` has 73 INFERRED edges - model-reasoned connections that need verification._