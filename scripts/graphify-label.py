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

NAMES = {
    0: "Bracket, partidos y playoff",
    1: "Palmares (Sala de Trofeos 3D)",
    2: "Navegacion y paginas publicas",
    3: "Historial y H2H",
    4: "Sorteo en vivo",
    5: "Sonido y efectos de partido",
    6: "Equipos y animacion de UI",
    7: "Push, ajustes y actualizador",
    8: "Perfil y panel del presidente",
    9: "Capa de datos y fixture",
    10: "Calendario",
    11: "Tablas de posiciones",
    12: "Bracket publico",
    13: "Auth y registro",
    14: "Competiciones",
    15: "Export / import de datos",
    16: "Promo APK",
    17: "Config Cloudinary",
    18: "Selector de color",
    19: "Config Firebase (ejemplo)",
    20: "Config Firebase",
    21: "Estado global",
}

root = Path(".")
out = root / "graphify-out"
raw = json.loads((out / "graph.json").read_text(encoding="utf-8"))
G = build_from_json(raw)
communities = {}
for nid, d in G.nodes(data=True):
    communities.setdefault(d.get("community"), []).append(nid)
communities.pop(None, None)
labels = {cid: NAMES.get(cid, f"Community {cid}") for cid in communities}
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
