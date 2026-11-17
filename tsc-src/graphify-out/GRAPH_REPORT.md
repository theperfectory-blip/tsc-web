# Graph Report - .  (2026-11-17)

## Corpus Check
- solo AST

## Summary
- 1544 nodes · 4191 edges · 29 communities detected
- Extraction: 76% EXTRACTED · 24% INFERRED · 0% AMBIGUOUS · INFERRED: 1010 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Promo APK|Promo APK]]
- [[_COMMUNITY_Perfil del presidente|Perfil del presidente]]
- [[_COMMUNITY_Splash de arranque|Splash de arranque]]
- [[_COMMUNITY_Bracket|Bracket]]
- [[_COMMUNITY_Historial y H2H|Historial y H2H]]
- [[_COMMUNITY_Sonido|Sonido]]
- [[_COMMUNITY_Sorteo en vivo|Sorteo en vivo]]
- [[_COMMUNITY_Partido en vivo|Partido en vivo]]
- [[_COMMUNITY_Tablas de posiciones|Tablas de posiciones]]
- [[_COMMUNITY_Capa de datos|Capa de datos]]
- [[_COMMUNITY_Calendario|Calendario]]
- [[_COMMUNITY_Navegacion|Navegacion]]
- [[_COMMUNITY_Config Cloudinary (ejemplo)|Config Cloudinary (ejemplo)]]
- [[_COMMUNITY_yunacoins-rules.js|yunacoins-rules.js]]
- [[_COMMUNITY_Equipos|Equipos]]
- [[_COMMUNITY_Delegacion de eventos|Delegacion de eventos]]
- [[_COMMUNITY_Config Firebase (ejemplo)|Config Firebase (ejemplo)]]
- [[_COMMUNITY_Config Firebase|Config Firebase]]
- [[_COMMUNITY_Generador de fechas|Generador de fechas]]
- [[_COMMUNITY_mejoras-page.js|mejoras-page.js]]
- [[_COMMUNITY_pes5-tool.js|pes5-tool.js]]
- [[_COMMUNITY_Palmares (Sala de Trofeos 3D)|Palmares (Sala de Trofeos 3D)]]
- [[_COMMUNITY_pes5-bloqueo.js|pes5-bloqueo.js]]
- [[_COMMUNITY_pes5-clubes.js|pes5-clubes.js]]
- [[_COMMUNITY_pes5-crypt.js|pes5-crypt.js]]
- [[_COMMUNITY_pes5-editor.js|pes5-editor.js]]
- [[_COMMUNITY_pes5-save.js|pes5-save.js]]
- [[_COMMUNITY_Push y Ajustes y arranque|Push y Ajustes y arranque]]
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
- `_calCenterAnchorScroll()` --calls--> `_focusPublicSectionInner()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\emparejar-80\tsc-src\js\calendar.js → D:\Desktop\tsc.web\.claude\worktrees\emparejar-80\tsc-src\js\nav.js
- `_calInitHeroCountdown()` --calls--> `countdown()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\emparejar-80\tsc-src\js\calendar.js → D:\Desktop\tsc.web\.claude\worktrees\emparejar-80\tsc-src\js\motion.js
- `dbGetAll()` --calls--> `_palmDuplicate()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\emparejar-80\tsc-src\js\db.js → D:\Desktop\tsc.web\.claude\worktrees\emparejar-80\tsc-src\js\palmares.js
- `getForSeason()` --calls--> `resolveTeamData()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\emparejar-80\tsc-src\js\db.js → D:\Desktop\tsc.web\.claude\worktrees\emparejar-80\tsc-src\js\standings.js
- `_tiempoPedido()` --calls--> `msDeFecha()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\emparejar-80\tsc-src\js\mejoras-page.js → D:\Desktop\tsc.web\.claude\worktrees\emparejar-80\tsc-src\js\pes5-plantilla.js

## Communities

### Community 18 - "Promo APK"
Cohesion: 0.36
Nodes (9): _apkIsNativeApp(), _apkShouldOffer(), _apkAlreadyDownloaded(), _apkClosedRecently(), openApkPromo(), _apkHideOverlay(), closeApkPromo(), tscApkDownloadClick() (+1 more)

### Community 8 - "Perfil del presidente"
Cohesion: 0.05
Nodes (60): _usersCol(), _injectAuthModal(), openAuthModal(), toggleAuthMode(), _renderAuthModalMode(), authForgotPassword(), authSubmit(), _authErrorMsg() (+52 more)

### Community 20 - "Splash de arranque"
Cohesion: 0.4
Nodes (0): 

### Community 0 - "Bracket"
Cohesion: 0.03
Nodes (206): getWinner(), spawnRocket(), loop(), _cleanup(), _onClick(), renderBracket(), buildBracketRounds(), getStandingsForPhase() (+198 more)

### Community 4 - "Historial y H2H"
Cohesion: 0.04
Nodes (98): teamLogoHtml(), _calLogo(), _histNorm(), _histResolveExactTeam(), _histResolveTeam(), computeResultado(), loadStaticHistory(), seedHistoryIfEmpty() (+90 more)

### Community 9 - "Sonido"
Cohesion: 0.06
Nodes (45): _getAudioCtx(), resume(), _fwSoundOff(), _soundRocketLaunch(), _soundExplosion(), rgbStr(), Particle, Rocket (+37 more)

### Community 6 - "Sorteo en vivo"
Cohesion: 0.06
Nodes (77): hexToRgb(), lighten(), newBomboId(), newBombo(), emptyState(), _journalCapturePhase(), _journalCaptureMatches(), effectiveDrawnIds() (+69 more)

### Community 15 - "Partido en vivo"
Cohesion: 0.17
Nodes (23): invalidateStandingsAndSyncBrackets(), _liveMustHaveWinner(), _liveCanEdit(), _lmEnqueue(), _lmLiveDoc(), _findOtherLiveMatch(), _blockIfOtherLive(), _lmStart() (+15 more)

### Community 14 - "Tablas de posiciones"
Cohesion: 0.13
Nodes (22): refBadgeHTML(), openCriteriaModal(), closeCriteriaModal(), criteriaDragEnd(), criteriaDrop(), criteriaDropOnContainer(), criteriaDisable(), criteriaRestore() (+14 more)

### Community 11 - "Capa de datos"
Cohesion: 0.07
Nodes (50): _bkResultOps(), _deletePhaseCascade(), exportFullDB(), downloadJSON(), _dataBackupStores(), _dataTypeOk(), _dataValidateRecord(), _dataValidateStoreItems() (+42 more)

### Community 13 - "Calendario"
Cohesion: 0.11
Nodes (31): _calFormatDay(), _calTodayStr(), _calViewerTodayStr(), _calMatchInstant(), _calMatchTimeLocal(), _calLocalDateStr(), _calJornadaViewerDate(), _calWhenError() (+23 more)

### Community 7 - "Navegacion"
Cohesion: 0.06
Nodes (71): _calHeroGoComp(), _pubSwitchHistoryView(), liveStop(), liveSubscribe(), liveRadarStop(), getPublicScrollPages(), getMountedPublicPages(), _isPublicScrollPage() (+63 more)

### Community 21 - "Config Cloudinary (ejemplo)"
Cohesion: 1.0
Nodes (2): cloudReady(), uploadImageToCloud()

### Community 5 - "yunacoins-rules.js"
Cohesion: 0.05
Nodes (96): openColorPicker(), _compPickColor(), cargarReglasFirestore(), registroPres(), fijadoPres(), perfilPres(), costoStatPres(), gratisStatPres() (+88 more)

### Community 12 - "Equipos"
Cohesion: 0.06
Nodes (42): resize(), frame(), wake(), stop(), setVariant(), getVariant(), init(), reduced() (+34 more)

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

### Community 1 - "mejoras-page.js"
Cohesion: 0.02
Nodes (175): jsq(), openModal(), closeModal(), _syncScrollLock(), showToast(), renderAuthUI(), puedeMandarPedido(), applyTheme() (+167 more)

### Community 2 - "pes5-tool.js"
Cohesion: 0.04
Nodes (142): cargarTopeExtraEquipo(), jugadorDesdePlantillaReal(), desmontar(), jugadorParaEditor(), plantillaParaEditor(), atributosDeEditor(), cambiosDesdeEditor(), canonicoJSON() (+134 more)

### Community 3 - "Palmares (Sala de Trofeos 3D)"
Cohesion: 0.03
Nodes (117): getTrophyStyles(), _uid(), trophyClassica(), trophyImperial(), trophyKonami(), trophyOrejona(), trophySobria(), trophyModerno() (+109 more)

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

### Community 10 - "Push y Ajustes y arranque"
Cohesion: 0.06
Nodes (48): _plugin(), isEnabled(), _clearToken(), _setPendingTokenRemoval(), _clearPendingTokenRemoval(), _pushDocRef(), _currentTimezone(), _syncTokenToFirestore() (+40 more)

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

- **Why does `escHtml()` connect `Historial y H2H` to `Bracket`, `mejoras-page.js`, `pes5-tool.js`, `Palmares (Sala de Trofeos 3D)`, `yunacoins-rules.js`, `Sorteo en vivo`, `Navegacion`, `Perfil del presidente`, `Push y Ajustes y arranque`, `Equipos`, `Calendario`, `Tablas de posiciones`?**
  _High betweenness centrality (0.223) - this node is a cross-community bridge._
- **Why does `dbGetAll()` connect `Bracket` to `mejoras-page.js`, `pes5-tool.js`, `Palmares (Sala de Trofeos 3D)`, `Historial y H2H`, `yunacoins-rules.js`, `Sorteo en vivo`, `Navegacion`, `Capa de datos`, `Equipos`, `Calendario`, `Tablas de posiciones`, `Partido en vivo`?**
  _High betweenness centrality (0.194) - this node is a cross-community bridge._
- **Why does `showToast()` connect `Bracket` to `pes5-tool.js`, `Palmares (Sala de Trofeos 3D)`, `Historial y H2H`, `yunacoins-rules.js`, `Sorteo en vivo`, `Navegacion`, `Perfil del presidente`, `Sonido`, `Push y Ajustes y arranque`, `Capa de datos`, `Calendario`, `Tablas de posiciones`, `Partido en vivo`, `Generador de fechas`?**
  _High betweenness centrality (0.165) - this node is a cross-community bridge._
- **Are the 135 inferred relationships involving `dbGetAll()` (e.g. with `renderBracket()` and `getStandingsForPhase()`) actually correct?**
  _`dbGetAll()` has 135 INFERRED edges - model-reasoned connections that need verification._
- **Are the 103 inferred relationships involving `showToast()` (e.g. with `authForgotPassword()` and `authSignOut()`) actually correct?**
  _`showToast()` has 103 INFERRED edges - model-reasoned connections that need verification._
- **Are the 97 inferred relationships involving `escHtml()` (e.g. with `authForgotPassword()` and `teamLogoHtml()`) actually correct?**
  _`escHtml()` has 97 INFERRED edges - model-reasoned connections that need verification._
- **Are the 73 inferred relationships involving `dbGet()` (e.g. with `renderBracket()` and `getStandingsForPhase()`) actually correct?**
  _`dbGet()` has 73 INFERRED edges - model-reasoned connections that need verification._