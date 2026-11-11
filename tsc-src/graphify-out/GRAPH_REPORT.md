# Graph Report - .  (2026-11-11)

## Corpus Check
- solo AST

## Summary
- 1420 nodes · 3768 edges · 28 communities detected
- Extraction: 75% EXTRACTED · 25% INFERRED · 0% AMBIGUOUS · INFERRED: 935 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Promo APK|Promo APK]]
- [[_COMMUNITY_Perfil del presidente|Perfil del presidente]]
- [[_COMMUNITY_Splash de arranque|Splash de arranque]]
- [[_COMMUNITY_Bracket|Bracket]]
- [[_COMMUNITY_Sonido|Sonido]]
- [[_COMMUNITY_Partidos|Partidos]]
- [[_COMMUNITY_Calendario|Calendario]]
- [[_COMMUNITY_Navegacion|Navegacion]]
- [[_COMMUNITY_Config Cloudinary (ejemplo)|Config Cloudinary (ejemplo)]]
- [[_COMMUNITY_Equipos|Equipos]]
- [[_COMMUNITY_pes5-yunacoins.js y yunacoins-rules.js|pes5-yunacoins.js y yunacoins-rules.js]]
- [[_COMMUNITY_Capa de datos|Capa de datos]]
- [[_COMMUNITY_Delegacion de eventos|Delegacion de eventos]]
- [[_COMMUNITY_Config Firebase (ejemplo)|Config Firebase (ejemplo)]]
- [[_COMMUNITY_Config Firebase|Config Firebase]]
- [[_COMMUNITY_Historial y H2H|Historial y H2H]]
- [[_COMMUNITY_Partido en vivo|Partido en vivo]]
- [[_COMMUNITY_mejoras-page.js|mejoras-page.js]]
- [[_COMMUNITY_pes5-tool.js|pes5-tool.js]]
- [[_COMMUNITY_Palmares (Sala de Trofeos 3D)|Palmares (Sala de Trofeos 3D)]]
- [[_COMMUNITY_pes5-bloqueo.js|pes5-bloqueo.js]]
- [[_COMMUNITY_pes5-clubes.js|pes5-clubes.js]]
- [[_COMMUNITY_pes5-crypt.js|pes5-crypt.js]]
- [[_COMMUNITY_pes5-editor.js|pes5-editor.js]]
- [[_COMMUNITY_pes5-save.js|pes5-save.js]]
- [[_COMMUNITY_Ajustes y arranque y Push|Ajustes y arranque y Push]]
- [[_COMMUNITY_Sorteo en vivo|Sorteo en vivo]]
- [[_COMMUNITY_Estado global|Estado global]]

## God Nodes (most connected - your core abstractions)
1. `dbGetAll()` - 131 edges
2. `showToast()` - 99 edges
3. `escHtml()` - 91 edges
4. `dbGet()` - 76 edges
5. `dbErrorMsg()` - 34 edges
6. `dbPut()` - 32 edges
7. `showConfirm()` - 32 edges
8. `renderAdminPage()` - 22 edges
9. `activeBombo()` - 21 edges
10. `currentPlayer()` - 20 edges

## Surprising Connections (you probably didn't know these)
- `deleteBracketMatch()` --calls--> `showConfirm()`  [INFERRED]
  D:\Desktop\tsc.web-tope\tsc-src\js\bracket.js → D:\Desktop\tsc.web-tope\tsc-src\js\ui-utils.js
- `_calInitHeroCountdown()` --calls--> `countdown()`  [INFERRED]
  D:\Desktop\tsc.web-tope\tsc-src\js\calendar.js → D:\Desktop\tsc.web-tope\tsc-src\js\motion.js
- `getForSeason()` --calls--> `resolveTeamData()`  [INFERRED]
  D:\Desktop\tsc.web-tope\tsc-src\js\db.js → D:\Desktop\tsc.web-tope\tsc-src\js\standings.js
- `_htStatHeadCell()` --calls--> `escHtml()`  [INFERRED]
  D:\Desktop\tsc.web-tope\tsc-src\js\history.js → D:\Desktop\tsc.web-tope\tsc-src\js\sanitize.js
- `loadDraft()` --calls--> `aplicarCambiosAlJugador()`  [INFERRED]
  D:\Desktop\tsc.web-tope\tsc-src\js\mejoras-page.js → D:\Desktop\tsc.web-tope\tsc-src\js\pes5-plantilla.js

## Communities

### Community 17 - "Promo APK"
Cohesion: 0.36
Nodes (9): _apkIsNativeApp(), _apkShouldOffer(), _apkAlreadyDownloaded(), _apkClosedRecently(), openApkPromo(), _apkHideOverlay(), closeApkPromo(), tscApkDownloadClick() (+1 more)

### Community 8 - "Perfil del presidente"
Cohesion: 0.05
Nodes (62): _usersCol(), _injectAuthModal(), openAuthModal(), toggleAuthMode(), _renderAuthModalMode(), authForgotPassword(), authSubmit(), _authErrorMsg() (+54 more)

### Community 19 - "Splash de arranque"
Cohesion: 0.4
Nodes (0): 

### Community 1 - "Bracket"
Cohesion: 0.03
Nodes (123): getWinner(), teamLogoHtml(), _getAudioCtx(), _fwSoundOff(), _soundRocketLaunch(), _soundExplosion(), hexToRgb(), rgbStr() (+115 more)

### Community 11 - "Sonido"
Cohesion: 0.08
Nodes (38): resume(), liveRadarStart(), _palmAudio(), _palmSoundOff(), _palmApplyVol(), playPalmZoom(), playPalmZoomOut(), _PalmSmoke (+30 more)

### Community 0 - "Partidos"
Cohesion: 0.03
Nodes (136): _coinsRun(), _coinsSeasonLocked(), _coinsAmount(), renderAdmCoins(), renderCoinsTable(), filterCoinsTable(), updateCoinsPreview(), saveCoinsTransaction() (+128 more)

### Community 14 - "Calendario"
Cohesion: 0.11
Nodes (34): _calFormatDay(), _calTodayStr(), _calViewerTodayStr(), _calMatchInstant(), _calMatchTimeLocal(), _calLocalDateStr(), _calJornadaViewerDate(), _calLogo() (+26 more)

### Community 5 - "Navegacion"
Cohesion: 0.05
Nodes (77): _calCenterAnchorScroll(), _calHeroGoH2H(), _calHeroGoComp(), _pubSwitchHistoryView(), liveStop(), liveSubscribe(), liveRadarStop(), liveRadarProximity() (+69 more)

### Community 20 - "Config Cloudinary (ejemplo)"
Cohesion: 1.0
Nodes (2): cloudReady(), uploadImageToCloud()

### Community 9 - "Equipos"
Cohesion: 0.05
Nodes (50): cloudReady(), uploadImageToCloud(), resize(), frame(), wake(), stop(), setVariant(), getVariant() (+42 more)

### Community 12 - "pes5-yunacoins.js y yunacoins-rules.js"
Cohesion: 0.08
Nodes (46): openColorPicker(), _compPickColor(), R(), esc(), ahora(), haceTexto(), emailActual(), leerSync() (+38 more)

### Community 13 - "Capa de datos"
Cohesion: 0.09
Nodes (43): _dataApplyImport(), _dataRollback(), _isFS(), _assertWritable(), _archNative(), _archFreeze(), _archFetchJSON(), _archLoad() (+35 more)

### Community 16 - "Delegacion de eventos"
Cohesion: 0.2
Nodes (6): _onTokens(), _onParse(), _onIsNative(), _onEventFor(), _onResolve(), _onRun()

### Community 21 - "Config Firebase (ejemplo)"
Cohesion: 1.0
Nodes (0): 

### Community 22 - "Config Firebase"
Cohesion: 1.0
Nodes (0): 

### Community 7 - "Historial y H2H"
Cohesion: 0.06
Nodes (71): _histNorm(), _histResolveExactTeam(), _histResolveTeam(), computeResultado(), loadStaticHistory(), seedHistoryIfEmpty(), appendOrUpdateHistory(), historyRecordFor() (+63 more)

### Community 15 - "Partido en vivo"
Cohesion: 0.17
Nodes (22): _liveMustHaveWinner(), _liveCanEdit(), _lmEnqueue(), _lmLiveDoc(), _findOtherLiveMatch(), _blockIfOtherLive(), _lmStart(), startLiveGroupMatch() (+14 more)

### Community 2 - "mejoras-page.js"
Cohesion: 0.04
Nodes (135): jsq(), openModal(), closeModal(), _syncScrollLock(), showToast(), renderAuthUI(), puedeMandarPedido(), applyTheme() (+127 more)

### Community 4 - "pes5-tool.js"
Cohesion: 0.04
Nodes (122): cargarReglasFirestore(), cargarTopeExtraEquipo(), recalcularPresupuestoReal(), _hayAplicadoSinPublicar(), jugadorDesdePlantillaReal(), jugadorParaEditor(), plantillaParaEditor(), registroDeId() (+114 more)

### Community 3 - "Palmares (Sala de Trofeos 3D)"
Cohesion: 0.03
Nodes (120): loadPalmaresComps(), getTrophyStyles(), _uid(), trophyClassica(), trophyImperial(), trophyKonami(), trophyOrejona(), trophySobria() (+112 more)

### Community 23 - "pes5-bloqueo.js"
Cohesion: 1.0
Nodes (0): 

### Community 18 - "pes5-clubes.js"
Cohesion: 0.62
Nodes (6): activos(), vinculado(), duenosDeClub(), otroEquipoConClub(), repetidoDe(), opcionesClub()

### Community 24 - "pes5-crypt.js"
Cohesion: 1.0
Nodes (0): 

### Community 25 - "pes5-editor.js"
Cohesion: 1.0
Nodes (0): 

### Community 26 - "pes5-save.js"
Cohesion: 1.0
Nodes (0): 

### Community 10 - "Ajustes y arranque y Push"
Cohesion: 0.06
Nodes (50): _plugin(), isEnabled(), _clearToken(), _setPendingTokenRemoval(), _clearPendingTokenRemoval(), _pushDocRef(), _currentTimezone(), _syncTokenToFirestore() (+42 more)

### Community 6 - "Sorteo en vivo"
Cohesion: 0.07
Nodes (70): newBomboId(), newBombo(), emptyState(), _journalCapturePhase(), effectiveDrawnIds(), ensureBC(), broadcast(), onBroadcast() (+62 more)

### Community 27 - "Estado global"
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

- **Why does `dbGetAll()` connect `Partidos` to `Bracket`, `mejoras-page.js`, `Palmares (Sala de Trofeos 3D)`, `pes5-tool.js`, `Navegacion`, `Sorteo en vivo`, `Historial y H2H`, `Equipos`, `Ajustes y arranque y Push`, `pes5-yunacoins.js y yunacoins-rules.js`, `Capa de datos`, `Calendario`, `Partido en vivo`?**
  _High betweenness centrality (0.214) - this node is a cross-community bridge._
- **Why does `escHtml()` connect `Bracket` to `Partidos`, `mejoras-page.js`, `Palmares (Sala de Trofeos 3D)`, `pes5-tool.js`, `Navegacion`, `Sorteo en vivo`, `Historial y H2H`, `Perfil del presidente`, `Equipos`, `Ajustes y arranque y Push`, `pes5-yunacoins.js y yunacoins-rules.js`, `Calendario`?**
  _High betweenness centrality (0.205) - this node is a cross-community bridge._
- **Why does `showToast()` connect `Partidos` to `Bracket`, `Palmares (Sala de Trofeos 3D)`, `pes5-tool.js`, `Navegacion`, `Sorteo en vivo`, `Historial y H2H`, `Perfil del presidente`, `Equipos`, `Ajustes y arranque y Push`, `Sonido`, `Capa de datos`, `Calendario`, `Partido en vivo`?**
  _High betweenness centrality (0.165) - this node is a cross-community bridge._
- **Are the 128 inferred relationships involving `dbGetAll()` (e.g. with `renderBracket()` and `getStandingsForPhase()`) actually correct?**
  _`dbGetAll()` has 128 INFERRED edges - model-reasoned connections that need verification._
- **Are the 95 inferred relationships involving `showToast()` (e.g. with `authForgotPassword()` and `authSignOut()`) actually correct?**
  _`showToast()` has 95 INFERRED edges - model-reasoned connections that need verification._
- **Are the 89 inferred relationships involving `escHtml()` (e.g. with `authForgotPassword()` and `teamLogoHtml()`) actually correct?**
  _`escHtml()` has 89 INFERRED edges - model-reasoned connections that need verification._
- **Are the 73 inferred relationships involving `dbGet()` (e.g. with `renderBracket()` and `getStandingsForPhase()`) actually correct?**
  _`dbGet()` has 73 INFERRED edges - model-reasoned connections that need verification._