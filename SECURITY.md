# Seguridad en TSC Web

Este documento describe prácticas de seguridad en la aplicación.

## Secretos y credenciales

**`tsc-src/js/firebase-config.js` y `tsc-src/js/cloudinary.js` SÍ están commiteados en el
repo, a propósito.** No son secretos: `firebase-config.js` es la config pública del SDK web de
Firebase (apiKey, projectId, etc.) — Firebase la envía a cualquier navegador que cargue la
página, ocultarla no protege nada; la seguridad real la dan las reglas de Firestore/Storage de
abajo. `cloudinary.js` solo tiene `cloudName` + un *unsigned upload preset* (sin `api_secret`),
diseñado para vivir en el cliente. Los `.example.js` junto a cada uno son la plantilla para que
un fork configure su propio proyecto sin pisar los valores reales.

Lo que **NUNCA** debe llegar al repo (si pasa, [rota las credenciales inmediatamente](https://firebase.google.com/docs/projects/iam/service-accounts#delete_a_service_account)):
- Cualquier archivo `.json` de service account (`*serviceAccount*.json`, `*-firebase-adminsdk-*.json`) — estos SÍ son credenciales con privilegios de servidor, a diferencia de la config web de arriba
- `android/app/keystore.properties`, `*.jks`, `*.keystore` (firma de la app Android — ver "Firma de la APK Android" más abajo)
- `.env`, `.env.*`
- Contraseñas o tokens de acceso en texto plano

Todos estos SÍ están en `.gitignore` y, a diferencia de `firebase-config.js`/`cloudinary.js`,
nunca se commitearon — verificado en todo el historial de todas las ramas (`git log --all -G`),
no solo en el estado actual.

## Autenticación

- **Firebase Auth** maneja login/password seguro (salting, hashing servidor)
- **Multi-factor**: el usuario puede activar 2FA en su cuenta Google/email
- **Recovery email**: Firebase envía código de recuperación seguro
- **Password reset**: token de uso único, expira en 1 hora

## Reglas Firestore

Las reglas reales viven en `firebase/firestore.rules` (este bloque es un resumen, no una
copia — leer el archivo para el detalle exacto):

- **Datos del torneo** (`seasons`, `competitions`, `phases`, `matches`, `coins`, `history`,
  `palmares`, etc.): lectura pública, escritura solo `role == 'admin'` (verificado leyendo
  `users/{uid}` en el servidor vía `get()`, nunca un flag que mande el cliente).
- **`teams/{teamId}`**: lectura pública; un presidente puede actualizar **solo su propio**
  equipo (`me().teamId == teamId`) y **solo** los campos `name`/`logo` (allowlist explícita de
  campos vía `diff().affectedKeys().hasOnly([...])`, no blocklist) — y solo si no tiene
  `lockEdits`. Crear/borrar equipos: solo admin.
- **`users/{uid}`**: el propio usuario lee/edita su perfil; un usuario puede auto-registrarse
  pero **forzado** a `role:'president'` + `teamId:null` (no puede auto-ascenderse a admin), y
  su `update` tiene allowlist de campos (nombre, foto, timezone, y los campos de push —
  `fcmTokens`/`pushEnabled`/`pushPlatform` — **nunca** `role` ni `teamId`, esos solo los
  escribe un admin).
- **`notificationRuns`/`notificationEvents`** (backend de push, Fase 8): `allow write: if
  false` — ni siquiera un admin puede escribir desde el cliente. Solo el Admin SDK (Cloud
  Functions, ver más abajo) escribe ahí; esto es lo que hace confiable usar `teamId` como
  identidad en el backend de notificaciones (un usuario no puede auto-asignarse un equipo).

- **Temporadas archivadas** (`archive/seasons`, MS-5.16): solo el admin la escribe, solo puede
  crecer y nadie la borra. Cualquier escritura en `seasons`, `competitions`, `phases`, `matches`,
  `matchHistory`, `coins`, `sorteo`, `sorteoEvents` o `calDayLabels` de una temporada listada
  ahí se rechaza, en el documento nuevo y en el que había.

**Tests:** `cd functions && npm run test:rules` (`rules-teams.js` + `rules-suite.js`, todas
las colecciones con cada rol) y `npm run test:rules:storage`, contra el emulador. El CI
(`rules-tests.yml`) los corre en cada push. Las reglas se despliegan a mano
(`firebase deploy --only firestore:rules,storage`); `node scripts/rules-drift.mjs` compara lo
publicado con el repo.

**Verificación manual:** prueba con cuentas no-admin en DevTools (en el sandbox de
emuladores, nunca en producción):
```javascript
// Debería fallar
await db.collection('competitions').add({ name: 'Hack' });
```

## Reglas Storage

`firebase/storage.rules`: `trophies/**` es lectura pública / escritura bloqueada desde cliente
(las copas 3D las sube el propio proceso de build, no un usuario). `logos/**` es lectura
pública / escritura solo autenticado. Todo lo demás: denegado.

## Backend de notificaciones push (Cloud Functions, Fase 8)

`functions/lib/*` corre con privilegios de Admin SDK, así que las reglas de Firestore de
arriba no aplican a su propio código — la seguridad depende de que cada función verifique el
rol del *caller* contra Firestore, nunca contra un flag que mande el cliente
(`notifyStreamToday.js` lee `users/{uid}.role` en el servidor antes de mandar nada). Quién
**recibe** una notificación se decide por `teamId` (identidad: a qué equipo representa), no por
`role` (autorización: quién puede *disparar* el envío) — mezclar ambos dejó fuera, en su
momento, a un admin que también preside un club (bug real, corregido 2026-07-16). La dedup
(`notificationRuns`) evita reenviar el mismo aviso si se aprieta el botón dos veces.

## Información sensible

La app NO almacena:
- Contraseñas (Firebase Auth las maneja)
- Tokens de sesión (Firebase Auth cookies seguras)
- Datos de tarjeta de crédito (no hay pagos)

Almacena (en Firestore):
- Nombre, email, role de usuarios
- Equipo, estadísticas
- Histórico de partidos (público)

## Ataques comunes

### XSS (Cross-Site Scripting)

**Riesgo**: un presidente escribe HTML o JavaScript en el nombre o el logo de su equipo, o
cualquier usuario en su nombre o foto de perfil, y eso se inserta en la página de otro (por
ejemplo, la del admin).

**Mitigación** (MS-3.1, 3.5, 7.1 y 7.5):
- **Escape obligatorio:** todo `innerHTML` con datos que puede escribir un rol no admin pasa
  por `escHtml` / `escAttr` / `safeImgUrl` de `tsc-src/js/sanitize.js`, el único helper de
  escape (no hay copias locales). `safeImgUrl` solo admite `https:`, rutas `assets/` y
  `data:image/` (nunca `javascript:`); la CSP limita además de qué hosts se cargan imágenes.
- **Content Security Policy en enforce** (header en `firebase.json`, `<meta>` en la APK;
  fuente única `scripts/csp.mjs`): `script-src` solo admite `'self'`, el SDK de Firebase y el
  CDN de SheetJS, **sin `'unsafe-inline'`**. Un `<script>` o un `onclick=` inyectado no corre;
  `img-src` y `connect-src` cortan la exfiltración a hosts ajenos.
- **Sin handlers inline:** los botones usan `data-onclick="fn(…)"`, que despacha
  `js/events.js` sin `eval`: solo llamadas a funciones globales de la app con argumentos
  literales, nunca funciones nativas (`fetch`, `setTimeout`, `location`…). Un `data-on*`
  inyectado no sirve para saltar la CSP.
- **Reglas:** los campos que escribe un no admin tienen allowlist y límites de tipo y tamaño.
- **Verificación:** `node scripts/emu-xss.mjs data|users|page|csp` siembra datos con
  marcadores en el sandbox y comprueba que ningún sink los ejecute.

### CSRF (Cross-Site Request Forgery)

**Riesgo**: sitio malicioso hace cambios en nombre del usuario.

**Mitigación**:
- SPA sin formularios HTML tradicionales
- CORS automático en Firebase (solo origin autorizado)
- Firebase Auth no usa cookies simples (tokens seguros)

### SQL Injection

**No aplica** — Firestore no es SQL.

### Ataques de fuerza bruta

**Riesgo**: attacker intenta adivinar contraseña.

**Mitigación**:
- Firebase Auth limita intentos fallidos (bloquea temporalmente IP)
- Email recovery exige confirmación

## Firma de la APK Android

`android/app/keystore.properties` (passwords del keystore) y el `.jks`/`.keystore` en sí
**nunca** se commitean — ver `docs/android-build.md`. Sin ese archivo, `./gradlew
assembleRelease` igual corre pero el APK sale **sin firmar**, así que su ausencia falla de
forma segura (no silenciosa: un APK sin firmar no se puede compartir como release real). Cada
release firmada en GitHub Releases incluye su SHA-256 en la nota del release para
que quien la instala pueda verificar que no fue alterada en tránsito.

## Desarrollo seguro

### Checklist antes de push

- [ ] No commiteaste `android/app/keystore.properties`, `*.jks`/`*.keystore`, ni ningún
      `*serviceAccount*.json` / `*-firebase-adminsdk-*.json`
- [ ] No escribiste credenciales de servidor en código (la config web de `FIREBASE_CONFIG` no
      cuenta — ver "Secretos y credenciales" arriba)
- [ ] Probaste que reglas Firestore se aplican (user no puede editar otros usuarios)
- [ ] No agregaste `TODO: fix security` sin issue asociado

### Testing de seguridad

```javascript
// ❌ Crea cuenta no-admin
const testUser = { role: 'user', email: 'test@example.com' };
await db.collection('users').doc(testUser.uid).set(testUser);

// ❌ Intenta editar competición ajena
await db.collection('competitions').doc('comp-1').update({ name: 'Hacked' });
// → Error: "Missing or insufficient permissions"

// ✅ Intenta editar su propio equipo
await db.collection('teams').doc(testUser.teamId).update({ name: 'Mi Equipo' });
// → OK
```

## Auditoría

Siempre revisa:

1. **Dependencias**: el frontend no tiene dependencias de npm (vanilla JS); sí las tienen
   `functions/` y las herramientas de la raíz: `npm audit` en cada una
2. **Código**: busca `eval()`, `innerHTML` sin el helper de `sanitize.js`, `on*=` inline o
   `<script>` inline (`node scripts/audit-wiring.mjs` marca handlers fuera de la gramática)
3. **Logs**: Firebase logs en consola, revisa errores de Auth/Firestore
4. **Firestore**: revisa datos públicos (no debería haber datos sensibles)

## Reportar vulnerabilidades

Si encuentras vulnerabilidad:

1. **NO** la publiques en GitHub issues
2. Contacta al propietario privadamente
3. Describe: qué es, cómo reproducir, impacto
4. Espera response antes de divulgar

## Estándares seguidos

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Firebase Security Best Practices](https://firebase.google.com/docs/rules/secure)
- [Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)

---

**Última revisión**: 2026-10-20, cierre del plan de debugging
(`docs/MACRO_SLICE_DEBUGGING.md`, reportes en `docs/reportes/`): escape único, CSP en enforce
sin `'unsafe-inline'`, reglas con tests por rol y temporadas archivadas de solo lectura.

Revisión anterior: 2026-07-16, auditoría completa de las 3 ramas del repo (`main`,
`feature/capacitor-android`, `redesign/dynamic-background`) y de todo el historial de commits
(no solo el árbol actual) antes de hacer el repo público: sin claves privadas, service
accounts, keystores, `.env` ni contraseñas en ningún commit de ninguna rama.
