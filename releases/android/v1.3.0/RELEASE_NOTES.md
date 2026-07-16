# TEAM SUBS CUP — Android v1.3.0

**Fecha:** 2026-07-16
**Archivo:** `TEAM-SUBS-CUP-v1.3.0-release.apk`
**SHA-256:** `71afa9572869c06504c9e42d656e5bb9bc39fae3a2a0e37273b57ec025d62e82`
**Requisito mínimo:** Android 7.0 (API 24) o superior

## Qué cambió desde v1.2.0

- **Botón "Generar fechas" en Partidos → grupos** — genera automáticamente el calendario round-robin (ida, o ida y vuelta) de un grupo, respetando el "recorrido de Luis" (un partido por fecha, sin repetir rival salvo que sea matemáticamente imposible). Si el grupo ya tiene partidos jugados, el botón queda bloqueado para no pisar resultados reales; si el armado es imposible para ese tamaño de grupo, lo avisa explícitamente en vez de fallar en silencio.
- **Sala de trofeos · Palmarés** — ajuste de escala y posición de cada copa 3D dentro de la sala, y los campeones ahora se pueden reordenar por importancia arrastrando (drag & drop) en vez de con flechas; el desempate al listar clubes campeones usa esa misma jerarquía de copas en lugar de orden alfabético.
- **Historial · Mano a mano** — las filas de enfrentamientos directos ahora muestran también en qué competición se jugó cada partido.
- **Iconos SVG en vez de emojis** — se reemplazaron los emojis renderizados en la interfaz por iconos SVG estilo Lucide, siguiendo la convención visual del resto de la app.
- **Aviso "en vivo" más preciso** — cuando hay un partido en directo, el aviso ya no aparece también en otras fases de la misma competición donde no corresponde.

## Cómo instalar

1. Descargá `TEAM-SUBS-CUP-v1.3.0-release.apk` desde el link que te compartieron (Drive/WhatsApp).
2. Al abrirlo, Android puede pedirte habilitar **"Instalar apps de orígenes desconocidos"** para esa fuente — aceptalo, es normal para apps que no vienen de Play Store.
3. Es posible que **Google Play Protect** muestre un aviso de "App no verificada". Si confiás en quien te mandó el archivo, tocá **"Instalar de todos modos"**.
4. **Instalá directamente encima de la versión anterior — NO la desinstales primero** (desinstalar borra la sesión y los datos locales del teléfono).

## Notificaciones

Sin cambios respecto a v1.2.0 — el backend de envío sigue en desarrollo en una rama separada, todavía no está en esta build.

## Si algo falla — cómo reportarlo

Mandá: captura/video del problema, modelo de celular y versión de Android, hora aproximada, en qué sección estabas, y qué hiciste justo antes.
