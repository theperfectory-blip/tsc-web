# Graph Report - .  (2026-11-05)

## Corpus Check
- solo AST

## Summary
- 1365 nodes · 3738 edges · 38 communities detected
- Extraction: 71% EXTRACTED · 29% INFERRED · 0% AMBIGUOUS · INFERRED: 1083 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Promo APK|Promo APK]]
- [[_COMMUNITY_Perfil del presidente|Perfil del presidente]]
- [[_COMMUNITY_Competiciones|Competiciones]]
- [[_COMMUNITY_Splash de arranque|Splash de arranque]]
- [[_COMMUNITY_Bracket|Bracket]]
- [[_COMMUNITY_Palmares (Sala de Trofeos 3D)|Palmares (Sala de Trofeos 3D)]]
- [[_COMMUNITY_Sonido|Sonido]]
- [[_COMMUNITY_Sorteo en vivo|Sorteo en vivo]]
- [[_COMMUNITY_Tablas de posiciones|Tablas de posiciones]]
- [[_COMMUNITY_Calendario|Calendario]]
- [[_COMMUNITY_Navegacion|Navegacion]]
- [[_COMMUNITY_Historial y H2H|Historial y H2H]]
- [[_COMMUNITY_Config Cloudinary (ejemplo)|Config Cloudinary (ejemplo)]]
- [[_COMMUNITY_pes5-tool.js|pes5-tool.js]]
- [[_COMMUNITY_Equipos|Equipos]]
- [[_COMMUNITY_Push y Ajustes y arranque|Push y Ajustes y arranque]]
- [[_COMMUNITY_Delegacion de eventos|Delegacion de eventos]]
- [[_COMMUNITY_Config Firebase (ejemplo)|Config Firebase (ejemplo)]]
- [[_COMMUNITY_Config Firebase|Config Firebase]]
- [[_COMMUNITY_Generador de fechas|Generador de fechas]]
- [[_COMMUNITY_Partidos|Partidos]]
- [[_COMMUNITY_mejoras-page.js|mejoras-page.js]]
- [[_COMMUNITY_test-posiciones-banda.js y memcard-fs.js|test-posiciones-banda.js y memcard-fs.js]]
- [[_COMMUNITY_pes5-bloqueo.js|pes5-bloqueo.js]]
- [[_COMMUNITY_pes5-crypt.js|pes5-crypt.js]]
- [[_COMMUNITY_pes5-editor.js|pes5-editor.js]]
- [[_COMMUNITY_pes5-save.js|pes5-save.js]]
- [[_COMMUNITY_Estado global|Estado global]]
- [[_COMMUNITY_OptionFile.java|OptionFile.java]]
- [[_COMMUNITY_snapshot.js|snapshot.js]]
- [[_COMMUNITY_test-slice-p-plantilla.js|test-slice-p-plantilla.js]]
- [[_COMMUNITY_test-yunacoins-rules.js|test-yunacoins-rules.js]]
- [[_COMMUNITY_write-team-test.js|write-team-test.js]]
- [[_COMMUNITY_write-test-full.js|write-test-full.js]]
- [[_COMMUNITY_xor-diff.js|xor-diff.js]]
- [[_COMMUNITY_write-attrs.js|write-attrs.js]]
- [[_COMMUNITY_extract-save.js|extract-save.js]]
- [[_COMMUNITY_list-saves.js|list-saves.js]]

## God Nodes (most connected - your core abstractions)
1. `dbGetAll()` - 143 edges
2. `showToast()` - 97 edges
3. `dbGet()` - 94 edges
4. `showToast()` - 92 edges
5. `escHtml()` - 69 edges
6. `dbPut()` - 59 edges
7. `dbErrorMsg()` - 34 edges
8. `dbAdd()` - 32 edges
9. `showConfirm()` - 29 edges
10. `renderAdminPage()` - 23 edges

## Surprising Connections (you probably didn't know these)
- `deleteBracketMatch()` --calls--> `showConfirm()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\bracket.js → D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\ui-utils.js
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
Nodes (66): _usersCol(), _injectAuthModal(), openAuthModal(), toggleAuthMode(), _renderAuthModalMode(), authForgotPassword(), authSubmit(), _authErrorMsg() (+58 more)

### Community 2 - "Competiciones"
Cohesion: 0.05
Nodes (109): authSignOut(), _calSeasonLocked(), _calLiveMsg(), _coinsRun(), _coinsSeasonLocked(), _coinsAmount(), renderAdmCoins(), renderCoinsTable() (+101 more)

### Community 24 - "Splash de arranque"
Cohesion: 0.4
Nodes (0): 

### Community 1 - "Bracket"
Cohesion: 0.04
Nodes (149): getWinner(), spawnRocket(), loop(), _cleanup(), _onClick(), renderBracket(), buildBracketRounds(), getStandingsForPhase() (+141 more)

### Community 0 - "Palmares (Sala de Trofeos 3D)"
Cohesion: 0.03
Nodes (156): teamLogoHtml(), openCompModal(), _htCrest(), _histStdRowHTML(), openEditResultModal(), loadPalmaresComps(), palmaresCompByKey(), getTrophyStyles() (+148 more)

### Community 9 - "Sonido"
Cohesion: 0.06
Nodes (43): _getAudioCtx(), resume(), _fwSoundOff(), _soundRocketLaunch(), _soundExplosion(), rgbStr(), Particle, Rocket (+35 more)

### Community 5 - "Sorteo en vivo"
Cohesion: 0.06
Nodes (74): hexToRgb(), lighten(), _mxDeleteOps(), renderAdmSorteo(), newBomboId(), newBombo(), emptyState(), _journalCapturePhase() (+66 more)

### Community 13 - "Tablas de posiciones"
Cohesion: 0.13
Nodes (19): refBadgeHTML(), openCriteriaModal(), closeCriteriaModal(), criteriaDragEnd(), criteriaDrop(), criteriaDropOnContainer(), criteriaDisable(), criteriaRestore() (+11 more)

### Community 12 - "Calendario"
Cohesion: 0.12
Nodes (32): _calFormatDay(), _calTodayStr(), _calViewerTodayStr(), _calMatchInstant(), _calMatchTimeLocal(), _calLocalDateStr(), _calJornadaViewerDate(), _calLogo() (+24 more)

### Community 7 - "Navegacion"
Cohesion: 0.06
Nodes (71): _calCenterAnchorScroll(), _calHeroGoComp(), _pubSwitchHistoryView(), liveStop(), liveSubscribe(), liveRadarStop(), _subscribeAdminMatchesLive(), getPublicScrollPages() (+63 more)

### Community 8 - "Historial y H2H"
Cohesion: 0.06
Nodes (67): _calHeroGoH2H(), _histNorm(), _histResolveExactTeam(), _histResolveTeam(), computeResultado(), loadStaticHistory(), seedHistoryIfEmpty(), _applyFilters() (+59 more)

### Community 26 - "Config Cloudinary (ejemplo)"
Cohesion: 1.0
Nodes (2): cloudReady(), uploadImageToCloud()

### Community 3 - "pes5-tool.js"
Cohesion: 0.04
Nodes (93): openColorPicker(), _compPickColor(), jugadorParaEditor(), plantillaParaEditor(), registroDeId(), cambiosDesdeEditor(), aplicarCambiosAlJugador(), bandCost99() (+85 more)

### Community 11 - "Equipos"
Cohesion: 0.07
Nodes (38): resize(), frame(), wake(), stop(), setVariant(), init(), reduced(), _settle() (+30 more)

### Community 10 - "Push y Ajustes y arranque"
Cohesion: 0.07
Nodes (48): getVariant(), _plugin(), isEnabled(), _clearToken(), _setPendingTokenRemoval(), _clearPendingTokenRemoval(), _pushDocRef(), _currentTimezone() (+40 more)

### Community 14 - "Delegacion de eventos"
Cohesion: 0.14
Nodes (10): _onTokens(), _onParse(), _onIsNative(), _onEventFor(), _onResolve(), _onRun(), bitsOf(), writeBits() (+2 more)

### Community 29 - "Config Firebase (ejemplo)"
Cohesion: 1.0
Nodes (0): 

### Community 30 - "Config Firebase"
Cohesion: 1.0
Nodes (0): 

### Community 18 - "Generador de fechas"
Cohesion: 0.2
Nodes (9): _fxScheduledCount(), _fxShuffle(), fxBuildRoundRobin(), fxBuildLuisRoute(), _fxBuildLuisRouteForLegs(), _fxGenerateCalendarAndRoute(), fxShuffleAgain(), renderFixtureGenModal() (+1 more)

### Community 16 - "Partidos"
Cohesion: 0.17
Nodes (11): onMatchGroupChange(), renderMatchesList(), navegarRonda(), _fmtJornadaDateCore(), formatJornadaDateRange(), openAssignDateToJornada(), _resolveLibreId(), renderRondaModalContent() (+3 more)

### Community 4 - "mejoras-page.js"
Cohesion: 0.06
Nodes (80): _esc(), jsq(), openModal(), closeModal(), _syncScrollLock(), showToast(), renderAuthUI(), puedeMandarPedido() (+72 more)

### Community 19 - "test-posiciones-banda.js y memcard-fs.js"
Cohesion: 0.23
Nodes (13): closeIfBackdrop(), _bootStep(), cargarEditor(), assert(), lanza(), bit(), campo(), main() (+5 more)

### Community 31 - "pes5-bloqueo.js"
Cohesion: 1.0
Nodes (0): 

### Community 32 - "pes5-crypt.js"
Cohesion: 1.0
Nodes (0): 

### Community 33 - "pes5-editor.js"
Cohesion: 1.0
Nodes (0): 

### Community 34 - "pes5-save.js"
Cohesion: 1.0
Nodes (0): 

### Community 35 - "Estado global"
Cohesion: 1.0
Nodes (0): 

### Community 15 - "OptionFile.java"
Cohesion: 0.26
Nodes (1): OptionFile

### Community 36 - "snapshot.js"
Cohesion: 1.0
Nodes (0): 

### Community 27 - "test-slice-p-plantilla.js"
Cohesion: 0.67
Nodes (0): 

### Community 28 - "test-yunacoins-rules.js"
Cohesion: 1.0
Nodes (0): 

### Community 21 - "write-team-test.js"
Cohesion: 0.38
Nodes (9): teamName(), findTeamIndex(), playerName(), findPlayerId(), rosterOffset(), readRoster(), writeRoster(), removeFromTeam() (+1 more)

### Community 25 - "write-test-full.js"
Cohesion: 0.6
Nodes (3): bitsOf(), writeBits(), setField()

### Community 37 - "xor-diff.js"
Cohesion: 1.0
Nodes (0): 

### Community 17 - "write-attrs.js"
Cohesion: 0.18
Nodes (8): openCard(), rcp(), rc(), fatNext(), chain(), ents(), par(), eccBlock()

### Community 22 - "extract-save.js"
Cohesion: 0.52
Nodes (6): readClusterPhys(), readCluster(), fatNext(), chain(), readEntries(), readFile()

### Community 23 - "list-saves.js"
Cohesion: 0.6
Nodes (5): readClusterPhys(), readCluster(), fatNext(), chain(), readEntries()

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
- **Thin community `snapshot.js`** (1 nodes): `snapshot.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `test-yunacoins-rules.js`** (2 nodes): `test-yunacoins-rules.js`, `assert()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `xor-diff.js`** (1 nodes): `xor-diff.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dbGetAll()` connect `Bracket` to `Palmares (Sala de Trofeos 3D)`, `Competiciones`, `pes5-tool.js`, `mejoras-page.js`, `Sorteo en vivo`, `Perfil del presidente`, `Navegacion`, `Historial y H2H`, `Equipos`, `Calendario`, `Partidos`?**
  _High betweenness centrality (0.271) - this node is a cross-community bridge._
- **Why does `showToast()` connect `Competiciones` to `Palmares (Sala de Trofeos 3D)`, `Bracket`, `pes5-tool.js`, `Sorteo en vivo`, `Perfil del presidente`, `Navegacion`, `Historial y H2H`, `Calendario`, `Tablas de posiciones`?**
  _High betweenness centrality (0.115) - this node is a cross-community bridge._
- **Why does `dbGet()` connect `Bracket` to `Palmares (Sala de Trofeos 3D)`, `Competiciones`, `mejoras-page.js`, `Sorteo en vivo`, `Perfil del presidente`, `Navegacion`, `Calendario`, `Tablas de posiciones`, `Partidos`?**
  _High betweenness centrality (0.086) - this node is a cross-community bridge._
- **Are the 140 inferred relationships involving `dbGetAll()` (e.g. with `renderBracket()` and `getStandingsForPhase()`) actually correct?**
  _`dbGetAll()` has 140 INFERRED edges - model-reasoned connections that need verification._
- **Are the 93 inferred relationships involving `showToast()` (e.g. with `authForgotPassword()` and `authSignOut()`) actually correct?**
  _`showToast()` has 93 INFERRED edges - model-reasoned connections that need verification._
- **Are the 91 inferred relationships involving `dbGet()` (e.g. with `renderBracket()` and `getStandingsForPhase()`) actually correct?**
  _`dbGet()` has 91 INFERRED edges - model-reasoned connections that need verification._
- **Are the 78 inferred relationships involving `showToast()` (e.g. with `authForgotPassword()` and `authSignOut()`) actually correct?**
  _`showToast()` has 78 INFERRED edges - model-reasoned connections that need verification._