# Graph Report - .  (2026-11-17)

## Corpus Check
- solo AST

## Summary
- 1524 nodes · 4144 edges · 29 communities detected
- Extraction: 76% EXTRACTED · 24% INFERRED · 0% AMBIGUOUS · INFERRED: 1007 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Promo APK|Promo APK]]
- [[_COMMUNITY_Perfil del presidente|Perfil del presidente]]
- [[_COMMUNITY_Push y Ajustes y arranque|Push y Ajustes y arranque]]
- [[_COMMUNITY_Splash de arranque|Splash de arranque]]
- [[_COMMUNITY_Bracket|Bracket]]
- [[_COMMUNITY_Historial y H2H|Historial y H2H]]
- [[_COMMUNITY_Sonido|Sonido]]
- [[_COMMUNITY_Partidos|Partidos]]
- [[_COMMUNITY_Tablas de posiciones|Tablas de posiciones]]
- [[_COMMUNITY_Calendario|Calendario]]
- [[_COMMUNITY_Config Cloudinary (ejemplo)|Config Cloudinary (ejemplo)]]
- [[_COMMUNITY_yunacoins-rules.js|yunacoins-rules.js]]
- [[_COMMUNITY_Capa de datos|Capa de datos]]
- [[_COMMUNITY_Equipos|Equipos]]
- [[_COMMUNITY_Delegacion de eventos|Delegacion de eventos]]
- [[_COMMUNITY_Config Firebase (ejemplo)|Config Firebase (ejemplo)]]
- [[_COMMUNITY_Config Firebase|Config Firebase]]
- [[_COMMUNITY_Generador de fechas|Generador de fechas]]
- [[_COMMUNITY_Navegacion|Navegacion]]
- [[_COMMUNITY_mejoras-page.js|mejoras-page.js]]
- [[_COMMUNITY_pes5-tool.js|pes5-tool.js]]
- [[_COMMUNITY_Palmares (Sala de Trofeos 3D)|Palmares (Sala de Trofeos 3D)]]
- [[_COMMUNITY_pes5-bloqueo.js|pes5-bloqueo.js]]
- [[_COMMUNITY_pes5-clubes.js|pes5-clubes.js]]
- [[_COMMUNITY_pes5-crypt.js|pes5-crypt.js]]
- [[_COMMUNITY_pes5-editor.js|pes5-editor.js]]
- [[_COMMUNITY_pes5-save.js|pes5-save.js]]
- [[_COMMUNITY_Sorteo en vivo|Sorteo en vivo]]
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
- `deleteBracketMatch()` --calls--> `showConfirm()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\emparejar-80\tsc-src\js\bracket.js → D:\Desktop\tsc.web\.claude\worktrees\emparejar-80\tsc-src\js\ui-utils.js
- `_calCenterAnchorScroll()` --calls--> `_focusPublicSectionInner()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\emparejar-80\tsc-src\js\calendar.js → D:\Desktop\tsc.web\.claude\worktrees\emparejar-80\tsc-src\js\nav.js
- `_calInitHeroCountdown()` --calls--> `countdown()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\emparejar-80\tsc-src\js\calendar.js → D:\Desktop\tsc.web\.claude\worktrees\emparejar-80\tsc-src\js\motion.js
- `dbGetAll()` --calls--> `_palmDuplicate()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\emparejar-80\tsc-src\js\db.js → D:\Desktop\tsc.web\.claude\worktrees\emparejar-80\tsc-src\js\palmares.js
- `getForSeason()` --calls--> `resolveTeamData()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\emparejar-80\tsc-src\js\db.js → D:\Desktop\tsc.web\.claude\worktrees\emparejar-80\tsc-src\js\standings.js

## Communities

### Community 18 - "Promo APK"
Cohesion: 0.36
Nodes (9): _apkIsNativeApp(), _apkShouldOffer(), _apkAlreadyDownloaded(), _apkClosedRecently(), openApkPromo(), _apkHideOverlay(), closeApkPromo(), tscApkDownloadClick() (+1 more)

### Community 6 - "Perfil del presidente"
Cohesion: 0.04
Nodes (69): _usersCol(), _injectAuthModal(), openAuthModal(), toggleAuthMode(), _renderAuthModalMode(), authForgotPassword(), authSubmit(), _authErrorMsg() (+61 more)

### Community 10 - "Push y Ajustes y arranque"
Cohesion: 0.06
Nodes (51): authSignOut(), getVariant(), _plugin(), isEnabled(), _clearToken(), _setPendingTokenRemoval(), _clearPendingTokenRemoval(), _pushDocRef() (+43 more)

### Community 20 - "Splash de arranque"
Cohesion: 0.4
Nodes (0): 

### Community 5 - "Bracket"
Cohesion: 0.05
Nodes (73): getWinner(), _getAudioCtx(), _fwSoundOff(), _soundRocketLaunch(), _soundExplosion(), hexToRgb(), rgbStr(), lighten() (+65 more)

### Community 4 - "Historial y H2H"
Cohesion: 0.04
Nodes (102): teamLogoHtml(), _calLogo(), _calHeroGoH2H(), _coinsCobroLineaHTML(), openCoinsModal(), dbIsArchivedSeason(), _histNorm(), _histResolveExactTeam() (+94 more)

### Community 13 - "Sonido"
Cohesion: 0.08
Nodes (38): resume(), liveRadarProximity(), _palmAudio(), _palmSoundOff(), _palmApplyVol(), playPalmZoom(), playPalmZoomOut(), _PalmSmoke (+30 more)

### Community 2 - "Partidos"
Cohesion: 0.04
Nodes (136): openSlotRefModal(), _coinsRun(), _coinsTemporadaInfo(), _coinsTemporadaCobro(), _coinsAmount(), renderAdmCoins(), renderCoinsTable(), filterCoinsTable() (+128 more)

### Community 15 - "Tablas de posiciones"
Cohesion: 0.13
Nodes (22): refBadgeHTML(), saveCriteria(), openCriteriaModal(), criteriaDragEnd(), criteriaDrop(), criteriaDropOnContainer(), criteriaDisable(), criteriaRestore() (+14 more)

### Community 9 - "Calendario"
Cohesion: 0.07
Nodes (59): _calFormatDay(), _calTodayStr(), _calViewerTodayStr(), _calMatchInstant(), _calMatchTimeLocal(), _calLocalDateStr(), _calJornadaViewerDate(), _calWhenError() (+51 more)

### Community 21 - "Config Cloudinary (ejemplo)"
Cohesion: 1.0
Nodes (2): cloudReady(), uploadImageToCloud()

### Community 8 - "yunacoins-rules.js"
Cohesion: 0.05
Nodes (76): openColorPicker(), _compPickColor(), cargarReglasFirestore(), cargarTemporadaCobro(), cargarTopeTemporada(), _bloqueTopeAtributoHTML(), guardarReglas(), R() (+68 more)

### Community 12 - "Capa de datos"
Cohesion: 0.07
Nodes (53): _deletePhaseCascade(), renderAdmData(), renderDBInfo(), exportFullDB(), downloadJSON(), _dataBackupStores(), _dataTypeOk(), _dataValidateRecord() (+45 more)

### Community 14 - "Equipos"
Cohesion: 0.07
Nodes (38): resize(), frame(), wake(), stop(), setVariant(), init(), reduced(), _settle() (+30 more)

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
Cohesion: 0.21
Nodes (9): _fxShuffle(), fxBuildRoundRobin(), fxBuildLuisRoute(), _fxBuildLuisRouteForLegs(), _fxGenerateCalendarAndRoute(), fxShuffleAgain(), renderFixtureGenModal(), _fxSetLoaderProgress() (+1 more)

### Community 11 - "Navegacion"
Cohesion: 0.08
Nodes (52): liveStop(), liveSubscribe(), liveRadarStart(), liveRadarStop(), getPublicScrollPages(), getMountedPublicPages(), _isPublicScrollPage(), _syncPublicNavigation() (+44 more)

### Community 0 - "mejoras-page.js"
Cohesion: 0.03
Nodes (170): jsq(), openModal(), closeModal(), _syncScrollLock(), showToast(), renderAuthUI(), puedeMandarPedido(), applyTheme() (+162 more)

### Community 1 - "pes5-tool.js"
Cohesion: 0.03
Nodes (150): cargarTopeExtraEquipo(), jugadorDesdePlantillaReal(), desmontar(), jugadorParaEditor(), plantillaParaEditor(), atributosDeEditor(), cambiosDesdeEditor(), aplicarCambiosAlJugador() (+142 more)

### Community 3 - "Palmares (Sala de Trofeos 3D)"
Cohesion: 0.03
Nodes (128): palmaresCompByKey(), getTrophyStyles(), _uid(), trophyClassica(), trophyImperial(), trophyKonami(), trophyOrejona(), trophySobria() (+120 more)

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

### Community 7 - "Sorteo en vivo"
Cohesion: 0.06
Nodes (73): newBomboId(), newBombo(), emptyState(), _journalCapturePhase(), _journalCaptureMatches(), effectiveDrawnIds(), ensureBC(), broadcast() (+65 more)

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

- **Why does `dbGetAll()` connect `Partidos` to `mejoras-page.js`, `pes5-tool.js`, `Palmares (Sala de Trofeos 3D)`, `Historial y H2H`, `Bracket`, `Perfil del presidente`, `Sorteo en vivo`, `yunacoins-rules.js`, `Calendario`, `Push y Ajustes y arranque`, `Navegacion`, `Capa de datos`, `Equipos`, `Tablas de posiciones`?**
  _High betweenness centrality (0.243) - this node is a cross-community bridge._
- **Why does `escHtml()` connect `Historial y H2H` to `mejoras-page.js`, `pes5-tool.js`, `Partidos`, `Palmares (Sala de Trofeos 3D)`, `Bracket`, `Perfil del presidente`, `Sorteo en vivo`, `yunacoins-rules.js`, `Calendario`, `Push y Ajustes y arranque`, `Navegacion`, `Capa de datos`, `Equipos`, `Tablas de posiciones`?**
  _High betweenness centrality (0.203) - this node is a cross-community bridge._
- **Why does `showToast()` connect `Partidos` to `pes5-tool.js`, `Palmares (Sala de Trofeos 3D)`, `Historial y H2H`, `Bracket`, `Perfil del presidente`, `Sorteo en vivo`, `yunacoins-rules.js`, `Calendario`, `Push y Ajustes y arranque`, `Navegacion`, `Capa de datos`, `Sonido`, `Tablas de posiciones`, `Generador de fechas`?**
  _High betweenness centrality (0.169) - this node is a cross-community bridge._
- **Are the 135 inferred relationships involving `dbGetAll()` (e.g. with `renderBracket()` and `getStandingsForPhase()`) actually correct?**
  _`dbGetAll()` has 135 INFERRED edges - model-reasoned connections that need verification._
- **Are the 103 inferred relationships involving `showToast()` (e.g. with `authForgotPassword()` and `authSignOut()`) actually correct?**
  _`showToast()` has 103 INFERRED edges - model-reasoned connections that need verification._
- **Are the 97 inferred relationships involving `escHtml()` (e.g. with `authForgotPassword()` and `teamLogoHtml()`) actually correct?**
  _`escHtml()` has 97 INFERRED edges - model-reasoned connections that need verification._
- **Are the 73 inferred relationships involving `dbGet()` (e.g. with `renderBracket()` and `getStandingsForPhase()`) actually correct?**
  _`dbGet()` has 73 INFERRED edges - model-reasoned connections that need verification._