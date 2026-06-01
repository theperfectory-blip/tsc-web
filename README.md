# TSC Web — Copa Suscriptores

Aplicación de gestión de torneos de fútbol (TSC · Copa Suscriptores).
Frontend estático (HTML/CSS/JS vanilla). Almacenamiento actual: **IndexedDB** en el navegador.

## Estructura

```
tsc-src/          # ⭐ Fuente principal de la app (modular)
  ├── index.html
  ├── css/
  ├── js/         # state, db, nav, competitions, phases, standings, matches,
  │               # bracket, playoff, teams, coins, seasons, data, public, palmares...
  ├── data/
  └── graphify-out/  # Grafo de conocimiento del código (GRAPH_REPORT.md)

yunaweb/          # Variante/experimentos de la sala de trofeos (palmares)
sorteo/           # Módulo de sorteo (lottery)
*.xlsx, *.csv     # Datos históricos y seed (equipos, encuentros)
```

## Correr localmente

```bash
cd tsc-src
npx serve .
# abrir http://localhost:3000
```

## Roadmap

- [ ] Migración a backend **Firebase** (Firestore + Auth + FCM)
- [ ] Login multi-rol: público (lectura) · presidente (su equipo) · admin (total)
- [ ] Notificaciones push "partido en vivo"
- [ ] Porteo a APK Android (orientación landscape)

Ver `CLAUDE.md` y `CODEMAP_TSC_Admin_v1_9.md` para detalle de arquitectura.
