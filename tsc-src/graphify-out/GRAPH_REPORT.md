# Graph Report - .  (2026-11-07)

## Corpus Check
- solo AST

## Summary
- 1490 nodes · 3990 edges · 39 communities detected
- Extraction: 73% EXTRACTED · 27% INFERRED · 0% AMBIGUOUS · INFERRED: 1078 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Promo APK|Promo APK]]
- [[_COMMUNITY_Perfil del presidente|Perfil del presidente]]
- [[_COMMUNITY_Splash de arranque|Splash de arranque]]
- [[_COMMUNITY_Bracket|Bracket]]
- [[_COMMUNITY_Historial y H2H|Historial y H2H]]
- [[_COMMUNITY_Sonido|Sonido]]
- [[_COMMUNITY_Partido en vivo|Partido en vivo]]
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
- [[_COMMUNITY_Partidos y Generador de fechas|Partidos y Generador de fechas]]
- [[_COMMUNITY_Sorteo en vivo|Sorteo en vivo]]
- [[_COMMUNITY_mejoras-page.js|mejoras-page.js]]
- [[_COMMUNITY_pes5-tool.js|pes5-tool.js]]
- [[_COMMUNITY_Palmares (Sala de Trofeos 3D)|Palmares (Sala de Trofeos 3D)]]
- [[_COMMUNITY_pes5-bloqueo.js|pes5-bloqueo.js]]
- [[_COMMUNITY_pes5-clubes.js|pes5-clubes.js]]
- [[_COMMUNITY_pes5-crypt.js|pes5-crypt.js]]
- [[_COMMUNITY_pes5-editor.js|pes5-editor.js]]
- [[_COMMUNITY_pes5-save.js|pes5-save.js]]
- [[_COMMUNITY_Estado global|Estado global]]
- [[_COMMUNITY_OptionFile.java|OptionFile.java]]
- [[_COMMUNITY_snapshot.js|snapshot.js]]
- [[_COMMUNITY_test-posiciones-banda.js|test-posiciones-banda.js]]
- [[_COMMUNITY_test-slice-p-plantilla.js|test-slice-p-plantilla.js]]
- [[_COMMUNITY_test-yunacoins-rules.js|test-yunacoins-rules.js]]
- [[_COMMUNITY_write-test-full.js|write-test-full.js]]
- [[_COMMUNITY_xor-diff.js|xor-diff.js]]
- [[_COMMUNITY_write-attrs.js|write-attrs.js]]
- [[_COMMUNITY_extract-save.js|extract-save.js]]
- [[_COMMUNITY_list-saves.js|list-saves.js]]
- [[_COMMUNITY_memcard-fs.js|memcard-fs.js]]

## God Nodes (most connected - your core abstractions)
1. `dbGetAll()` - 149 edges
2. `showToast()` - 112 edges
3. `dbGet()` - 94 edges
4. `escHtml()` - 91 edges
5. `dbPut()` - 61 edges
6. `dbErrorMsg()` - 35 edges
7. `showConfirm()` - 33 edges
8. `dbAdd()` - 32 edges
9. `renderAdminPage()` - 23 edges
10. `invalidateStandingsAndSyncBrackets()` - 22 edges

## Surprising Connections (you probably didn't know these)
- `deleteBracketMatch()` --calls--> `showConfirm()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\bracket.js → D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\ui-utils.js
- `_calInitHeroCountdown()` --calls--> `countdown()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\calendar.js → D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\motion.js
- `dbGetAll()` --calls--> `_palmDuplicate()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\db.js → D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\palmares.js
- `getForSeason()` --calls--> `resolveTeamData()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\db.js → D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\standings.js
- `closeIfBackdrop()` --calls--> `fn()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\mejoras-page.js → D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\prototipo_yunas\tools\memcard-fs.js

## Communities

### Community 19 - "Promo APK"
Cohesion: 0.36
Nodes (9): _apkIsNativeApp(), _apkShouldOffer(), _apkAlreadyDownloaded(), _apkClosedRecently(), openApkPromo(), _apkHideOverlay(), closeApkPromo(), tscApkDownloadClick() (+1 more)

### Community 8 - "Perfil del presidente"
Cohesion: 0.04
Nodes (66): _usersCol(), _injectAuthModal(), openAuthModal(), toggleAuthMode(), _renderAuthModalMode(), authForgotPassword(), authSubmit(), _authErrorMsg() (+58 more)

### Community 24 - "Splash de arranque"
Cohesion: 0.4
Nodes (0): 

### Community 5 - "Bracket"
Cohesion: 0.05
Nodes (67): getWinner(), hexToRgb(), rgbStr(), lighten(), Particle, spawnRocket(), loop(), _cleanup() (+59 more)

### Community 4 - "Historial y H2H"
Cohesion: 0.04
Nodes (101): teamLogoHtml(), _calHeroGoH2H(), dbIsArchivedSeason(), _histNorm(), _histResolveExactTeam(), _histResolveTeam(), computeResultado(), loadStaticHistory() (+93 more)

### Community 9 - "Sonido"
Cohesion: 0.07
Nodes (43): _getAudioCtx(), resume(), _fwSoundOff(), _soundRocketLaunch(), _soundExplosion(), Rocket, liveRadarStart(), _palmAudio() (+35 more)

### Community 0 - "Partido en vivo"
Cohesion: 0.04
Nodes (173): invalidateStandingsAndSyncBrackets(), _calDoSaveDayLabel(), _coinsRun(), _coinsSeasonLocked(), _coinsAmount(), renderAdmCoins(), renderCoinsTable(), filterCoinsTable() (+165 more)

### Community 12 - "Calendario"
Cohesion: 0.08
Nodes (43): _calFormatDay(), _calTodayStr(), _calViewerTodayStr(), _calMatchInstant(), _calMatchTimeLocal(), _calLocalDateStr(), _calJornadaViewerDate(), _calLogo() (+35 more)

### Community 6 - "Navegacion"
Cohesion: 0.06
Nodes (75): _calCenterAnchorScroll(), _calHeroGoComp(), _pubSwitchHistoryView(), liveStop(), liveSubscribe(), liveRadarStop(), liveRadarProximity(), getPublicScrollPages() (+67 more)

### Community 27 - "Config Cloudinary (ejemplo)"
Cohesion: 1.0
Nodes (2): cloudReady(), uploadImageToCloud()

### Community 11 - "pes5-yunacoins.js y yunacoins-rules.js"
Cohesion: 0.09
Nodes (45): openColorPicker(), _compPickColor(), R(), esc(), ahora(), haceTexto(), emailActual(), leerSync() (+37 more)

### Community 13 - "Equipos"
Cohesion: 0.07
Nodes (38): resize(), frame(), wake(), stop(), setVariant(), init(), reduced(), _settle() (+30 more)

### Community 10 - "Push y Ajustes y arranque"
Cohesion: 0.06
Nodes (50): getVariant(), _plugin(), isEnabled(), _clearToken(), _setPendingTokenRemoval(), _clearPendingTokenRemoval(), _pushDocRef(), _currentTimezone() (+42 more)

### Community 14 - "Capa de datos"
Cohesion: 0.09
Nodes (37): exportFullDB(), downloadJSON(), _dataBackupStores(), _dataTypeOk(), _dataValidateRecord(), _dataValidateStoreItems(), _dataValidateBackup(), _dataWarnings() (+29 more)

### Community 16 - "Delegacion de eventos"
Cohesion: 0.14
Nodes (10): _onTokens(), _onParse(), _onIsNative(), _onEventFor(), _onResolve(), _onRun(), bitsOf(), writeBits() (+2 more)

### Community 30 - "Config Firebase (ejemplo)"
Cohesion: 1.0
Nodes (0): 

### Community 31 - "Config Firebase"
Cohesion: 1.0
Nodes (0): 

### Community 15 - "Partidos y Generador de fechas"
Cohesion: 0.09
Nodes (26): _fxScheduledCount(), _fxShuffle(), fxBuildRoundRobin(), fxBuildLuisRoute(), _fxBuildLuisRouteForLegs(), _fxGenerateCalendarAndRoute(), fxGroupLockReason(), openFixtureGenModal() (+18 more)

### Community 7 - "Sorteo en vivo"
Cohesion: 0.06
Nodes (71): _mxDeleteOps(), newBomboId(), newBombo(), emptyState(), _journalCapturePhase(), _journalCaptureMatches(), effectiveDrawnIds(), ensureBC() (+63 more)

### Community 1 - "mejoras-page.js"
Cohesion: 0.03
Nodes (137): closeIfBackdrop(), jsq(), openModal(), closeModal(), _syncScrollLock(), showToast(), renderAuthUI(), puedeMandarPedido() (+129 more)

### Community 3 - "pes5-tool.js"
Cohesion: 0.04
Nodes (101): cargarReglasFirestore(), jugadorDesdePlantillaReal(), desmontar(), jugadorParaEditor(), plantillaParaEditor(), registroDeId(), cambiosDesdeEditor(), aplicarCambiosAlJugador() (+93 more)

### Community 2 - "Palmares (Sala de Trofeos 3D)"
Cohesion: 0.03
Nodes (116): palmaresCompByKey(), getTrophyStyles(), _uid(), trophyClassica(), trophyImperial(), trophyKonami(), trophyOrejona(), trophySobria() (+108 more)

### Community 32 - "pes5-bloqueo.js"
Cohesion: 1.0
Nodes (0): 

### Community 20 - "pes5-clubes.js"
Cohesion: 0.62
Nodes (6): activos(), vinculado(), duenosDeClub(), otroEquipoConClub(), repetidoDe(), opcionesClub()

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

### Community 21 - "test-posiciones-banda.js"
Cohesion: 0.57
Nodes (6): cargarEditor(), assert(), lanza(), bit(), campo(), main()

### Community 28 - "test-slice-p-plantilla.js"
Cohesion: 0.67
Nodes (0): 

### Community 29 - "test-yunacoins-rules.js"
Cohesion: 1.0
Nodes (0): 

### Community 25 - "write-test-full.js"
Cohesion: 0.6
Nodes (3): bitsOf(), writeBits(), setField()

### Community 38 - "xor-diff.js"
Cohesion: 1.0
Nodes (0): 

### Community 18 - "write-attrs.js"
Cohesion: 0.18
Nodes (8): openCard(), rcp(), rc(), fatNext(), chain(), ents(), par(), eccBlock()

### Community 22 - "extract-save.js"
Cohesion: 0.52
Nodes (6): readClusterPhys(), readCluster(), fatNext(), chain(), readEntries(), readFile()

### Community 23 - "list-saves.js"
Cohesion: 0.6
Nodes (5): readClusterPhys(), readCluster(), fatNext(), chain(), readEntries()

### Community 26 - "memcard-fs.js"
Cohesion: 0.6
Nodes (4): rcp(), rc(), ch(), en()

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

- **Why does `dbGetAll()` connect `Partido en vivo` to `mejoras-page.js`, `Palmares (Sala de Trofeos 3D)`, `pes5-tool.js`, `Historial y H2H`, `Bracket`, `Navegacion`, `Sorteo en vivo`, `Perfil del presidente`, `Push y Ajustes y arranque`, `pes5-yunacoins.js y yunacoins-rules.js`, `Calendario`, `Equipos`, `Capa de datos`, `Partidos y Generador de fechas`?**
  _High betweenness centrality (0.184) - this node is a cross-community bridge._
- **Why does `escHtml()` connect `Historial y H2H` to `Partido en vivo`, `mejoras-page.js`, `Palmares (Sala de Trofeos 3D)`, `pes5-tool.js`, `Bracket`, `Navegacion`, `Sorteo en vivo`, `Perfil del presidente`, `Push y Ajustes y arranque`, `pes5-yunacoins.js y yunacoins-rules.js`, `Calendario`, `Equipos`, `Partidos y Generador de fechas`?**
  _High betweenness centrality (0.175) - this node is a cross-community bridge._
- **Why does `showToast()` connect `Partido en vivo` to `Palmares (Sala de Trofeos 3D)`, `pes5-tool.js`, `Historial y H2H`, `Bracket`, `Navegacion`, `Sorteo en vivo`, `Perfil del presidente`, `Sonido`, `Push y Ajustes y arranque`, `Calendario`, `Capa de datos`, `Partidos y Generador de fechas`?**
  _High betweenness centrality (0.162) - this node is a cross-community bridge._
- **Are the 146 inferred relationships involving `dbGetAll()` (e.g. with `renderBracket()` and `getStandingsForPhase()`) actually correct?**
  _`dbGetAll()` has 146 INFERRED edges - model-reasoned connections that need verification._
- **Are the 108 inferred relationships involving `showToast()` (e.g. with `authForgotPassword()` and `authSignOut()`) actually correct?**
  _`showToast()` has 108 INFERRED edges - model-reasoned connections that need verification._
- **Are the 91 inferred relationships involving `dbGet()` (e.g. with `renderBracket()` and `getStandingsForPhase()`) actually correct?**
  _`dbGet()` has 91 INFERRED edges - model-reasoned connections that need verification._
- **Are the 89 inferred relationships involving `escHtml()` (e.g. with `authForgotPassword()` and `teamLogoHtml()`) actually correct?**
  _`escHtml()` has 89 INFERRED edges - model-reasoned connections that need verification._