# Plan de migración a Firebase — TSC Web

> Objetivo: pasar de IndexedDB (datos aislados por dispositivo) a un backend
> compartido en la nube con **login multi-rol**, **datos en tiempo real** y
> **notificaciones push "partido en vivo"**, manteniendo el frontend estático
> y porteándolo luego a **APK Android**.

Stack elegido: **Firebase** (Firestore + Auth + FCM + Hosting) — gratis (plan Spark)
para el volumen de este proyecto. Ver sección *Costos*.

---

## 📍 Estado actual (actualizado)

- ✅ **Fase 0** completa: proyecto `tsc-web-yuna` creado (plan Spark)
  - App web registrada · config real en `tsc-src/js/firebase-config.js`
  - Firestore creado (ubicación São Paulo/Santiago, **modo prueba** temporal)
  - Auth **Email/Password** habilitado
- ✅ **Fase 1a** completa: SDK compat v12.14.0 cableado en `index.html`
- ✅ **Fase 1b + 2** completas: `db.js` dual-mode (Firestore/IndexedDB), datos
  sembrados en la nube y verificados (60 equipos, 30 palmarés, contadores)
- ✅ **Fase 3** completa: login multi-rol (Firebase Auth + colección `users`).
  Primer admin: `the.perfectory@gmail.com` (role admin + teamId 61 FK TUPADRE)
- ✅ **Fase 4** completa: reglas de seguridad por rol **desplegadas y probadas**
  (lectura pública, escritura solo admin, presidente edita su equipo,
  auto-registro seguro sin posibilidad de auto-ascenso). Ya NO en modo prueba.
- ✅ **Fases 5–6A/6B** completas: usuarios vinculados, tiempo real onSnapshot, partidos en vivo (grupos/bracket/playoff), audio, Cloudinary logos, calendario con cronograma admin + línea de metro pública en tiempo real.
- ⏳ **Siguiente — Fase 6 (resto)**: transmisión en vivo (embed YouTube + toggle admin + notificaciones).
- ⏭️ **Fase 7**: Rediseño visual "motion site".
- ⏭️ **Fase 8**: APK Android (Capacitor) + FCM push nativo para presidentes.

---

## 0. La idea clave: `db.js` es el único punto de cambio

Toda la app pasa por 6 funciones (`tsc-src/js/db.js`). Si reimplemento esas
funciones sobre Firestore **manteniendo las mismas firmas**, el resto de la app
(competiciones, fases, partidos, brackets, palmarés…) sigue funcionando sin
cambios. Ya son `async/await`, así que ni eso hay que tocar.

| Función actual | Contrato a preservar | Equivalente Firestore |
|---|---|---|
| `initDB()` | Promise; deja `db` listo | init app + offline persistence |
| `dbGetAll(store, filter)` | array; `filter` = predicado JS | `getDocs(collection)` + `.filter()` |
| `dbGet(store, id)` | 1 registro por id entero | `getDoc(doc(store, String(id)))` |
| `dbAdd(store, data)` | **devuelve nuevo id entero** | contador + `setDoc` |
| `dbPut(store, data)` | upsert por `data.id` | `setDoc(doc(store, String(id)))` |
| `dbDelete(store, id)` | void | `deleteDoc(...)` |
| `getForSeason(store)` | filtro por `STATE.season` | igual (filtro cliente) |

### El detalle crítico: IDs enteros autoincrementales

IndexedDB usa `keyPath:'id', autoIncrement:true`. Toda la app referencia
registros por **id entero** (un partido tiene `phaseId`, una fase tiene `compId`…).
Firestore usa IDs string. Si dejara que Firestore genere IDs, **se rompen todas
las referencias cruzadas**.

**Solución:** preservar el id entero. Doc ID = `String(id)`, y un documento
contador por colección emula el autoincrement:

```js
// Asigna el siguiente id entero de forma atómica (emula autoIncrement)
async function nextId(coll){
  const ref = doc(db, '_counters', coll);
  return runTransaction(db, async tx => {
    const snap = await tx.get(ref);
    const next = (snap.exists() ? snap.data().value : 0) + 1;
    tx.set(ref, { value: next }, { merge: true });
    return next;
  });
}
```

### `db.js` reescrito (borrador drop-in)

```js
import { initializeApp } from 'firebase/app';
import {
  initializeFirestore, persistentLocalCache,
  collection, doc, getDoc, getDocs, setDoc, deleteDoc, runTransaction
} from 'firebase/firestore';

let db;
function initDB(){
  const app = initializeApp(FIREBASE_CONFIG);     // config pública del proyecto
  db = initializeFirestore(app, { localCache: persistentLocalCache() }); // offline
  return Promise.resolve();
}

async function dbGetAll(store, filter){
  const snap = await getDocs(collection(db, store));
  let result = snap.docs.map(d => d.data());
  if (filter) result = result.filter(filter);      // mismo predicado de hoy
  return result;
}
async function dbGet(store, id){
  const snap = await getDoc(doc(db, store, String(id)));
  return snap.exists() ? snap.data() : undefined;
}
async function dbAdd(store, data){
  const id = await nextId(store);
  await setDoc(doc(db, store, String(id)), { ...data, id });
  return id;                                        // devuelve id entero como antes
}
async function dbPut(store, data){
  await setDoc(doc(db, store, String(data.id)), { ...data });
  return data.id;
}
async function dbDelete(store, id){
  await deleteDoc(doc(db, store, String(id)));
}
function getForSeason(store){
  return dbGetAll(store, r => r.season === STATE.season || !r.season);
}
```

> Nota: `dbPut` asume `data.id` presente (cierto en todo el código actual; los
> registros nuevos van por `dbAdd`). Bonus: la persistencia offline de Firestore
> deja la app **funcionando sin internet** y sincronizando al reconectar —
> mejor que hoy.

Optimización futura (no bloqueante): los `filter` "calientes" (ej. `getForSeason`)
se pueden pasar a queries server-side `where('season','==',n)`. Con el volumen
actual (decenas de registros) traer todo + filtrar en cliente es perfectamente
válido.

---

## 1. Modelo de datos en Firestore

Cada *store* de IndexedDB → una *colección*. Mismo contenido, doc ID = `String(id)`.

```
seasons/        teams/         competitions/   phases/
matches/        coins/         history/        settings/
matchHistory/   sorteo/        palmares/       palmares-comps/
_counters/      ← {value:int} por colección (autoincrement)
users/          ← NUEVO: cuentas + rol + equipo vinculado
```

### Colección `users` (nueva)
```js
users/{uid} = {
  uid, email, displayName, photoURL,
  role: 'admin' | 'president',     // 'public' = sin cuenta (no logueado)
  teamId: 12 | null,               // entero, vincula al equipo (lo asigna admin)
  fcmTokens: ['...'],              // tokens de dispositivo para push
  createdAt, updatedAt
}
```

---

## 2. Autenticación y roles

Se elimina el toggle Público/Admin. Nuevo flujo:

```
público     → anónimo, SOLO lectura (no requiere login; vista por defecto)
presidente  → login email/contraseña, ligado a un teamId, edita SU equipo
admin       → login, control total + asigna usuario↔equipo + crea cuentas
```

- **Firebase Auth** (email/password).
- El **rol y el teamId** viven en `users/{uid}` y los asigna el admin (un
  presidente NO puede auto-asignarse rol ni equipo — reforzado por reglas).
- Pestaña **Perfil**: el usuario edita lo básico (displayName, foto, contraseña).
- Pantalla **Admin → Usuarios**: crear presidentes, vincularlos a un equipo,
  resetear, revocar.

---

## 3. Reglas de seguridad (borrador a refinar)

⚠️ *Footgun de Firestore:* si dos reglas hacen match en la misma ruta, el acceso
se concede si **cualquiera** lo permite. Por eso **NO** uso un wildcard genérico
`/{coll}/{doc}` con `read:true` (expondría `users`). Enumero colecciones públicas.

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function signedIn(){ return request.auth != null; }
    function u(){ return get(/databases/$(database)/documents/users/$(request.auth.uid)).data; }
    function isAdmin(){ return signedIn() && u().role == 'admin'; }
    function isPresident(){ return signedIn() && u().role == 'president'; }

    // Colecciones de torneo: lectura pública, escritura solo admin
    match /{coll}/{docId}
      where coll in ['seasons','competitions','phases','matches','coins',
                     'history','settings','matchHistory','sorteo',
                     'palmares','palmares-comps'] {
      allow read: if true;
      allow write: if isAdmin();
    }

    // Equipos: el presidente edita SU equipo
    match /teams/{teamId} {
      allow read: if true;
      allow update: if isAdmin()
                    || (isPresident() && string(u().teamId) == teamId);
      allow create, delete: if isAdmin();
    }

    // Perfil propio (sin poder cambiarse rol/equipo)
    match /users/{uid} {
      allow read:   if isAdmin() || (signedIn() && request.auth.uid == uid);
      allow update: if isAdmin()
                    || (request.auth.uid == uid
                        && !request.resource.data.diff(resource.data)
                              .affectedKeys().hasAny(['role','teamId']));
      allow create, delete: if isAdmin();
    }

    // Contadores: nadie los toca directo (solo vía transacciones autenticadas)
    match /_counters/{c} { allow read, write: if isAdmin() || isPresident(); }
  }
}
```

> A decidir: ¿qué puede editar exactamente un presidente? Propuesta inicial:
> datos de su equipo (logo, colores, nombre, plantel). **Los resultados de
> partidos quedan solo-admin** (un presi no debe editar marcadores). Confirmar.

---

## 4. Notificaciones push "en vivo" (FCM)

Recibir push es gratis. El único matiz es *desde dónde se dispara* de forma
segura (la clave de servidor no puede vivir en el cliente).

```
Admin marca partido "en vivo"  (escribe match.live = true)
        │
        ├── Opción A: Cloud Function (onUpdate de matches) → FCM Admin SDK
        │            requiere plan Blaze (tarjeta, pero $0 a esta escala)
        │
        └── Opción B: el cliente admin llama a un Worker gratis
                     (Vercel / Cloudflare) que guarda la server key y manda FCM
                     → $0, sin tarjeta. Recomendado para arrancar.

Destino: tokens en users/{uid}.fcmTokens del presidente del equipo que juega.
```

---

## 5. Tiempo real "en vivo"

La vista pública / del presidente se suscribe con `onSnapshot` a los partidos
`live == true` (o al próximo partido de su equipo). Cuando el admin actualiza el
marcador, **todos los teléfonos conectados lo ven al instante**, sin recargar.
Esto es exactamente para lo que Firestore fue diseñado.

---

## 6. Migración de datos (una sola vez)

Ya existe `exportFullDB()` en `tsc-src/js/data.js` que vuelca todos los stores a
JSON. Pipeline:

```
1. exportFullDB()  → tsc_backup.json (datos actuales de IndexedDB)
2. Script de seed (Node con firebase-admin, o navegador con el SDK):
   - por cada store → escribe cada registro en su colección, doc id = id
   - inicializa _counters/{store}.value = max(id) del store
3. Verificar conteos colección por colección
```

---

## 7. Roadmap por fases

| Fase | Qué | Riesgo | Esfuerzo aprox. |
|---|---|---|---|
| **0** | Crear proyecto Firebase, instalar SDK, `FIREBASE_CONFIG`, init | Bajo | 0.5 día |
| **1** | Reescribir `db.js` → Firestore (drop-in). App igual pero en la nube | Medio | 1–2 días |
| **2** | Migrar datos actuales (export → seed Firestore) | Bajo | 0.5 día |
| **3** | Auth: login, `users`, quitar toggle Público/Admin, rol+teamId | Medio | 2–3 días |
| **4** | Reglas de seguridad por rol + pruebas | Medio-alto | 1–2 días |
| **5** | Pestaña Perfil + Admin→Usuarios (vincular usuario↔equipo) | Medio | 1–2 días |
| **6** | Tiempo real (`onSnapshot`) + transmisión en vivo (embed YouTube, toggle admin) | Medio | 1–2 días |
| **7** | Rediseño visual completo ("motion site") — nueva identidad, animaciones, UX premium | Alto | 3–5 días |
| **8** | APK Android (Capacitor) + FCM push nativo + lock landscape + Web App Manifest | Medio | 2–3 días |

> Las fases 0–2 son la columna vertebral y se pueden hacer **sin tocar la UI**.
> A partir de la fase 1 ya tienes datos compartidos entre dispositivos.
>
> **Nota Fase 8:** las notificaciones push a presidentes ("tu equipo juega hoy" / "próximo partido")
> se implementan junto al APK con FCM nativo. No se implementan antes (PWA push descartada,
> Telegram/email descartados) — el APK lo resuelve de una manera superior.

---

## 8. Costos (confirmación)

| Pieza | Plan | Costo |
|---|---|---|
| Firestore + Auth + Hosting | Spark (gratis) | **$0** (volumen muy por debajo de límites) |
| FCM (push) | — | **$0** ilimitado |
| Disparo de push | Worker Vercel/Cloudflare free | **$0** sin tarjeta |
| APK (build + sideload) | Capacitor + distribución directa | **$0** |
| *(opcional)* Google Play | pago único | $25 una vez |

---

## 9. Decisiones abiertas (a confirmar antes de Fase 3–4)

1. ¿Qué edita exactamente un **presidente**? (propuesta: solo su equipo; marcadores = admin)
2. ¿Push para **Opción A** (Cloud Function + tarjeta) u **Opción B** (worker gratis)?
3. ¿Login solo email/contraseña, o también Google?
4. ¿Los presidentes se **auto-registran** (y el admin aprueba) o **el admin los crea**?
5. ¿Capacitor (recomendado, acceso nativo a FCM) o TWA/Bubblewrap para el APK?

---

*Documento vivo. Actualizar a medida que avanzan las fases.*
