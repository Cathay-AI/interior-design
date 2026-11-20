"""Render the single deployment architecture diagram used in the docs."""

from html import escape
from pathlib import Path

from diagrams import Cluster, Diagram, Edge, Node


OUTPUT = Path(__file__).with_name("component-stack")
INK = "#1f1d1a"
PAPER = "#f6f4ef"
NODE_STYLE = {
    "shape": "plain",
    "fontcolor": INK,
    "fontname": "Helvetica",
    "fontsize": "12",
    "fixedsize": "false",
    "width": "0",
    "height": "0",
}


def tier(title, detail, *components):
    cards = "".join(
        f'<TD BGCOLOR="#f6f4ef" BORDER="1" COLOR="#d7d2c8">'
        f'<FONT POINT-SIZE="11">{escape(component)}</FONT></TD>'
        for component in components
    )
    return Node(
        '< <TABLE BORDER="1" COLOR="#b7b2a9" BGCOLOR="#fffdf8" '
        'CELLBORDER="0" CELLSPACING="0" CELLPADDING="7" WIDTH="235">'
        f'<TR><TD ALIGN="LEFT" BALIGN="LEFT"><B>{escape(title)}</B><BR/>'
        f'<FONT POINT-SIZE="11" COLOR="#575750">{escape(detail)}</FONT></TD></TR>'
        '<TR><TD ALIGN="LEFT"><TABLE BORDER="0" CELLBORDER="0" '
        f'CELLSPACING="5" CELLPADDING="5"><TR>{cards}</TR></TABLE></TD></TR>'
        '</TABLE> >'
    )

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
        current_web = tier(
            "Frontend and delivery", "One Vercel project · 3D in the browser",
            "Vercel Edge", "Static dist/", "WebGL",
        )
        current_api = tier(
            "Backend", "Same project · Fast Route parsing",
            "Node.js Function", "POST /api/read-plan",
        )
        current_model = tier(
            "Model API", "Server-side call if configured · no product database",
            "OpenAI", "Anthropic",
        )

        current_web >> current_api >> Edge(color="#a8482f") >> current_model

    with stage("Future · separately deployable tiers", "#eaf0e7", "#a1ad9e"):
        future_web = tier(
            "Frontend and delivery", "CDN cache · load balancing when needed",
            "Registrar / DNS", "TLS / CDN", "Static dist/",
        )
        future_api = tier(
            "Backend and connections", "Read plan + catalog · API enforces access",
            "Node.js API", "OIDC Auth", "LLM API",
        )
        future_data = tier(
            "Data and materials", "Database metadata · public/private file buckets",
            "PostgreSQL", "Object storage",
        )

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
