"""Render the single deployment architecture diagram used in the docs."""

from pathlib import Path

from diagrams import Cluster, Diagram, Edge, Node


OUTPUT = Path(__file__).with_name("component-stack")
INK = "#1f1d1a"
PAPER = "#f6f4ef"
NODE_STYLE = {
    "shape": "box",
    "style": "rounded,filled",
    "fillcolor": "#fffdf8",
    "color": "#9b9a93",
    "fontcolor": INK,
    "fontname": "Helvetica",
    "fontsize": "12",
    "labelloc": "c",
    "fixedsize": "false",
    "width": "2.75",
    "height": "0.59",
    "margin": "0.14,0.08",
}


def stage(title, fill, outline):
    return Cluster(
        title,
        graph_attr={
            "style": "rounded,filled",
            "fillcolor": fill,
            "pencolor": outline,
            "fontcolor": INK,
            "fontname": "Helvetica",
            "fontsize": "13",
            "margin": "14",
        },
    )


with Diagram(
    "Interior Design · deployment",
    filename=str(OUTPUT),
    direction="TB",
    show=False,
    graph_attr={
        "bgcolor": PAPER,
        "fontcolor": INK,
        "fontname": "Helvetica",
        "fontsize": "20",
        "labeljust": "l",
        "labelloc": "t",
        "pad": "0.22",
        "ranksep": "0.27",
        "nodesep": "0.34",
        "splines": "ortho",
        "newrank": "true",
        "dpi": "105",
    },
    node_attr=NODE_STYLE,
    edge_attr={"color": "#69675f", "arrowsize": "0.55"},
) as chart:
    with stage("Current · Vercel prototype", "#eaf0f8", "#a3afbd"):
        current_web = Node("Vercel Edge + frontend\nStatic dist/ · browser 3D")
        current_api = Node("Vercel Node.js Function\nPOST /api/read-plan")
        current_model = Node("OpenAI / Anthropic\nIf configured · no product DB")

        current_web >> current_api >> Edge(color="#a8482f") >> current_model

    with stage("Future · separately deployable tiers", "#eaf0e7", "#a1ad9e"):
        future_web = Node("Frontend · static host + Edge\ndist/ · DNS / TLS / CDN cache")
        future_api = Node("Backend · Node.js API\nCatalog · Auth · server-side LLM")
        future_data = Node("Data · PostgreSQL + object storage\nCatalog metadata · material files")

        future_web >> future_api >> future_data

    for current, future in (
        (current_web, future_web),
        (current_api, future_api),
        (current_model, future_data),
    ):
        with chart.dot.subgraph() as row:
            row.attr(rank="same")
            row.node(current.nodeid)
            row.node(future.nodeid)
