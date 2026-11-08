# Graph Report - .  (2026-11-07)

## Corpus Check
- solo AST

## Summary
- 1471 nodes · 3940 edges · 38 communities detected
- Extraction: 73% EXTRACTED · 27% INFERRED · 0% AMBIGUOUS · INFERRED: 1068 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Promo APK|Promo APK]]
- [[_COMMUNITY_Perfil del presidente|Perfil del presidente]]
- [[_COMMUNITY_Splash de arranque|Splash de arranque]]
- [[_COMMUNITY_Bracket|Bracket]]
- [[_COMMUNITY_Historial y H2H|Historial y H2H]]
- [[_COMMUNITY_Sonido|Sonido]]
- [[_COMMUNITY_Usuarios (admin)|Usuarios (admin)]]
- [[_COMMUNITY_Partidos|Partidos]]
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
- [[_COMMUNITY_mejoras-page.js|mejoras-page.js]]
- [[_COMMUNITY_test-posiciones-banda.js y memcard-fs.js|test-posiciones-banda.js y memcard-fs.js]]
- [[_COMMUNITY_pes5-tool.js|pes5-tool.js]]
- [[_COMMUNITY_Palmares (Sala de Trofeos 3D)|Palmares (Sala de Trofeos 3D)]]
- [[_COMMUNITY_pes5-bloqueo.js|pes5-bloqueo.js]]
- [[_COMMUNITY_pes5-crypt.js|pes5-crypt.js]]
- [[_COMMUNITY_pes5-editor.js|pes5-editor.js]]
- [[_COMMUNITY_pes5-save.js|pes5-save.js]]
- [[_COMMUNITY_Sorteo en vivo|Sorteo en vivo]]
- [[_COMMUNITY_Estado global|Estado global]]
- [[_COMMUNITY_OptionFile.java|OptionFile.java]]
- [[_COMMUNITY_snapshot.js|snapshot.js]]
- [[_COMMUNITY_test-slice-p-plantilla.js|test-slice-p-plantilla.js]]
- [[_COMMUNITY_test-yunacoins-rules.js|test-yunacoins-rules.js]]
- [[_COMMUNITY_write-test-full.js|write-test-full.js]]
- [[_COMMUNITY_xor-diff.js|xor-diff.js]]
- [[_COMMUNITY_write-attrs.js|write-attrs.js]]
- [[_COMMUNITY_extract-save.js|extract-save.js]]
- [[_COMMUNITY_list-saves.js|list-saves.js]]

## God Nodes (most connected - your core abstractions)
1. `dbGetAll()` - 148 edges
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
- `deleteBracketMatch()` --calls--> `showConfirm()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\bracket.js → D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\ui-utils.js
- `_calCenterAnchorScroll()` --calls--> `_focusPublicSectionInner()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\calendar.js → D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\nav.js
- `dbGetAll()` --calls--> `_palmDuplicate()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\db.js → D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\palmares.js
- `getForSeason()` --calls--> `resolveTeamData()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\db.js → D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\standings.js
- `goAdminPage()` --calls--> `openFasesForComp()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\nav.js → D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\phases.js

## Communities

### Community 21 - "Promo APK"
Cohesion: 0.36
Nodes (9): _apkIsNativeApp(), _apkShouldOffer(), _apkAlreadyDownloaded(), _apkClosedRecently(), openApkPromo(), _apkHideOverlay(), closeApkPromo(), tscApkDownloadClick() (+1 more)

### Community 8 - "Perfil del presidente"
Cohesion: 0.05
Nodes (61): _usersCol(), _injectAuthModal(), openAuthModal(), toggleAuthMode(), _renderAuthModalMode(), authForgotPassword(), authSubmit(), _authErrorMsg() (+53 more)

### Community 24 - "Splash de arranque"
Cohesion: 0.4
Nodes (0): 

### Community 5 - "Bracket"
Cohesion: 0.05
Nodes (68): getWinner(), hexToRgb(), rgbStr(), lighten(), Particle, spawnRocket(), loop(), _cleanup() (+60 more)

### Community 3 - "Historial y H2H"
Cohesion: 0.04
Nodes (96): teamLogoHtml(), _calLogo(), _histNorm(), _histResolveExactTeam(), _histResolveTeam(), computeResultado(), loadStaticHistory(), cleanLegacyImportedFromIDB() (+88 more)

### Community 9 - "Sonido"
Cohesion: 0.07
Nodes (42): _getAudioCtx(), resume(), _fwSoundOff(), _soundRocketLaunch(), _soundExplosion(), liveRadarStart(), _palmAudio(), _palmSoundOff() (+34 more)

### Community 20 - "Usuarios (admin)"
Cohesion: 0.33
Nodes (8): Rocket, renderAdmUsuarios(), _uaBackfillUsernames(), adminSetUserLock(), adminSetUserRole(), adminSetUserTeam(), _uaApplyTeam(), updatePresidentLink()

### Community 0 - "Partidos"
Cohesion: 0.03
Nodes (187): invalidateStandingsAndSyncBrackets(), _calDoSaveDayLabel(), cloudReady(), uploadImageToCloud(), _coinsRun(), _coinsSeasonLocked(), _coinsAmount(), renderAdmCoins() (+179 more)

### Community 11 - "Calendario"
Cohesion: 0.07
Nodes (46): _calFormatDay(), _calTodayStr(), _calViewerTodayStr(), _calMatchInstant(), _calMatchTimeLocal(), _calLocalDateStr(), _calJornadaViewerDate(), _calWhenError() (+38 more)

### Community 6 - "Navegacion"
Cohesion: 0.05
Nodes (76): renderAdmCalendar(), _calHeroGoComp(), _pubSwitchHistoryView(), liveStop(), liveSubscribe(), liveRadarStop(), _subscribeAdminMatchesLive(), getPublicScrollPages() (+68 more)

### Community 26 - "Config Cloudinary (ejemplo)"
Cohesion: 1.0
Nodes (2): cloudReady(), uploadImageToCloud()

### Community 13 - "pes5-yunacoins.js y yunacoins-rules.js"
Cohesion: 0.09
Nodes (41): openColorPicker(), _compPickColor(), costoJugador(), R(), esc(), ahora(), haceTexto(), emailActual() (+33 more)

### Community 12 - "Equipos"
Cohesion: 0.07
Nodes (36): resize(), frame(), wake(), stop(), setVariant(), init(), reduced(), _settle() (+28 more)

### Community 10 - "Push y Ajustes y arranque"
Cohesion: 0.06
Nodes (49): getVariant(), _plugin(), isEnabled(), _clearToken(), _setPendingTokenRemoval(), _clearPendingTokenRemoval(), _pushDocRef(), _currentTimezone() (+41 more)

### Community 14 - "Capa de datos"
Cohesion: 0.09
Nodes (37): exportFullDB(), downloadJSON(), _dataBackupStores(), _dataTypeOk(), _dataValidateRecord(), _dataValidateStoreItems(), _dataValidateBackup(), _dataWarnings() (+29 more)

### Community 15 - "Delegacion de eventos"
Cohesion: 0.14
Nodes (10): _onTokens(), _onParse(), _onIsNative(), _onEventFor(), _onResolve(), _onRun(), bitsOf(), writeBits() (+2 more)

### Community 29 - "Config Firebase (ejemplo)"
Cohesion: 1.0
Nodes (0): 

### Community 30 - "Config Firebase"
Cohesion: 1.0
Nodes (0): 

### Community 19 - "Generador de fechas"
Cohesion: 0.2
Nodes (9): _fxScheduledCount(), _fxShuffle(), fxBuildRoundRobin(), fxBuildLuisRoute(), _fxBuildLuisRouteForLegs(), _fxGenerateCalendarAndRoute(), fxShuffleAgain(), renderFixtureGenModal() (+1 more)

### Community 1 - "mejoras-page.js"
Cohesion: 0.03
Nodes (136): jsq(), openModal(), closeModal(), _syncScrollLock(), showToast(), renderAuthUI(), puedeMandarPedido(), applyTheme() (+128 more)

### Community 17 - "test-posiciones-banda.js y memcard-fs.js"
Cohesion: 0.21
Nodes (14): closeIfBackdrop(), renderTrophyByStyle(), _bootStep(), cargarEditor(), assert(), lanza(), bit(), campo() (+6 more)

### Community 4 - "pes5-tool.js"
Cohesion: 0.05
Nodes (92): cargarReglasFirestore(), desmontar(), jugadorParaEditor(), plantillaParaEditor(), registroDeId(), cambiosDesdeEditor(), aplicarCambiosAlJugador(), cargarReglasFirestore() (+84 more)

### Community 2 - "Palmares (Sala de Trofeos 3D)"
Cohesion: 0.03
Nodes (115): palmaresCompByKey(), getTrophyStyles(), _uid(), trophyClassica(), trophyImperial(), trophyKonami(), trophyOrejona(), trophySobria() (+107 more)

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

### Community 7 - "Sorteo en vivo"
Cohesion: 0.06
Nodes (73): newBomboId(), newBombo(), emptyState(), _journalCapturePhase(), _journalCaptureMatches(), effectiveDrawnIds(), ensureBC(), broadcast() (+65 more)

### Community 35 - "Estado global"
Cohesion: 1.0
Nodes (0): 

### Community 16 - "OptionFile.java"
Cohesion: 0.24
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

### Community 25 - "write-test-full.js"
Cohesion: 0.6
Nodes (3): bitsOf(), writeBits(), setField()

### Community 37 - "xor-diff.js"
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

- **Why does `showToast()` connect `Partidos` to `Palmares (Sala de Trofeos 3D)`, `Historial y H2H`, `pes5-tool.js`, `Bracket`, `Navegacion`, `Sorteo en vivo`, `Perfil del presidente`, `Sonido`, `Push y Ajustes y arranque`, `Calendario`, `Capa de datos`, `Usuarios (admin)`?**
  _High betweenness centrality (0.177) - this node is a cross-community bridge._
- **Why does `dbGetAll()` connect `Partidos` to `mejoras-page.js`, `Palmares (Sala de Trofeos 3D)`, `Historial y H2H`, `pes5-tool.js`, `Bracket`, `Navegacion`, `Sorteo en vivo`, `Push y Ajustes y arranque`, `Calendario`, `Equipos`, `pes5-yunacoins.js y yunacoins-rules.js`, `Capa de datos`, `Usuarios (admin)`?**
  _High betweenness centrality (0.170) - this node is a cross-community bridge._
- **Why does `escHtml()` connect `Historial y H2H` to `Partidos`, `mejoras-page.js`, `Palmares (Sala de Trofeos 3D)`, `pes5-tool.js`, `Bracket`, `Navegacion`, `Sorteo en vivo`, `Perfil del presidente`, `Push y Ajustes y arranque`, `Calendario`, `Equipos`, `pes5-yunacoins.js y yunacoins-rules.js`, `Usuarios (admin)`?**
  _High betweenness centrality (0.169) - this node is a cross-community bridge._
- **Are the 145 inferred relationships involving `dbGetAll()` (e.g. with `renderBracket()` and `getStandingsForPhase()`) actually correct?**
  _`dbGetAll()` has 145 INFERRED edges - model-reasoned connections that need verification._
- **Are the 108 inferred relationships involving `showToast()` (e.g. with `authForgotPassword()` and `authSignOut()`) actually correct?**
  _`showToast()` has 108 INFERRED edges - model-reasoned connections that need verification._
- **Are the 91 inferred relationships involving `dbGet()` (e.g. with `renderBracket()` and `getStandingsForPhase()`) actually correct?**
  _`dbGet()` has 91 INFERRED edges - model-reasoned connections that need verification._
- **Are the 89 inferred relationships involving `escHtml()` (e.g. with `authForgotPassword()` and `teamLogoHtml()`) actually correct?**
  _`escHtml()` has 89 INFERRED edges - model-reasoned connections that need verification._