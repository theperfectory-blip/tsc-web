# Seguridad en TSC Web

Este documento describe prácticas de seguridad en la aplicación.

## Secretos y credenciales

**NUNCA** subas a GitHub:
- `tsc-src/js/firebase-config.js` (credenciales Firebase)
- `tsc-src/js/cloudinary.js` (credenciales Cloudinary)
- Cualquier archivo `.json` de servicio (`*-firebase-adminsdk-*.json`)
- Contraseñas o tokens de acceso

Estos archivos están en `.gitignore`. Si accidentalmente los subes, [rota inmediatamente las credenciales](https://firebase.google.com/docs/projects/iam/service-accounts#delete_a_service_account).

## Autenticación

- **Firebase Auth** maneja login/password seguro (salting, hashing servidor)
- **Multi-factor**: el usuario puede activar 2FA en su cuenta Google/email
- **Recovery email**: Firebase envía código de recuperación seguro
- **Password reset**: token de uso único, expira en 1 hora

## Reglas Firestore

Las reglas de seguridad (`firebase/firestore.rules`) implementan:

```rules
// Públicos: solo lectura (equipos, palmarés, historial)
match /teams/{doc} {
  allow read: if true;
  allow write: if isAdmin();
}

// Presidentes: editan su equipo
match /teams/{teamId} {
  allow write: if isAdmin() || (isUser() && resource.data.teamId == user.uid);
}

// Admin: acceso total
match /{document=**} {
  allow read, write: if isAdmin();
}
```

**Verificación:** Prueba con cuentas no-admin en DevTools:
```javascript
// Debería fallar
await db.collection('competitions').add({ name: 'Hack' });
```

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

**Riesgo**: usuario malintencionado agrega `<script>` en nombre de equipo.

**Mitigación**:
- HTML se renderiza con `textContent` (no `innerHTML`), excepto modales que usan `innerHTML` con HTML seguro generado internamente
- Validación en servidor (Firestore rules) restringe tipos de datos
- Content Security Policy (CSP) podría agregarse en `firebase.json`

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

## Desarrollo seguro

### Checklist antes de push

- [ ] No commiteaste `firebase-config.js` o `cloudinary.js`
- [ ] No escribiste credenciales en código (usan `FIREBASE_CONFIG`)
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

1. **Dependencias**: no hay `npm` (vanilla JS), pero si lo hay, ejecuta `npm audit`
2. **Código**: busca `eval()`, `innerHTML`, patrones inseguros
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

**Última revisión**: 2026-06-04
