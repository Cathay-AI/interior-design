"""Render the README deployment and material-library diagrams."""

from html import escape
from pathlib import Path

import diagrams
from diagrams import Cluster, Diagram, Edge, Node
from diagrams.generic.network import Router
from diagrams.onprem.client import Client
from diagrams.onprem.compute import Server
from diagrams.onprem.database import Postgresql
from diagrams.onprem.vcs import Github
from diagrams.programming.language import NodeJS
from diagrams.saas.cdn import Cloudflare


OUTPUT_DIR = Path(__file__).parent
PAPER = "#f6f4ef"
INK = "#1f1d1a"
ACCENT = "#a8482f"
BUILD = "#eeeae3"
FRONTEND = "#eaf0f8"
SERVICE = "#f4e9e2"
DATA = "#eaf0e7"

DIAGRAM_STYLE = {
    "bgcolor": PAPER,
    "fontname": "Helvetica",
    "fontcolor": INK,
    "fontsize": "23",
    "labelloc": "t",
    "labeljust": "l",
    "pad": "0.27",
    "ranksep": "0.38",
    "nodesep": "0.5",
    "splines": "ortho",
    "dpi": "105",
}
NODE_STYLE = {
    "fontcolor": INK,
    "fontname": "Helvetica",
    "fontsize": "14",
    "shape": "plain",
    "fixedsize": "false",
    "width": "0",
    "height": "0",
}
EDGE_STYLE = {"color": "#766e64", "arrowsize": "0.65", "penwidth": "1.4"}


def diagram(title, filename):
    return Diagram(
        title,
        filename=str(OUTPUT_DIR / filename),
        direction="TB",
        outformat="png",
        show=False,
        graph_attr=DIAGRAM_STYLE,
        node_attr=NODE_STYLE,
        edge_attr=EDGE_STYLE,
    )


def layer(title, color):
    return Cluster(
        title,
        graph_attr={
            "style": "rounded,filled",
            "fillcolor": color,
            "bgcolor": color,
            "pencolor": "#b9b0a5",
            "fontcolor": INK,
            "fontname": "Helvetica",
            "fontsize": "14",
            "margin": "20",
        },
    )


def service(icon, name, detail):
    # Diagrams' provider icons are packaged separately from the Python modules.
    icon_path = Path(diagrams.__file__).parent.parent / icon._icon_dir / icon._icon
    return Node(
        '< <TABLE BORDER="0" CELLBORDER="0" CELLSPACING="0" CELLPADDING="2">'
        f'<TR><TD WIDTH="56" HEIGHT="56" FIXEDSIZE="TRUE">'
        f'<IMG SRC="{escape(str(icon_path))}" SCALE="TRUE"/></TD></TR>'
        f'<TR><TD><B>{escape(name)}</B></TD></TR>'
        f'<TR><TD><FONT POINT-SIZE="11">{escape(detail)}</FONT></TD></TR>'
        '</TABLE> >'
    )


def same_row(cluster, *nodes):
    with cluster.dot.subgraph() as row:
        row.attr(rank="same")
        for node in nodes:
            row.node(node.nodeid)


with diagram("Interior Design · deployment architecture", "component-stack"):
    with layer("Entry and release", BUILD) as entry:
        registrar = service(Server, "Registrar + DNS", "Proposed · register / renew")
        browser = service(Client, "Browser", "HTML / JS / Three.js")
        repo = service(Github, "GitHub", "main / PR builds")
        same_row(entry, registrar, browser, repo)
    with layer("Edge", FRONTEND) as delivery:
        edge = service(Router, "Vercel Edge", "HTTPS / cache · optional LB")
        static = service(Server, "Vercel static host", "dist/")
        free = service(Cloudflare, "Cloudflare Pages Free", "Proposed · static demo URL")
        same_row(delivery, edge, static, free)
    with layer("Application", SERVICE) as application:
        api = service(NodeJS, "Vercel Node.js API", "Read plan · catalog proposed")
        identity = service(Server, "Managed Auth", "Proposed · OIDC")
        same_row(application, api, identity)
    with layer("Data + AI", DATA) as dependencies:
        db = service(Postgresql, "PostgreSQL", "Proposed · catalog metadata")
        models = service(Server, "OpenAI / Anthropic", "If configured · billed separately")
        objects = service(Cloudflare, "Object storage", "Proposed · catalog assets / CDN")
        same_row(dependencies, db, models, objects)

    registrar >> Edge(style="dashed") >> edge
    browser >> edge
    repo >> static
    repo >> Edge(style="dashed") >> free
    edge >> static
    edge >> api
    api >> Edge(style="dashed") >> identity
    api >> Edge(style="dashed") >> db
    api >> Edge(style="dashed") >> objects
    api >> Edge(color=ACCENT) >> models
