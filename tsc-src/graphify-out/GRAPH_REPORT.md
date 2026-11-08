# Graph Report - .  (2026-11-07)

## Corpus Check
- solo AST

## Summary
- 1423 nodes · 3806 edges · 38 communities detected
- Extraction: 73% EXTRACTED · 27% INFERRED · 0% AMBIGUOUS · INFERRED: 1038 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Promo APK|Promo APK]]
- [[_COMMUNITY_Perfil del presidente|Perfil del presidente]]
- [[_COMMUNITY_Push y Ajustes y arranque|Push y Ajustes y arranque]]
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
- [[_COMMUNITY_Capa de datos|Capa de datos]]
- [[_COMMUNITY_Equipos|Equipos]]
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
4. `escHtml()` - 90 edges
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
- `dbGetAll()` --calls--> `_palmDuplicate()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\db.js → D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\palmares.js
- `getForSeason()` --calls--> `resolveTeamData()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\db.js → D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\standings.js
- `goAdminPage()` --calls--> `openFasesForComp()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\nav.js → D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\phases.js

## Communities

### Community 20 - "Promo APK"
Cohesion: 0.36
Nodes (9): _apkIsNativeApp(), _apkShouldOffer(), _apkAlreadyDownloaded(), _apkClosedRecently(), openApkPromo(), _apkHideOverlay(), closeApkPromo(), tscApkDownloadClick() (+1 more)

### Community 7 - "Perfil del presidente"
Cohesion: 0.05
Nodes (64): _usersCol(), _injectAuthModal(), openAuthModal(), toggleAuthMode(), _renderAuthModalMode(), authForgotPassword(), authSubmit(), _authErrorMsg() (+56 more)

### Community 10 - "Push y Ajustes y arranque"
Cohesion: 0.06
Nodes (49): authSignOut(), getVariant(), _plugin(), isEnabled(), _clearToken(), _setPendingTokenRemoval(), _clearPendingTokenRemoval(), _pushDocRef() (+41 more)

### Community 24 - "Splash de arranque"
Cohesion: 0.4
Nodes (0): 

### Community 0 - "Bracket"
Cohesion: 0.03
Nodes (208): getWinner(), spawnRocket(), loop(), _cleanup(), _onClick(), renderBracket(), buildBracketRounds(), getStandingsForPhase() (+200 more)

### Community 4 - "Historial y H2H"
Cohesion: 0.04
Nodes (93): teamLogoHtml(), _calLogo(), _histNorm(), _histResolveExactTeam(), _histResolveTeam(), computeResultado(), loadStaticHistory(), seedHistoryIfEmpty() (+85 more)

### Community 9 - "Sonido"
Cohesion: 0.07
Nodes (43): _getAudioCtx(), resume(), _fwSoundOff(), _soundRocketLaunch(), _soundExplosion(), frame(), liveRadarStart(), _palmAudio() (+35 more)

### Community 5 - "Sorteo en vivo"
Cohesion: 0.06
Nodes (74): hexToRgb(), lighten(), newBomboId(), newBombo(), emptyState(), _journalCapturePhase(), _journalCaptureMatches(), effectiveDrawnIds() (+66 more)

### Community 15 - "Bracket y Usuarios (admin)"
Cohesion: 0.17
Nodes (10): rgbStr(), Particle, Rocket, renderAdmUsuarios(), _uaBackfillUsernames(), adminSetUserLock(), adminSetUserRole(), adminSetUserTeam() (+2 more)

### Community 13 - "Tablas de posiciones"
Cohesion: 0.13
Nodes (21): refBadgeHTML(), openCriteriaModal(), closeCriteriaModal(), criteriaDragEnd(), criteriaDrop(), criteriaDropOnContainer(), criteriaDisable(), criteriaRestore() (+13 more)

### Community 12 - "Calendario"
Cohesion: 0.1
Nodes (37): _calFormatDay(), _calTodayStr(), _calViewerTodayStr(), _calMatchInstant(), _calMatchTimeLocal(), _calLocalDateStr(), _calJornadaViewerDate(), _calWhenError() (+29 more)

### Community 6 - "Navegacion"
Cohesion: 0.06
Nodes (71): _calHeroGoComp(), _pubSwitchHistoryView(), liveStop(), liveSubscribe(), liveRadarStop(), getPublicScrollPages(), getMountedPublicPages(), _isPublicScrollPage() (+63 more)

### Community 26 - "Config Cloudinary (ejemplo)"
Cohesion: 1.0
Nodes (2): cloudReady(), uploadImageToCloud()

### Community 8 - "Capa de datos"
Cohesion: 0.05
Nodes (58): openColorPicker(), _sortComps(), renderAdmComps(), renderCompsGrid(), _compPickColor(), closeCompModal(), _deletePhaseCascade(), openCompReorderModal() (+50 more)

### Community 11 - "Equipos"
Cohesion: 0.06
Nodes (40): resize(), wake(), stop(), setVariant(), init(), reduced(), _settle(), _observer() (+32 more)

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

### Community 1 - "mejoras-page.js"
Cohesion: 0.04
Nodes (126): jsq(), openModal(), closeModal(), _syncScrollLock(), showToast(), renderAuthUI(), puedeMandarPedido(), applyTheme() (+118 more)

### Community 19 - "test-posiciones-banda.js y memcard-fs.js"
Cohesion: 0.23
Nodes (13): closeIfBackdrop(), _bootStep(), cargarEditor(), assert(), lanza(), bit(), campo(), main() (+5 more)

### Community 3 - "pes5-tool.js"
Cohesion: 0.04
Nodes (98): recalcularPresupuestoReal(), desmontar(), jugadorParaEditor(), plantillaParaEditor(), registroDeId(), cambiosDesdeEditor(), aplicarCambiosAlJugador(), cargarReglasFirestore() (+90 more)

### Community 2 - "Palmares (Sala de Trofeos 3D)"
Cohesion: 0.03
Nodes (117): getTrophyStyles(), _uid(), trophyClassica(), trophyImperial(), trophyKonami(), trophyOrejona(), trophySobria(), trophyModerno() (+109 more)

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

- **Why does `dbGetAll()` connect `Bracket` to `mejoras-page.js`, `Palmares (Sala de Trofeos 3D)`, `pes5-tool.js`, `Historial y H2H`, `Sorteo en vivo`, `Navegacion`, `Capa de datos`, `Equipos`, `Calendario`, `Bracket y Usuarios (admin)`?**
  _High betweenness centrality (0.237) - this node is a cross-community bridge._
- **Why does `escHtml()` connect `Historial y H2H` to `Bracket`, `mejoras-page.js`, `Palmares (Sala de Trofeos 3D)`, `pes5-tool.js`, `Sorteo en vivo`, `Navegacion`, `Perfil del presidente`, `Capa de datos`, `Push y Ajustes y arranque`, `Equipos`, `Calendario`, `Tablas de posiciones`, `Bracket y Usuarios (admin)`?**
  _High betweenness centrality (0.189) - this node is a cross-community bridge._
- **Why does `showToast()` connect `Bracket` to `Palmares (Sala de Trofeos 3D)`, `pes5-tool.js`, `Historial y H2H`, `Sorteo en vivo`, `Navegacion`, `Perfil del presidente`, `Capa de datos`, `Sonido`, `Push y Ajustes y arranque`, `Calendario`, `Tablas de posiciones`, `Bracket y Usuarios (admin)`?**
  _High betweenness centrality (0.142) - this node is a cross-community bridge._
- **Are the 140 inferred relationships involving `dbGetAll()` (e.g. with `renderBracket()` and `getStandingsForPhase()`) actually correct?**
  _`dbGetAll()` has 140 INFERRED edges - model-reasoned connections that need verification._
- **Are the 107 inferred relationships involving `showToast()` (e.g. with `authForgotPassword()` and `authSignOut()`) actually correct?**
  _`showToast()` has 107 INFERRED edges - model-reasoned connections that need verification._
- **Are the 91 inferred relationships involving `dbGet()` (e.g. with `renderBracket()` and `getStandingsForPhase()`) actually correct?**
  _`dbGet()` has 91 INFERRED edges - model-reasoned connections that need verification._
- **Are the 88 inferred relationships involving `escHtml()` (e.g. with `authForgotPassword()` and `teamLogoHtml()`) actually correct?**
  _`escHtml()` has 88 INFERRED edges - model-reasoned connections that need verification._