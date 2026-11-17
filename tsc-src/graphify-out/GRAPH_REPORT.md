# Graph Report - .  (2026-11-17)

## Corpus Check
- solo AST

## Summary
- 1557 nodes · 4232 edges · 29 communities detected
- Extraction: 76% EXTRACTED · 24% INFERRED · 0% AMBIGUOUS · INFERRED: 1015 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Promo APK|Promo APK]]
- [[_COMMUNITY_Perfil del presidente|Perfil del presidente]]
- [[_COMMUNITY_Splash de arranque|Splash de arranque]]
- [[_COMMUNITY_Bracket|Bracket]]
- [[_COMMUNITY_Sonido|Sonido]]
- [[_COMMUNITY_Sorteo en vivo|Sorteo en vivo]]
- [[_COMMUNITY_Temporadas|Temporadas]]
- [[_COMMUNITY_Calendario|Calendario]]
- [[_COMMUNITY_Historial y H2H|Historial y H2H]]
- [[_COMMUNITY_Navegacion|Navegacion]]
- [[_COMMUNITY_Config Cloudinary (ejemplo)|Config Cloudinary (ejemplo)]]
- [[_COMMUNITY_Equipos|Equipos]]
- [[_COMMUNITY_YuNaCoins|YuNaCoins]]
- [[_COMMUNITY_yunacoins-rules.js|yunacoins-rules.js]]
- [[_COMMUNITY_Capa de datos|Capa de datos]]
- [[_COMMUNITY_Push y Ajustes y arranque|Push y Ajustes y arranque]]
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
- [[_COMMUNITY_Estado global|Estado global]]

## God Nodes (most connected - your core abstractions)
1. `dbGetAll()` - 138 edges
2. `showToast()` - 109 edges
3. `escHtml()` - 101 edges
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
- `_htStatHeadCell()` --calls--> `escHtml()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\emparejar-80\tsc-src\js\history.js → D:\Desktop\tsc.web\.claude\worktrees\emparejar-80\tsc-src\js\sanitize.js
- `loadDraft()` --calls--> `aplicarCambiosAlJugador()`  [INFERRED]
  D:\Desktop\tsc.web\.claude\worktrees\emparejar-80\tsc-src\js\mejoras-page.js → D:\Desktop\tsc.web\.claude\worktrees\emparejar-80\tsc-src\js\pes5-plantilla.js

## Communities

### Community 18 - "Promo APK"
Cohesion: 0.36
Nodes (9): _apkIsNativeApp(), _apkShouldOffer(), _apkAlreadyDownloaded(), _apkClosedRecently(), openApkPromo(), _apkHideOverlay(), closeApkPromo(), tscApkDownloadClick() (+1 more)

### Community 9 - "Perfil del presidente"
Cohesion: 0.05
Nodes (61): _usersCol(), _injectAuthModal(), openAuthModal(), toggleAuthMode(), _renderAuthModalMode(), authForgotPassword(), authSubmit(), _authErrorMsg() (+53 more)

### Community 20 - "Splash de arranque"
Cohesion: 0.4
Nodes (0): 

### Community 1 - "Bracket"
Cohesion: 0.03
Nodes (168): getWinner(), teamLogoHtml(), spawnRocket(), loop(), _cleanup(), _onClick(), renderBracket(), buildBracketRounds() (+160 more)

### Community 10 - "Sonido"
Cohesion: 0.06
Nodes (45): _getAudioCtx(), resume(), _fwSoundOff(), _soundRocketLaunch(), _soundExplosion(), rgbStr(), Particle, Rocket (+37 more)

### Community 6 - "Sorteo en vivo"
Cohesion: 0.06
Nodes (74): hexToRgb(), lighten(), newBomboId(), newBombo(), emptyState(), _journalCapturePhase(), effectiveDrawnIds(), ensureBC() (+66 more)

### Community 4 - "Temporadas"
Cohesion: 0.05
Nodes (90): deleteBracketMatch(), _sortComps(), renderAdmComps(), renderCompsGrid(), closeCompModal(), saveComp(), _collectPhaseCascade(), _cascadeSummary() (+82 more)

### Community 14 - "Calendario"
Cohesion: 0.1
Nodes (35): _calFormatDay(), _calTodayStr(), _calViewerTodayStr(), _calMatchInstant(), _calMatchTimeLocal(), _calLocalDateStr(), _calJornadaViewerDate(), _calWhenError() (+27 more)

### Community 7 - "Historial y H2H"
Cohesion: 0.05
Nodes (72): _calHeroGoH2H(), dbIsArchivedSeason(), _histNorm(), _histResolveExactTeam(), _histResolveTeam(), computeResultado(), loadStaticHistory(), seedHistoryIfEmpty() (+64 more)

### Community 8 - "Navegacion"
Cohesion: 0.06
Nodes (72): _calHeroGoComp(), _pubSwitchHistoryView(), liveStop(), liveSubscribe(), liveRadarStop(), _subscribeAdminMatchesLive(), getPublicScrollPages(), getMountedPublicPages() (+64 more)

### Community 21 - "Config Cloudinary (ejemplo)"
Cohesion: 1.0
Nodes (2): cloudReady(), uploadImageToCloud()

### Community 12 - "Equipos"
Cohesion: 0.06
Nodes (46): cloudReady(), uploadImageToCloud(), resize(), frame(), wake(), stop(), setVariant(), init() (+38 more)

### Community 15 - "YuNaCoins"
Cohesion: 0.18
Nodes (16): _coinsRun(), _coinsTemporadaInfo(), _coinsTemporadaCobro(), _coinsAmount(), renderAdmCoins(), renderCoinsTable(), filterCoinsTable(), _coinsCobroLineaHTML() (+8 more)

### Community 5 - "yunacoins-rules.js"
Cohesion: 0.05
Nodes (85): openColorPicker(), _compPickColor(), cargarTopeTemporada(), _bloqueTopeAtributoHTML(), guardarReglas(), R(), esc(), ahora() (+77 more)

### Community 13 - "Capa de datos"
Cohesion: 0.09
Nodes (42): _deletePhaseCascade(), _dataApplyImport(), _dataRollback(), _isFS(), _assertWritable(), _archNative(), _archFreeze(), _archFetchJSON() (+34 more)

### Community 11 - "Push y Ajustes y arranque"
Cohesion: 0.06
Nodes (50): getVariant(), _plugin(), isEnabled(), _clearToken(), _setPendingTokenRemoval(), _clearPendingTokenRemoval(), _pushDocRef(), _currentTimezone() (+42 more)

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

### Community 0 - "mejoras-page.js"
Cohesion: 0.03
Nodes (187): jsq(), openModal(), closeModal(), _syncScrollLock(), showToast(), renderAuthUI(), puedeMandarPedido(), applyTheme() (+179 more)

### Community 2 - "pes5-tool.js"
Cohesion: 0.03
Nodes (151): _tiempoPedido(), jugadorDesdePlantillaReal(), desmontar(), jugadorParaEditor(), plantillaParaEditor(), cambiosDesdeEditor(), aplicarCambiosAlJugador(), canonicoJSON() (+143 more)

### Community 3 - "Palmares (Sala de Trofeos 3D)"
Cohesion: 0.03
Nodes (122): loadPalmaresComps(), getTrophyStyles(), _uid(), trophyClassica(), trophyImperial(), trophyKonami(), trophyOrejona(), trophySobria() (+114 more)

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

- **Why does `escHtml()` connect `Bracket` to `mejoras-page.js`, `pes5-tool.js`, `Palmares (Sala de Trofeos 3D)`, `Temporadas`, `yunacoins-rules.js`, `Sorteo en vivo`, `Historial y H2H`, `Navegacion`, `Perfil del presidente`, `Push y Ajustes y arranque`, `Equipos`, `Calendario`, `YuNaCoins`?**
  _High betweenness centrality (0.221) - this node is a cross-community bridge._
- **Why does `dbGetAll()` connect `Bracket` to `mejoras-page.js`, `pes5-tool.js`, `Palmares (Sala de Trofeos 3D)`, `Temporadas`, `yunacoins-rules.js`, `Sorteo en vivo`, `Historial y H2H`, `Navegacion`, `Push y Ajustes y arranque`, `Equipos`, `Capa de datos`, `Calendario`, `YuNaCoins`?**
  _High betweenness centrality (0.190) - this node is a cross-community bridge._
- **Why does `showToast()` connect `Temporadas` to `Bracket`, `pes5-tool.js`, `Palmares (Sala de Trofeos 3D)`, `yunacoins-rules.js`, `Sorteo en vivo`, `Historial y H2H`, `Navegacion`, `Perfil del presidente`, `Sonido`, `Push y Ajustes y arranque`, `Equipos`, `Calendario`, `YuNaCoins`, `Generador de fechas`?**
  _High betweenness centrality (0.165) - this node is a cross-community bridge._
- **Are the 135 inferred relationships involving `dbGetAll()` (e.g. with `renderBracket()` and `getStandingsForPhase()`) actually correct?**
  _`dbGetAll()` has 135 INFERRED edges - model-reasoned connections that need verification._
- **Are the 105 inferred relationships involving `showToast()` (e.g. with `authForgotPassword()` and `authSignOut()`) actually correct?**
  _`showToast()` has 105 INFERRED edges - model-reasoned connections that need verification._
- **Are the 99 inferred relationships involving `escHtml()` (e.g. with `authForgotPassword()` and `teamLogoHtml()`) actually correct?**
  _`escHtml()` has 99 INFERRED edges - model-reasoned connections that need verification._
- **Are the 73 inferred relationships involving `dbGet()` (e.g. with `renderBracket()` and `getStandingsForPhase()`) actually correct?**
  _`dbGet()` has 73 INFERRED edges - model-reasoned connections that need verification._