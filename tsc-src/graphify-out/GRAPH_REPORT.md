# Graph Report - .  (2026-11-07)

## Corpus Check
- solo AST

## Summary
- 1485 nodes · 3977 edges · 40 communities detected
- Extraction: 73% EXTRACTED · 27% INFERRED · 0% AMBIGUOUS · INFERRED: 1074 edges (avg confidence: 0.8)
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
- [[_COMMUNITY_Config Cloudinary (ejemplo)|Config Cloudinary (ejemplo)]]
- [[_COMMUNITY_Competiciones|Competiciones]]
- [[_COMMUNITY_Equipos|Equipos]]
- [[_COMMUNITY_Push y Ajustes y arranque|Push y Ajustes y arranque]]
- [[_COMMUNITY_Export  import|Export / import]]
- [[_COMMUNITY_Delegacion de eventos|Delegacion de eventos]]
- [[_COMMUNITY_Config Firebase (ejemplo)|Config Firebase (ejemplo)]]
- [[_COMMUNITY_Config Firebase|Config Firebase]]
- [[_COMMUNITY_Generador de fechas|Generador de fechas]]
- [[_COMMUNITY_mejoras-page.js|mejoras-page.js]]
- [[_COMMUNITY_test-posiciones-banda.js y memcard-fs.js|test-posiciones-banda.js y memcard-fs.js]]
- [[_COMMUNITY_pes5-tool.js|pes5-tool.js]]
- [[_COMMUNITY_pes5-yunacoins.js y yunacoins-rules.js|pes5-yunacoins.js y yunacoins-rules.js]]
- [[_COMMUNITY_Palmares (Sala de Trofeos 3D)|Palmares (Sala de Trofeos 3D)]]
- [[_COMMUNITY_pes5-bloqueo.js|pes5-bloqueo.js]]
- [[_COMMUNITY_pes5-clubes.js|pes5-clubes.js]]
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
1. `dbGetAll()` - 149 edges
2. `showToast()` - 112 edges
3. `dbGet()` - 94 edges
4. `escHtml()` - 91 edges
5. `dbPut()` - 61 edges
6. `dbErrorMsg()` - 35 edges
7. `dbAdd()` - 32 edges
8. `showConfirm()` - 32 edges
9. `renderAdminPage()` - 23 edges
10. `invalidateStandingsAndSyncBrackets()` - 22 edges

## Surprising Connections (you probably didn't know these)
- `_calInitHeroCountdown()` --calls--> `countdown()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\calendar.js → D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\motion.js
- `openBulkCoinsModal()` --calls--> `dbGetAll()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\coins.js → D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\db.js
- `_deletePhaseCascade()` --calls--> `dbDeleteMany()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\competitions.js → D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\db.js
- `dbGetAll()` --calls--> `_palmDuplicate()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\db.js → D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\palmares.js
- `getForSeason()` --calls--> `resolveTeamData()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\db.js → D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\standings.js

## Communities

### Community 20 - "Promo APK"
Cohesion: 0.36
Nodes (9): _apkIsNativeApp(), _apkShouldOffer(), _apkAlreadyDownloaded(), _apkClosedRecently(), openApkPromo(), _apkHideOverlay(), closeApkPromo(), tscApkDownloadClick() (+1 more)

### Community 7 - "Perfil del presidente"
Cohesion: 0.04
Nodes (66): _usersCol(), _injectAuthModal(), openAuthModal(), toggleAuthMode(), _renderAuthModalMode(), authForgotPassword(), authSubmit(), _authErrorMsg() (+58 more)

### Community 26 - "Splash de arranque"
Cohesion: 0.4
Nodes (0): 

### Community 0 - "Bracket"
Cohesion: 0.03
Nodes (244): getWinner(), spawnRocket(), loop(), _cleanup(), _onClick(), renderBracket(), buildBracketRounds(), getStandingsForPhase() (+236 more)

### Community 4 - "Historial y H2H"
Cohesion: 0.04
Nodes (101): teamLogoHtml(), _calLogo(), openCoinsModal(), openCompModal(), _histNorm(), _histResolveExactTeam(), _histResolveTeam(), computeResultado() (+93 more)

### Community 8 - "Sonido"
Cohesion: 0.07
Nodes (42): _getAudioCtx(), resume(), _fwSoundOff(), _soundRocketLaunch(), _soundExplosion(), liveRadarStart(), _palmAudio(), _palmSoundOff() (+34 more)

### Community 6 - "Sorteo en vivo"
Cohesion: 0.06
Nodes (77): hexToRgb(), lighten(), newBomboId(), newBombo(), emptyState(), _journalCapturePhase(), _journalCaptureMatches(), effectiveDrawnIds() (+69 more)

### Community 12 - "Bracket"
Cohesion: 0.09
Nodes (19): rgbStr(), Particle, Rocket, _coinsAmount(), renderAdmCoins(), renderCoinsTable(), filterCoinsTable(), updateCoinsPreview() (+11 more)

### Community 13 - "Tablas de posiciones"
Cohesion: 0.13
Nodes (21): refBadgeHTML(), openCriteriaModal(), closeCriteriaModal(), criteriaDragEnd(), criteriaDrop(), criteriaDropOnContainer(), criteriaDisable(), criteriaRestore() (+13 more)

### Community 3 - "Calendario"
Cohesion: 0.04
Nodes (103): _calFormatDay(), _calTodayStr(), _calViewerTodayStr(), _calMatchInstant(), _calMatchTimeLocal(), _calLocalDateStr(), _calJornadaViewerDate(), _calWhenError() (+95 more)

### Community 28 - "Config Cloudinary (ejemplo)"
Cohesion: 1.0
Nodes (2): cloudReady(), uploadImageToCloud()

### Community 17 - "Competiciones"
Cohesion: 0.17
Nodes (10): openColorPicker(), _compPickColor(), closeCompModal(), _deletePhaseCascade(), openCompReorderModal(), _renderCompReorderList(), compReorderDragEnd(), compReorderDrop() (+2 more)

### Community 10 - "Equipos"
Cohesion: 0.06
Nodes (40): resize(), frame(), wake(), stop(), setVariant(), init(), reduced(), _settle() (+32 more)

### Community 9 - "Push y Ajustes y arranque"
Cohesion: 0.07
Nodes (48): getVariant(), _plugin(), isEnabled(), _clearToken(), _setPendingTokenRemoval(), _clearPendingTokenRemoval(), _pushDocRef(), _currentTimezone() (+40 more)

### Community 22 - "Export / import"
Cohesion: 0.46
Nodes (7): _dataBackupStores(), _dataTypeOk(), _dataValidateRecord(), _dataValidateStoreItems(), _dataValidateBackup(), _dataWarnings(), importDB()

### Community 14 - "Delegacion de eventos"
Cohesion: 0.14
Nodes (10): _onTokens(), _onParse(), _onIsNative(), _onEventFor(), _onResolve(), _onRun(), bitsOf(), writeBits() (+2 more)

### Community 31 - "Config Firebase (ejemplo)"
Cohesion: 1.0
Nodes (0): 

### Community 32 - "Config Firebase"
Cohesion: 1.0
Nodes (0): 

### Community 18 - "Generador de fechas"
Cohesion: 0.2
Nodes (9): _fxScheduledCount(), _fxShuffle(), fxBuildRoundRobin(), fxBuildLuisRoute(), _fxBuildLuisRouteForLegs(), _fxGenerateCalendarAndRoute(), fxShuffleAgain(), renderFixtureGenModal() (+1 more)

### Community 1 - "mejoras-page.js"
Cohesion: 0.04
Nodes (133): jsq(), openModal(), closeModal(), _syncScrollLock(), showToast(), renderAuthUI(), puedeMandarPedido(), applyTheme() (+125 more)

### Community 19 - "test-posiciones-banda.js y memcard-fs.js"
Cohesion: 0.23
Nodes (13): closeIfBackdrop(), _bootStep(), cargarEditor(), assert(), lanza(), bit(), campo(), main() (+5 more)

### Community 5 - "pes5-tool.js"
Cohesion: 0.05
Nodes (95): cargarReglasFirestore(), desmontar(), jugadorParaEditor(), plantillaParaEditor(), registroDeId(), cambiosDesdeEditor(), aplicarCambiosAlJugador(), cargarReglasFirestore() (+87 more)

### Community 11 - "pes5-yunacoins.js y yunacoins-rules.js"
Cohesion: 0.09
Nodes (46): recalcularPresupuestoReal(), R(), esc(), ahora(), haceTexto(), emailActual(), leerSync(), guardarSync() (+38 more)

### Community 2 - "Palmares (Sala de Trofeos 3D)"
Cohesion: 0.03
Nodes (110): getTrophyStyles(), _uid(), trophyClassica(), trophyImperial(), trophyKonami(), trophyOrejona(), trophySobria(), trophyModerno() (+102 more)

### Community 33 - "pes5-bloqueo.js"
Cohesion: 1.0
Nodes (0): 

### Community 23 - "pes5-clubes.js"
Cohesion: 0.62
Nodes (6): activos(), vinculado(), duenosDeClub(), otroEquipoConClub(), repetidoDe(), opcionesClub()

### Community 34 - "pes5-crypt.js"
Cohesion: 1.0
Nodes (0): 

### Community 35 - "pes5-editor.js"
Cohesion: 1.0
Nodes (0): 

### Community 36 - "pes5-save.js"
Cohesion: 1.0
Nodes (0): 

### Community 37 - "Estado global"
Cohesion: 1.0
Nodes (0): 

### Community 15 - "OptionFile.java"
Cohesion: 0.24
Nodes (1): OptionFile

### Community 38 - "snapshot.js"
Cohesion: 1.0
Nodes (0): 

### Community 29 - "test-slice-p-plantilla.js"
Cohesion: 0.67
Nodes (0): 

### Community 30 - "test-yunacoins-rules.js"
Cohesion: 1.0
Nodes (0): 

### Community 21 - "write-team-test.js"
Cohesion: 0.38
Nodes (9): teamName(), findTeamIndex(), playerName(), findPlayerId(), rosterOffset(), readRoster(), writeRoster(), removeFromTeam() (+1 more)

### Community 27 - "write-test-full.js"
Cohesion: 0.6
Nodes (3): bitsOf(), writeBits(), setField()

### Community 39 - "xor-diff.js"
Cohesion: 1.0
Nodes (0): 

### Community 16 - "write-attrs.js"
Cohesion: 0.18
Nodes (8): openCard(), rcp(), rc(), fatNext(), chain(), ents(), par(), eccBlock()

### Community 24 - "extract-save.js"
Cohesion: 0.52
Nodes (6): readClusterPhys(), readCluster(), fatNext(), chain(), readEntries(), readFile()

### Community 25 - "list-saves.js"
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

- **Why does `dbGetAll()` connect `Bracket` to `mejoras-page.js`, `Palmares (Sala de Trofeos 3D)`, `Calendario`, `Historial y H2H`, `pes5-tool.js`, `Sorteo en vivo`, `Perfil del presidente`, `Equipos`, `pes5-yunacoins.js y yunacoins-rules.js`, `Bracket`?**
  _High betweenness centrality (0.217) - this node is a cross-community bridge._
- **Why does `escHtml()` connect `Historial y H2H` to `Bracket`, `mejoras-page.js`, `Palmares (Sala de Trofeos 3D)`, `Calendario`, `pes5-tool.js`, `Sorteo en vivo`, `Perfil del presidente`, `Push y Ajustes y arranque`, `Equipos`, `pes5-yunacoins.js y yunacoins-rules.js`, `Bracket`, `Tablas de posiciones`?**
  _High betweenness centrality (0.193) - this node is a cross-community bridge._
- **Why does `showToast()` connect `Bracket` to `Calendario`, `Historial y H2H`, `pes5-tool.js`, `Sorteo en vivo`, `Perfil del presidente`, `Sonido`, `Push y Ajustes y arranque`, `Bracket`, `Tablas de posiciones`, `Export / import`?**
  _High betweenness centrality (0.122) - this node is a cross-community bridge._
- **Are the 146 inferred relationships involving `dbGetAll()` (e.g. with `renderBracket()` and `getStandingsForPhase()`) actually correct?**
  _`dbGetAll()` has 146 INFERRED edges - model-reasoned connections that need verification._
- **Are the 108 inferred relationships involving `showToast()` (e.g. with `authForgotPassword()` and `authSignOut()`) actually correct?**
  _`showToast()` has 108 INFERRED edges - model-reasoned connections that need verification._
- **Are the 91 inferred relationships involving `dbGet()` (e.g. with `renderBracket()` and `getStandingsForPhase()`) actually correct?**
  _`dbGet()` has 91 INFERRED edges - model-reasoned connections that need verification._
- **Are the 89 inferred relationships involving `escHtml()` (e.g. with `authForgotPassword()` and `teamLogoHtml()`) actually correct?**
  _`escHtml()` has 89 INFERRED edges - model-reasoned connections that need verification._