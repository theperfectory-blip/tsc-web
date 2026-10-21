"""Regenera el reporte de graphify con nombres de dominio (slice 1.5).
Uso (desde tsc-src/): graphify update . && python ../scripts/graphify-label.py
"""
import json, sys
from pathlib import Path
from networkx.readwrite import json_graph as _jg  # noqa: F401
from graphify.build import build_from_json
from graphify.cluster import score_all
from graphify.analyze import god_nodes, surprising_connections, suggest_questions
from graphify.report import generate
from graphify.export import to_json, to_html

# Nombre de dominio por archivo. Cada comunidad toma el de su archivo
# dominante (y el del segundo si pesa al menos un 35 % de la comunidad):
# los números de comunidad cambian con cada `graphify update`, los archivos no.
FILE_NAMES = {
    "matches.js": "Partidos", "livematch.js": "Partido en vivo", "seasons.js": "Temporadas",
    "playoff.js": "Playoff", "palmares.js": "Palmares (Sala de Trofeos 3D)", "sorteo.js": "Sorteo en vivo",
    "history.js": "Historial y H2H", "profile.js": "Perfil del presidente", "auth.js": "Auth y registro",
    "calendar.js": "Calendario", "public.js": "Panel publico", "nav.js": "Navegacion",
    "redesign-shell.js": "Topnav y secciones", "push.js": "Push", "ui-utils.js": "Ajustes y arranque",
    "updater.js": "Actualizador", "teams.js": "Equipos", "motion.js": "Animacion de UI",
    "sounds.js": "Sonido", "bracket.js": "Bracket", "db.js": "Capa de datos", "data.js": "Export / import",
    "public-bracket.js": "Bracket publico", "standings.js": "Tablas de posiciones", "coins.js": "YuNaCoins",
    "users-admin.js": "Usuarios (admin)", "competitions.js": "Competiciones", "fixture-gen.js": "Generador de fechas",
    "events.js": "Delegacion de eventos", "apk-promo.js": "Promo APK", "boot-splash.js": "Splash de arranque",
    "cloudinary.example.js": "Config Cloudinary (ejemplo)", "cloudinary.js": "Config Cloudinary",
    "firebase-config.example.js": "Config Firebase (ejemplo)", "firebase-config.js": "Config Firebase",
    "state.js": "Estado global", "color-picker.js": "Selector de color", "sanitize.js": "Escape (sanitize)",
    "phases.js": "Fases", "live.js": "Tiempo real", "cursor-fx.js": "Estela del cursor",
}


def _label(nodes):
    from collections import Counter
    import os
    files = Counter(os.path.basename(str(G.nodes[n].get("source_file") or "?")) for n in nodes)
    top = files.most_common(2)
    if not top:
        return None
    names = [FILE_NAMES.get(top[0][0], top[0][0])]
    if len(top) > 1 and top[1][1] >= 0.35 * sum(files.values()):
        names.append(FILE_NAMES.get(top[1][0], top[1][0]))
    return " y ".join(names)

root = Path(".")
out = root / "graphify-out"
raw = json.loads((out / "graph.json").read_text(encoding="utf-8"))
G = build_from_json(raw)
communities = {}
for nid, d in G.nodes(data=True):
    communities.setdefault(d.get("community"), []).append(nid)
communities.pop(None, None)
labels = {cid: _label(nodes) or f"Community {cid}" for cid, nodes in communities.items()}
cohesion = score_all(G, communities)
gods = god_nodes(G)
surprises = surprising_connections(G, communities)
questions = suggest_questions(G, communities, labels)
report = generate(G, communities, cohesion, labels, gods, surprises,
                  {"warning": "solo AST"}, {"input": 0, "output": 0}, str(root),
                  suggested_questions=questions)
(out / "GRAPH_REPORT.md").write_text(report, encoding="utf-8")
to_json(G, communities, str(out / "graph.json"))
to_html(G, communities, str(out / "graph.html"), community_labels=labels)
print(f"{len(communities)} comunidades etiquetadas")
