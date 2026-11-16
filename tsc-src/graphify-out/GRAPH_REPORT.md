# Graph Report - .  (2026-11-15)

## Corpus Check
- solo AST

## Summary
- 1424 nodes · 3782 edges · 29 communities detected
- Extraction: 75% EXTRACTED · 25% INFERRED · 0% AMBIGUOUS · INFERRED: 939 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Promo APK|Promo APK]]
- [[_COMMUNITY_Perfil del presidente|Perfil del presidente]]
- [[_COMMUNITY_Splash de arranque|Splash de arranque]]
- [[_COMMUNITY_Bracket|Bracket]]
- [[_COMMUNITY_Bracket publico|Bracket publico]]
- [[_COMMUNITY_Sonido|Sonido]]
- [[_COMMUNITY_Sorteo en vivo|Sorteo en vivo]]
- [[_COMMUNITY_Bracket y Usuarios (admin)|Bracket y Usuarios (admin)]]
- [[_COMMUNITY_Tablas de posiciones|Tablas de posiciones]]
- [[_COMMUNITY_Calendario|Calendario]]
- [[_COMMUNITY_Config Cloudinary (ejemplo)|Config Cloudinary (ejemplo)]]
- [[_COMMUNITY_Equipos|Equipos]]
- [[_COMMUNITY_pes5-yunacoins.js y yunacoins-rules.js|pes5-yunacoins.js y yunacoins-rules.js]]
- [[_COMMUNITY_Push y Ajustes y arranque|Push y Ajustes y arranque]]
- [[_COMMUNITY_Capa de datos|Capa de datos]]
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
1. `dbGetAll()` - 132 edges
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
- `_calInitHeroCountdown()` --calls--> `countdown()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\fix-lecturas-historial\tsc-src\js\calendar.js → D:\Desktop\tsc.web\.claude\worktrees\fix-lecturas-historial\tsc-src\js\motion.js
- `openBulkCoinsModal()` --calls--> `dbGetAll()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\fix-lecturas-historial\tsc-src\js\coins.js → D:\Desktop\tsc.web\.claude\worktrees\fix-lecturas-historial\tsc-src\js\db.js
- `dbGetAll()` --calls--> `_palmDuplicate()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\fix-lecturas-historial\tsc-src\js\db.js → D:\Desktop\tsc.web\.claude\worktrees\fix-lecturas-historial\tsc-src\js\palmares.js
- `getForSeason()` --calls--> `resolveTeamData()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\fix-lecturas-historial\tsc-src\js\db.js → D:\Desktop\tsc.web\.claude\worktrees\fix-lecturas-historial\tsc-src\js\standings.js
- `loadDraft()` --calls--> `aplicarCambiosAlJugador()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\fix-lecturas-historial\tsc-src\js\mejoras-page.js → D:\Desktop\tsc.web\.claude\worktrees\fix-lecturas-historial\tsc-src\js\pes5-plantilla.js

## Communities

### Community 18 - "Promo APK"
Cohesion: 0.36
Nodes (9): _apkIsNativeApp(), _apkShouldOffer(), _apkAlreadyDownloaded(), _apkClosedRecently(), openApkPromo(), _apkHideOverlay(), closeApkPromo(), tscApkDownloadClick() (+1 more)

### Community 7 - "Perfil del presidente"
Cohesion: 0.05
Nodes (63): _usersCol(), _injectAuthModal(), openAuthModal(), toggleAuthMode(), _renderAuthModalMode(), authForgotPassword(), authSubmit(), _authErrorMsg() (+55 more)

### Community 20 - "Splash de arranque"
Cohesion: 0.4
Nodes (0): 

### Community 0 - "Bracket"
Cohesion: 0.03
Nodes (188): getWinner(), spawnRocket(), loop(), _cleanup(), _onClick(), renderBracket(), buildBracketRounds(), getStandingsForPhase() (+180 more)

### Community 13 - "Bracket publico"
Cohesion: 0.07
Nodes (47): teamLogoHtml(), _coinsRun(), _coinsAmount(), renderAdmCoins(), renderCoinsTable(), filterCoinsTable(), openCoinsModal(), updateCoinsPreview() (+39 more)

### Community 11 - "Sonido"
Cohesion: 0.07
Nodes (42): _getAudioCtx(), resume(), _fwSoundOff(), _soundRocketLaunch(), _soundExplosion(), liveRadarStart(), _palmAudio(), _palmSoundOff() (+34 more)

### Community 5 - "Sorteo en vivo"
Cohesion: 0.06
Nodes (74): hexToRgb(), lighten(), newBomboId(), newBombo(), emptyState(), _journalCapturePhase(), effectiveDrawnIds(), ensureBC() (+66 more)

### Community 15 - "Bracket y Usuarios (admin)"
Cohesion: 0.15
Nodes (11): rgbStr(), Particle, Rocket, renderAdmUsuarios(), _uaBackfillUsernames(), adminSetUserLock(), adminSetUserRole(), adminSetUserTeam() (+3 more)

### Community 14 - "Tablas de posiciones"
Cohesion: 0.12
Nodes (21): refBadgeHTML(), saveCriteria(), openCriteriaModal(), closeCriteriaModal(), criteriaDragEnd(), criteriaDrop(), criteriaDropOnContainer(), criteriaDisable() (+13 more)

### Community 4 - "Calendario"
Cohesion: 0.04
Nodes (104): _calFormatDay(), _calTodayStr(), _calViewerTodayStr(), _calMatchInstant(), _calMatchTimeLocal(), _calLocalDateStr(), _calJornadaViewerDate(), _calLogo() (+96 more)

### Community 21 - "Config Cloudinary (ejemplo)"
Cohesion: 1.0
Nodes (2): cloudReady(), uploadImageToCloud()

### Community 8 - "Equipos"
Cohesion: 0.06
Nodes (47): cloudReady(), uploadImageToCloud(), resize(), frame(), wake(), stop(), setVariant(), init() (+39 more)

### Community 9 - "pes5-yunacoins.js y yunacoins-rules.js"
Cohesion: 0.07
Nodes (53): openColorPicker(), _compPickColor(), _resumenLineas(), cobrarMejorasEquipo(), R(), esc(), ahora(), haceTexto() (+45 more)

### Community 10 - "Push y Ajustes y arranque"
Cohesion: 0.06
Nodes (49): getVariant(), _plugin(), isEnabled(), _clearToken(), _setPendingTokenRemoval(), _clearPendingTokenRemoval(), _pushDocRef(), _currentTimezone() (+41 more)

### Community 12 - "Capa de datos"
Cohesion: 0.07
Nodes (51): exportFullDB(), downloadJSON(), _dataBackupStores(), _dataTypeOk(), _dataValidateRecord(), _dataValidateStoreItems(), _dataValidateBackup(), _dataWarnings() (+43 more)

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
Cohesion: 0.19
Nodes (10): _fxScheduledCount(), _fxShuffle(), fxBuildRoundRobin(), fxBuildLuisRoute(), _fxBuildLuisRouteForLegs(), _fxGenerateCalendarAndRoute(), fxShuffleAgain(), renderFixtureGenModal() (+2 more)

### Community 6 - "Historial y H2H"
Cohesion: 0.06
Nodes (70): _histNorm(), _histResolveExactTeam(), _histResolveTeam(), computeResultado(), loadStaticHistory(), seedHistoryIfEmpty(), appendOrUpdateHistory(), historyRecordFor() (+62 more)

### Community 1 - "mejoras-page.js"
Cohesion: 0.03
Nodes (139): jsq(), openModal(), closeModal(), _syncScrollLock(), showToast(), renderAuthUI(), puedeMandarPedido(), applyTheme() (+131 more)

### Community 3 - "pes5-tool.js"
Cohesion: 0.04
Nodes (115): cargarReglasFirestore(), cargarTopeExtraEquipo(), jugadorDesdePlantillaReal(), desmontar(), jugadorParaEditor(), plantillaParaEditor(), registroDeId(), cambiosDesdeEditor() (+107 more)

### Community 2 - "Palmares (Sala de Trofeos 3D)"
Cohesion: 0.03
Nodes (119): getTrophyStyles(), _uid(), trophyClassica(), trophyImperial(), trophyKonami(), trophyOrejona(), trophySobria(), trophyModerno() (+111 more)

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

- **Why does `showToast()` connect `Bracket` to `Palmares (Sala de Trofeos 3D)`, `pes5-tool.js`, `Calendario`, `Sorteo en vivo`, `Historial y H2H`, `Perfil del presidente`, `Equipos`, `Push y Ajustes y arranque`, `Sonido`, `Capa de datos`, `Bracket publico`, `Tablas de posiciones`, `Bracket y Usuarios (admin)`, `Generador de fechas`?**
  _High betweenness centrality (0.204) - this node is a cross-community bridge._
- **Why does `dbGetAll()` connect `Bracket` to `mejoras-page.js`, `Palmares (Sala de Trofeos 3D)`, `pes5-tool.js`, `Calendario`, `Sorteo en vivo`, `Historial y H2H`, `Perfil del presidente`, `Equipos`, `pes5-yunacoins.js y yunacoins-rules.js`, `Push y Ajustes y arranque`, `Capa de datos`, `Bracket publico`, `Bracket y Usuarios (admin)`?**
  _High betweenness centrality (0.196) - this node is a cross-community bridge._
- **Why does `escHtml()` connect `Bracket publico` to `Bracket`, `mejoras-page.js`, `Palmares (Sala de Trofeos 3D)`, `pes5-tool.js`, `Calendario`, `Sorteo en vivo`, `Historial y H2H`, `Perfil del presidente`, `Equipos`, `pes5-yunacoins.js y yunacoins-rules.js`, `Push y Ajustes y arranque`, `Tablas de posiciones`, `Bracket y Usuarios (admin)`?**
  _High betweenness centrality (0.186) - this node is a cross-community bridge._
- **Are the 129 inferred relationships involving `dbGetAll()` (e.g. with `renderBracket()` and `getStandingsForPhase()`) actually correct?**
  _`dbGetAll()` has 129 INFERRED edges - model-reasoned connections that need verification._
- **Are the 95 inferred relationships involving `showToast()` (e.g. with `authForgotPassword()` and `authSignOut()`) actually correct?**
  _`showToast()` has 95 INFERRED edges - model-reasoned connections that need verification._
- **Are the 90 inferred relationships involving `escHtml()` (e.g. with `authForgotPassword()` and `teamLogoHtml()`) actually correct?**
  _`escHtml()` has 90 INFERRED edges - model-reasoned connections that need verification._
- **Are the 73 inferred relationships involving `dbGet()` (e.g. with `renderBracket()` and `getStandingsForPhase()`) actually correct?**
  _`dbGet()` has 73 INFERRED edges - model-reasoned connections that need verification._