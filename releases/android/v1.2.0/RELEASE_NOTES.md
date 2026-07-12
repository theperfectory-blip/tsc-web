# TEAM SUBS CUP — Android v1.2.0

**Fecha:** 2026-07-11
**Archivo:** `TEAM-SUBS-CUP-v1.2.0-release.apk`
**SHA-256:** `671ca9716cdc40ead3693fccc854eb793bedbc1dd9076c3d1e9d6eb31a7a76ca`
**Requisito mínimo:** Android 7.0 (API 24) o superior

## Qué cambió desde v1.1.0

- **Barra de navegación del sistema legible en tema claro** — en teléfonos con navegación de 3 botones (Android 15) la franja inferior quedaba oscura con los botones casi invisibles en tema claro; ahora la barra sigue el color del tema (clara con botones oscuros / oscura con botones claros).
- **Numeración de secciones unificada** — las secciones "Competiciones" (02) y "Partidos/Historial" (06) ahora muestran su número y su título con el mismo tamaño que el resto, también en móvil.
- **Tabla histórica · Rendimiento** — al expandir "Rendimiento" ya no se parte en dos filas: ahora es una sola fila por equipo con el nombre fijo (sticky) y las estadísticas en scroll horizontal, igual que la tabla de posiciones.
- **Actualización al volver de segundo plano** — si la app queda en segundo plano un tiempo largo, al volver a abrirla la sección que estás viendo se refresca contra el servidor (antes podía quedar mostrando datos viejos si la conexión en tiempo real se había suspendido). La tabla histórica sigue actualizándose solo al finalizar una temporada.

## Cómo instalar

1. Descargá `TEAM-SUBS-CUP-v1.2.0-release.apk` desde el link que te compartieron (Drive/WhatsApp).
2. Al abrirlo, Android puede pedirte habilitar **"Instalar apps de orígenes desconocidos"** para esa fuente — aceptalo, es normal para apps que no vienen de Play Store.
3. Es posible que **Google Play Protect** muestre un aviso de "App no verificada". Si confiás en quien te mandó el archivo, tocá **"Instalar de todos modos"**.
4. **Instalá directamente encima de la versión anterior — NO la desinstales primero** (desinstalar borra la sesión y los datos locales del teléfono).

## Notificaciones

El toggle de "Notificaciones" en Configuración registra el dispositivo, pero **todavía no llegan avisos reales** — el envío del lado del servidor es de una fase posterior.

## Si algo falla — cómo reportarlo

Mandá: captura/video del problema, modelo de celular y versión de Android, hora aproximada, en qué sección estabas, y qué hiciste justo antes.
