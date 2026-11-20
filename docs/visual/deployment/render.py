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


with diagram("Current deployment · Vercel", "deployment"):
    with layer("Build", BUILD):
        repo = service(Github, "GitHub", "main / pull requests")
    with layer("Frontend", FRONTEND) as frontend:
        static = service(Server, "Vercel static site", "dist/")
        browser = service(Client, "Browser", "Three.js / WebGL")
        edge = service(Server, "Vercel edge", "Managed CDN / cache")
        same_row(frontend, static, edge, browser)
    with layer("Service", SERVICE):
        read_plan = service(NodeJS, "Vercel Node.js Function", "Fast Route · POST /api/read-plan")
    with layer("External", DATA):
        model = service(Server, "OpenAI / Anthropic", "Usage billed separately")

    repo >> static >> edge >> browser
    edge >> Edge(style="dashed") >> read_plan
    read_plan >> Edge(color=ACCENT) >> model

with diagram("Proposed free static demo", "free-static-preview"):
    with layer("Build and delivery", BUILD) as build:
        source = service(Github, "GitHub", "Same build script")
        pages = service(Cloudflare, "Cloudflare Pages Free", "dist/ · *.pages.dev")
        same_row(build, source, pages)
    with layer("Frontend", FRONTEND):
        browser = service(Client, "Browser", "3D and sample data")

    source >> pages >> browser

with diagram("Future material library · proposal", "material-library"):
    with layer("Frontend", FRONTEND):
        browser = service(Client, "Browser", "Browse materials")
    with layer("Service + CDN", SERVICE) as services:
        catalog = service(NodeJS, "Catalog API", "GET /api/materials")
        cdn = service(Cloudflare, "CDN", "Approved asset URLs")
        same_row(services, catalog, cdn)
    with layer("Data", DATA) as data:
        metadata = service(Postgresql, "PostgreSQL", "Metadata + object keys")
        files = service(Cloudflare, "R2 object storage", "Published files")
        same_row(data, metadata, files)

    browser >> catalog >> metadata
    browser >> cdn >> files


with diagram("Future components · proposal", "component-stack"):
    with layer("Domain", BUILD) as domain:
        registrar = service(Server, "Registrar", "Register / renew")
        dns = service(Server, "DNS", "Point domain to edge")
        same_row(domain, registrar, dns)
    with layer("Frontend", FRONTEND):
        browser = service(Client, "Browser", "Static UI / 3D")
    with layer("Edge", FRONTEND):
        edge = service(Router, "HTTPS edge", "CDN cache / optional LB")
    with layer("Backend", SERVICE) as backend:
        frontend = service(Server, "Static host", "dist/")
        api = service(NodeJS, "Node.js API", "Read plan / catalog")
        identity = service(Server, "Managed Auth", "OIDC identity provider")
        same_row(backend, frontend, api, identity)
    with layer("Data + AI", DATA) as dependencies:
        db = service(Postgresql, "PostgreSQL", "Catalog metadata")
        objects = service(Cloudflare, "Object storage", "Published materials")
        models = service(Server, "LLM API", "OpenAI / Anthropic")
        same_row(dependencies, db, objects, models)

    registrar >> dns
    dns >> Edge(style="dashed") >> edge
    browser >> edge
    edge >> frontend
    edge >> api
    edge >> objects
    api >> identity
    api >> db
    api >> Edge(color=ACCENT) >> models
