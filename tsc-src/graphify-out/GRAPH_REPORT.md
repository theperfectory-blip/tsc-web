# Graph Report - .  (2026-11-07)

## Corpus Check
- solo AST

## Summary
- 1410 nodes · 3771 edges · 39 communities detected
- Extraction: 73% EXTRACTED · 27% INFERRED · 0% AMBIGUOUS · INFERRED: 1036 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Promo APK|Promo APK]]
- [[_COMMUNITY_Perfil del presidente|Perfil del presidente]]
- [[_COMMUNITY_Splash de arranque|Splash de arranque]]
- [[_COMMUNITY_Bracket|Bracket]]
- [[_COMMUNITY_Historial y H2H|Historial y H2H]]
- [[_COMMUNITY_Sonido|Sonido]]
- [[_COMMUNITY_Sorteo en vivo|Sorteo en vivo]]
- [[_COMMUNITY_Bracket|Bracket]]
- [[_COMMUNITY_Tablas de posiciones|Tablas de posiciones]]
- [[_COMMUNITY_Calendario|Calendario]]
- [[_COMMUNITY_Navegacion|Navegacion]]
- [[_COMMUNITY_Config Cloudinary (ejemplo)|Config Cloudinary (ejemplo)]]
- [[_COMMUNITY_Equipos|Equipos]]
- [[_COMMUNITY_Competiciones|Competiciones]]
- [[_COMMUNITY_Push y Ajustes y arranque|Push y Ajustes y arranque]]
- [[_COMMUNITY_Capa de datos|Capa de datos]]
- [[_COMMUNITY_Delegacion de eventos|Delegacion de eventos]]
- [[_COMMUNITY_Config Firebase (ejemplo)|Config Firebase (ejemplo)]]
- [[_COMMUNITY_Config Firebase|Config Firebase]]
- [[_COMMUNITY_Generador de fechas|Generador de fechas]]
- [[_COMMUNITY_mejoras-page.js|mejoras-page.js]]
- [[_COMMUNITY_test-posiciones-banda.js y memcard-fs.js|test-posiciones-banda.js y memcard-fs.js]]
- [[_COMMUNITY_pes5-tool.js|pes5-tool.js]]
- [[_COMMUNITY_Palmares (Sala de Trofeos 3D)|Palmares (Sala de Trofeos 3D)]]
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
2. `showToast()` - 111 edges
3. `dbGet()` - 94 edges
4. `escHtml()` - 88 edges
5. `dbPut()` - 59 edges
6. `dbErrorMsg()` - 34 edges
7. `dbAdd()` - 32 edges
8. `showConfirm()` - 29 edges
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

### Community 21 - "Promo APK"
Cohesion: 0.36
Nodes (9): _apkIsNativeApp(), _apkShouldOffer(), _apkAlreadyDownloaded(), _apkClosedRecently(), openApkPromo(), _apkHideOverlay(), closeApkPromo(), tscApkDownloadClick() (+1 more)

### Community 6 - "Perfil del presidente"
Cohesion: 0.05
Nodes (61): _usersCol(), _injectAuthModal(), openAuthModal(), toggleAuthMode(), _renderAuthModalMode(), authForgotPassword(), authSubmit(), _authErrorMsg() (+53 more)

### Community 25 - "Splash de arranque"
Cohesion: 0.4
Nodes (0): 

### Community 0 - "Bracket"
Cohesion: 0.03
Nodes (198): getWinner(), spawnRocket(), loop(), _cleanup(), _onClick(), renderBracket(), buildBracketRounds(), getStandingsForPhase() (+190 more)

### Community 3 - "Historial y H2H"
Cohesion: 0.04
Nodes (112): teamLogoHtml(), _calHeroGoH2H(), dbIsArchivedSeason(), _histNorm(), _histResolveExactTeam(), _histResolveTeam(), computeResultado(), loadStaticHistory() (+104 more)

### Community 9 - "Sonido"
Cohesion: 0.07
Nodes (42): _getAudioCtx(), resume(), _fwSoundOff(), _soundRocketLaunch(), _soundExplosion(), liveRadarStart(), _palmAudio(), _palmSoundOff() (+34 more)

### Community 5 - "Sorteo en vivo"
Cohesion: 0.06
Nodes (71): hexToRgb(), lighten(), newBomboId(), newBombo(), emptyState(), _journalCapturePhase(), effectiveDrawnIds(), ensureBC() (+63 more)

### Community 13 - "Bracket"
Cohesion: 0.1
Nodes (18): rgbStr(), Particle, Rocket, _coinsAmount(), renderAdmCoins(), renderCoinsTable(), filterCoinsTable(), openCoinsModal() (+10 more)

### Community 14 - "Tablas de posiciones"
Cohesion: 0.13
Nodes (22): refBadgeHTML(), openCriteriaModal(), closeCriteriaModal(), criteriaDragEnd(), criteriaDrop(), criteriaDropOnContainer(), criteriaDisable(), criteriaRestore() (+14 more)

### Community 12 - "Calendario"
Cohesion: 0.11
Nodes (32): _calFormatDay(), _calTodayStr(), _calViewerTodayStr(), _calMatchInstant(), _calMatchTimeLocal(), _calLocalDateStr(), _calJornadaViewerDate(), _calLogo() (+24 more)

### Community 7 - "Navegacion"
Cohesion: 0.08
Nodes (55): _calHeroGoComp(), liveStop(), liveSubscribe(), liveRadarStop(), liveRadarProximity(), getPublicScrollPages(), getMountedPublicPages(), _isPublicScrollPage() (+47 more)

### Community 27 - "Config Cloudinary (ejemplo)"
Cohesion: 1.0
Nodes (2): cloudReady(), uploadImageToCloud()

### Community 8 - "Equipos"
Cohesion: 0.06
Nodes (47): cloudReady(), uploadImageToCloud(), resize(), frame(), wake(), stop(), setVariant(), init() (+39 more)

### Community 16 - "Competiciones"
Cohesion: 0.16
Nodes (14): openColorPicker(), _sortComps(), renderAdmComps(), renderCompsGrid(), _compPickColor(), closeCompModal(), _deletePhaseCascade(), openCompReorderModal() (+6 more)

### Community 10 - "Push y Ajustes y arranque"
Cohesion: 0.07
Nodes (48): getVariant(), _plugin(), isEnabled(), _clearToken(), _setPendingTokenRemoval(), _clearPendingTokenRemoval(), _pushDocRef(), _currentTimezone() (+40 more)

### Community 11 - "Capa de datos"
Cohesion: 0.08
Nodes (43): renderAdmData(), renderDBInfo(), exportFullDB(), downloadJSON(), _dataBackupStores(), _dataTypeOk(), _dataValidateRecord(), _dataValidateStoreItems() (+35 more)

### Community 15 - "Delegacion de eventos"
Cohesion: 0.14
Nodes (10): _onTokens(), _onParse(), _onIsNative(), _onEventFor(), _onResolve(), _onRun(), bitsOf(), writeBits() (+2 more)

### Community 30 - "Config Firebase (ejemplo)"
Cohesion: 1.0
Nodes (0): 

### Community 31 - "Config Firebase"
Cohesion: 1.0
Nodes (0): 

### Community 19 - "Generador de fechas"
Cohesion: 0.2
Nodes (9): _fxScheduledCount(), _fxShuffle(), fxBuildRoundRobin(), fxBuildLuisRoute(), _fxBuildLuisRouteForLegs(), _fxGenerateCalendarAndRoute(), fxShuffleAgain(), renderFixtureGenModal() (+1 more)

### Community 2 - "mejoras-page.js"
Cohesion: 0.04
Nodes (115): jsq(), openModal(), closeModal(), _syncScrollLock(), showToast(), renderAuthUI(), puedeMandarPedido(), applyTheme() (+107 more)

### Community 20 - "test-posiciones-banda.js y memcard-fs.js"
Cohesion: 0.23
Nodes (13): closeIfBackdrop(), _bootStep(), cargarEditor(), assert(), lanza(), bit(), campo(), main() (+5 more)

### Community 4 - "pes5-tool.js"
Cohesion: 0.04
Nodes (96): cargarReglasFirestore(), desmontar(), jugadorParaEditor(), plantillaParaEditor(), registroDeId(), cambiosDesdeEditor(), aplicarCambiosAlJugador(), cargarReglasFirestore() (+88 more)

### Community 1 - "Palmares (Sala de Trofeos 3D)"
Cohesion: 0.03
Nodes (122): palmaresCompByKey(), getTrophyStyles(), _uid(), trophyClassica(), trophyImperial(), trophyKonami(), trophyOrejona(), trophySobria() (+114 more)

### Community 32 - "pes5-bloqueo.js"
Cohesion: 1.0
Nodes (0): 

### Community 33 - "pes5-crypt.js"
Cohesion: 1.0
Nodes (0): 

### Community 34 - "pes5-editor.js"
Cohesion: 1.0
Nodes (0): 

### Community 35 - "pes5-save.js"
Cohesion: 1.0
Nodes (0): 

### Community 36 - "Estado global"
Cohesion: 1.0
Nodes (0): 

### Community 17 - "OptionFile.java"
Cohesion: 0.24
Nodes (1): OptionFile

### Community 37 - "snapshot.js"
Cohesion: 1.0
Nodes (0): 

### Community 28 - "test-slice-p-plantilla.js"
Cohesion: 0.67
Nodes (0): 

### Community 29 - "test-yunacoins-rules.js"
Cohesion: 1.0
Nodes (0): 

### Community 22 - "write-team-test.js"
Cohesion: 0.38
Nodes (9): teamName(), findTeamIndex(), playerName(), findPlayerId(), rosterOffset(), readRoster(), writeRoster(), removeFromTeam() (+1 more)

### Community 26 - "write-test-full.js"
Cohesion: 0.6
Nodes (3): bitsOf(), writeBits(), setField()

### Community 38 - "xor-diff.js"
Cohesion: 1.0
Nodes (0): 

### Community 18 - "write-attrs.js"
Cohesion: 0.18
Nodes (8): openCard(), rcp(), rc(), fatNext(), chain(), ents(), par(), eccBlock()

### Community 23 - "extract-save.js"
Cohesion: 0.52
Nodes (6): readClusterPhys(), readCluster(), fatNext(), chain(), readEntries(), readFile()

### Community 24 - "list-saves.js"
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

- **Why does `escHtml()` connect `Historial y H2H` to `Bracket`, `Palmares (Sala de Trofeos 3D)`, `mejoras-page.js`, `pes5-tool.js`, `Sorteo en vivo`, `Perfil del presidente`, `Navegacion`, `Equipos`, `Push y Ajustes y arranque`, `Capa de datos`, `Calendario`, `Bracket`, `Tablas de posiciones`?**
  _High betweenness centrality (0.179) - this node is a cross-community bridge._
- **Why does `dbGetAll()` connect `Bracket` to `Palmares (Sala de Trofeos 3D)`, `mejoras-page.js`, `Historial y H2H`, `pes5-tool.js`, `Sorteo en vivo`, `Navegacion`, `Equipos`, `Capa de datos`, `Calendario`, `Bracket`, `Tablas de posiciones`, `Competiciones`?**
  _High betweenness centrality (0.172) - this node is a cross-community bridge._
- **Why does `showToast()` connect `Bracket` to `Palmares (Sala de Trofeos 3D)`, `Historial y H2H`, `pes5-tool.js`, `Sorteo en vivo`, `Perfil del presidente`, `Navegacion`, `Equipos`, `Sonido`, `Push y Ajustes y arranque`, `Capa de datos`, `Calendario`, `Bracket`, `Tablas de posiciones`, `Competiciones`?**
  _High betweenness centrality (0.142) - this node is a cross-community bridge._
- **Are the 140 inferred relationships involving `dbGetAll()` (e.g. with `renderBracket()` and `getStandingsForPhase()`) actually correct?**
  _`dbGetAll()` has 140 INFERRED edges - model-reasoned connections that need verification._
- **Are the 107 inferred relationships involving `showToast()` (e.g. with `authForgotPassword()` and `authSignOut()`) actually correct?**
  _`showToast()` has 107 INFERRED edges - model-reasoned connections that need verification._
- **Are the 91 inferred relationships involving `dbGet()` (e.g. with `renderBracket()` and `getStandingsForPhase()`) actually correct?**
  _`dbGet()` has 91 INFERRED edges - model-reasoned connections that need verification._
- **Are the 86 inferred relationships involving `escHtml()` (e.g. with `authForgotPassword()` and `teamLogoHtml()`) actually correct?**
  _`escHtml()` has 86 INFERRED edges - model-reasoned connections that need verification._