# Graph Report - .  (2026-11-07)

## Corpus Check
- solo AST

## Summary
- 1395 nodes · 3732 edges · 39 communities detected
- Extraction: 72% EXTRACTED · 28% INFERRED · 0% AMBIGUOUS · INFERRED: 1031 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Promo APK|Promo APK]]
- [[_COMMUNITY_Perfil del presidente|Perfil del presidente]]
- [[_COMMUNITY_Splash de arranque|Splash de arranque]]
- [[_COMMUNITY_Bracket|Bracket]]
- [[_COMMUNITY_Historial y H2H|Historial y H2H]]
- [[_COMMUNITY_Sonido|Sonido]]
- [[_COMMUNITY_Usuarios (admin)|Usuarios (admin)]]
- [[_COMMUNITY_Capa de datos|Capa de datos]]
- [[_COMMUNITY_Tablas de posiciones|Tablas de posiciones]]
- [[_COMMUNITY_Calendario|Calendario]]
- [[_COMMUNITY_Navegacion|Navegacion]]
- [[_COMMUNITY_Config Cloudinary (ejemplo)|Config Cloudinary (ejemplo)]]
- [[_COMMUNITY_Equipos|Equipos]]
- [[_COMMUNITY_Push y Ajustes y arranque|Push y Ajustes y arranque]]
- [[_COMMUNITY_Delegacion de eventos|Delegacion de eventos]]
- [[_COMMUNITY_Config Firebase (ejemplo)|Config Firebase (ejemplo)]]
- [[_COMMUNITY_Config Firebase|Config Firebase]]
- [[_COMMUNITY_Generador de fechas|Generador de fechas]]
- [[_COMMUNITY_Sorteo en vivo|Sorteo en vivo]]
- [[_COMMUNITY_mejoras-page.js|mejoras-page.js]]
- [[_COMMUNITY_pes5-tool.js|pes5-tool.js]]
- [[_COMMUNITY_Palmares (Sala de Trofeos 3D)|Palmares (Sala de Trofeos 3D)]]
- [[_COMMUNITY_pes5-bloqueo.js|pes5-bloqueo.js]]
- [[_COMMUNITY_pes5-crypt.js|pes5-crypt.js]]
- [[_COMMUNITY_pes5-editor.js|pes5-editor.js]]
- [[_COMMUNITY_pes5-save.js|pes5-save.js]]
- [[_COMMUNITY_Estado global|Estado global]]
- [[_COMMUNITY_OptionFile.java|OptionFile.java]]
- [[_COMMUNITY_snapshot.js|snapshot.js]]
- [[_COMMUNITY_test-posiciones-banda.js|test-posiciones-banda.js]]
- [[_COMMUNITY_test-slice-p-plantilla.js|test-slice-p-plantilla.js]]
- [[_COMMUNITY_test-yunacoins-rules.js|test-yunacoins-rules.js]]
- [[_COMMUNITY_write-team-test.js|write-team-test.js]]
- [[_COMMUNITY_write-test-full.js|write-test-full.js]]
- [[_COMMUNITY_xor-diff.js|xor-diff.js]]
- [[_COMMUNITY_write-attrs.js|write-attrs.js]]
- [[_COMMUNITY_extract-save.js|extract-save.js]]
- [[_COMMUNITY_list-saves.js|list-saves.js]]
- [[_COMMUNITY_memcard-fs.js|memcard-fs.js]]

## God Nodes (most connected - your core abstractions)
1. `dbGetAll()` - 143 edges
2. `showToast()` - 110 edges
3. `dbGet()` - 94 edges
4. `escHtml()` - 86 edges
5. `dbPut()` - 59 edges
6. `dbErrorMsg()` - 34 edges
7. `dbAdd()` - 32 edges
8. `showConfirm()` - 29 edges
9. `renderAdminPage()` - 23 edges
10. `invalidateStandingsAndSyncBrackets()` - 22 edges

## Surprising Connections (you probably didn't know these)
- `deleteBracketMatch()` --calls--> `showConfirm()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\bracket.js → D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\ui-utils.js
- `_calCenterAnchorScroll()` --calls--> `_focusPublicSectionInner()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\calendar.js → D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\nav.js
- `_calInitHeroCountdown()` --calls--> `countdown()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\calendar.js → D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\motion.js
- `_deletePhaseCascade()` --calls--> `dbDeleteMany()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\competitions.js → D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\db.js
- `dbGetAll()` --calls--> `_palmDuplicate()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\db.js → D:\Desktop\tsc.web\.claude\worktrees\heuristic-benz-286c07\tsc-src\js\palmares.js

## Communities

### Community 19 - "Promo APK"
Cohesion: 0.36
Nodes (9): _apkIsNativeApp(), _apkShouldOffer(), _apkAlreadyDownloaded(), _apkClosedRecently(), openApkPromo(), _apkHideOverlay(), closeApkPromo(), tscApkDownloadClick() (+1 more)

### Community 7 - "Perfil del presidente"
Cohesion: 0.04
Nodes (65): _usersCol(), _injectAuthModal(), openAuthModal(), toggleAuthMode(), _renderAuthModalMode(), authForgotPassword(), authSubmit(), _authErrorMsg() (+57 more)

### Community 24 - "Splash de arranque"
Cohesion: 0.4
Nodes (0): 

### Community 11 - "Bracket"
Cohesion: 0.07
Nodes (44): getWinner(), hexToRgb(), rgbStr(), lighten(), Particle, spawnRocket(), loop(), _cleanup() (+36 more)

### Community 3 - "Historial y H2H"
Cohesion: 0.04
Nodes (103): teamLogoHtml(), _calLogo(), _calHeroGoH2H(), openCompModal(), dbIsArchivedSeason(), _histNorm(), _histResolveExactTeam(), _histResolveTeam() (+95 more)

### Community 10 - "Sonido"
Cohesion: 0.07
Nodes (41): _getAudioCtx(), resume(), _fwSoundOff(), _soundRocketLaunch(), _soundExplosion(), _palmAudio(), _palmSoundOff(), _palmApplyVol() (+33 more)

### Community 18 - "Usuarios (admin)"
Cohesion: 0.32
Nodes (8): Rocket, _palmBindEdgeFade(), renderAdmUsuarios(), _uaBackfillUsernames(), adminSetUserLock(), adminSetUserRole(), adminSetUserTeam(), _uaApplyTeam()

### Community 0 - "Capa de datos"
Cohesion: 0.03
Nodes (208): invalidateStandingsAndSyncBrackets(), _calSeasonLocked(), _calLiveMsg(), calClearSchedule(), _calDoSaveDayLabel(), _coinsRun(), _coinsSeasonLocked(), _coinsAmount() (+200 more)

### Community 13 - "Tablas de posiciones"
Cohesion: 0.12
Nodes (22): refBadgeHTML(), saveCriteria(), openCriteriaModal(), closeCriteriaModal(), criteriaDragEnd(), criteriaDrop(), criteriaDropOnContainer(), criteriaDisable() (+14 more)

### Community 5 - "Calendario"
Cohesion: 0.05
Nodes (71): _calFormatDay(), _calTodayStr(), _calViewerTodayStr(), _calMatchInstant(), _calMatchTimeLocal(), _calLocalDateStr(), _calJornadaViewerDate(), _calWhenError() (+63 more)

### Community 8 - "Navegacion"
Cohesion: 0.08
Nodes (52): _calHeroGoComp(), liveStop(), liveSubscribe(), liveRadarStart(), liveRadarStop(), _subscribeAdminMatchesLive(), getPublicScrollPages(), getMountedPublicPages() (+44 more)

### Community 27 - "Config Cloudinary (ejemplo)"
Cohesion: 1.0
Nodes (2): cloudReady(), uploadImageToCloud()

### Community 12 - "Equipos"
Cohesion: 0.07
Nodes (37): resize(), frame(), wake(), stop(), setVariant(), init(), reduced(), _settle() (+29 more)

### Community 9 - "Push y Ajustes y arranque"
Cohesion: 0.06
Nodes (49): getVariant(), _plugin(), isEnabled(), _clearToken(), _setPendingTokenRemoval(), _clearPendingTokenRemoval(), _pushDocRef(), _currentTimezone() (+41 more)

### Community 14 - "Delegacion de eventos"
Cohesion: 0.14
Nodes (10): _onTokens(), _onParse(), _onIsNative(), _onEventFor(), _onResolve(), _onRun(), bitsOf(), writeBits() (+2 more)

### Community 30 - "Config Firebase (ejemplo)"
Cohesion: 1.0
Nodes (0): 

### Community 31 - "Config Firebase"
Cohesion: 1.0
Nodes (0): 

### Community 16 - "Generador de fechas"
Cohesion: 0.19
Nodes (11): _fxScheduledCount(), _fxShuffle(), fxBuildRoundRobin(), fxBuildLuisRoute(), _fxBuildLuisRouteForLegs(), _fxGenerateCalendarAndRoute(), fxGroupLockReason(), openFixtureGenModal() (+3 more)

### Community 6 - "Sorteo en vivo"
Cohesion: 0.06
Nodes (73): _mxDeleteOps(), newBomboId(), newBombo(), emptyState(), _journalCapturePhase(), _journalCaptureMatches(), effectiveDrawnIds(), ensureBC() (+65 more)

### Community 2 - "mejoras-page.js"
Cohesion: 0.04
Nodes (107): closeIfBackdrop(), jsq(), openModal(), closeModal(), _syncScrollLock(), showToast(), renderAuthUI(), puedeMandarPedido() (+99 more)

### Community 4 - "pes5-tool.js"
Cohesion: 0.05
Nodes (92): desmontar(), jugadorParaEditor(), plantillaParaEditor(), registroDeId(), cambiosDesdeEditor(), aplicarCambiosAlJugador(), cargarReglasFirestore(), _refrescarGastoTemporadaEquipo() (+84 more)

### Community 1 - "Palmares (Sala de Trofeos 3D)"
Cohesion: 0.03
Nodes (112): getTrophyStyles(), _uid(), trophyClassica(), trophyImperial(), trophyKonami(), trophyOrejona(), trophySobria(), trophyModerno() (+104 more)

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

### Community 15 - "OptionFile.java"
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

### Community 20 - "write-team-test.js"
Cohesion: 0.38
Nodes (9): teamName(), findTeamIndex(), playerName(), findPlayerId(), rosterOffset(), readRoster(), writeRoster(), removeFromTeam() (+1 more)

### Community 25 - "write-test-full.js"
Cohesion: 0.6
Nodes (3): bitsOf(), writeBits(), setField()

### Community 38 - "xor-diff.js"
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

- **Why does `dbGetAll()` connect `Capa de datos` to `Palmares (Sala de Trofeos 3D)`, `mejoras-page.js`, `Historial y H2H`, `pes5-tool.js`, `Calendario`, `Sorteo en vivo`, `Navegacion`, `Bracket`, `Equipos`, `Generador de fechas`, `Usuarios (admin)`?**
  _High betweenness centrality (0.201) - this node is a cross-community bridge._
- **Why does `showToast()` connect `Capa de datos` to `Palmares (Sala de Trofeos 3D)`, `Historial y H2H`, `pes5-tool.js`, `Calendario`, `Sorteo en vivo`, `Perfil del presidente`, `Navegacion`, `Push y Ajustes y arranque`, `Sonido`, `Bracket`, `Tablas de posiciones`, `Generador de fechas`, `Usuarios (admin)`?**
  _High betweenness centrality (0.168) - this node is a cross-community bridge._
- **Why does `escHtml()` connect `Historial y H2H` to `Capa de datos`, `Palmares (Sala de Trofeos 3D)`, `mejoras-page.js`, `pes5-tool.js`, `Calendario`, `Sorteo en vivo`, `Perfil del presidente`, `Navegacion`, `Push y Ajustes y arranque`, `Bracket`, `Equipos`, `Tablas de posiciones`, `Usuarios (admin)`?**
  _High betweenness centrality (0.148) - this node is a cross-community bridge._
- **Are the 140 inferred relationships involving `dbGetAll()` (e.g. with `renderBracket()` and `getStandingsForPhase()`) actually correct?**
  _`dbGetAll()` has 140 INFERRED edges - model-reasoned connections that need verification._
- **Are the 106 inferred relationships involving `showToast()` (e.g. with `authForgotPassword()` and `authSignOut()`) actually correct?**
  _`showToast()` has 106 INFERRED edges - model-reasoned connections that need verification._
- **Are the 91 inferred relationships involving `dbGet()` (e.g. with `renderBracket()` and `getStandingsForPhase()`) actually correct?**
  _`dbGet()` has 91 INFERRED edges - model-reasoned connections that need verification._
- **Are the 84 inferred relationships involving `escHtml()` (e.g. with `authForgotPassword()` and `teamLogoHtml()`) actually correct?**
  _`escHtml()` has 84 INFERRED edges - model-reasoned connections that need verification._