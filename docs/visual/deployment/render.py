"""Render the layerwise component diagram used by both deployment guides."""

from html import escape
from pathlib import Path

import diagrams
from diagrams import Cluster, Diagram, Edge, Node
from diagrams.generic.network import Router
from diagrams.onprem.client import Client, User
from diagrams.onprem.compute import Server
from diagrams.onprem.database import Postgresql
from diagrams.onprem.vcs import Github
from diagrams.programming.framework import Vercel
from diagrams.programming.language import NodeJS
from diagrams.saas.cdn import Cloudflare


OUTPUT = Path(__file__).with_name("component-stack")
INK = "#1f1d1a"
PAPER = "#f6f4ef"
CURRENT = "#315376"
PLANNED = "#54644e"


def layer(name, fill):
    return Cluster(
        name,
        graph_attr={
            "style": "rounded,filled",
            "fillcolor": fill,
            "pencolor": "#c9c5bc",
            "fontcolor": INK,
            "fontname": "Helvetica",
            "fontsize": "13",
            "labelloc": "t",
            "labeljust": "l",
            "margin": "20",
        },
    )


def component(icon, name, role, proposed=False):
    icon_path = Path(diagrams.__file__).parent.parent / icon._icon_dir / icon._icon
    label = (
        '< <TABLE BORDER="0" CELLBORDER="0" CELLSPACING="0" CELLPADDING="4">'
        f'<TR><TD WIDTH="28" HEIGHT="28" FIXEDSIZE="TRUE">'
        f'<IMG SRC="{escape(str(icon_path))}" SCALE="TRUE"/></TD>'
        f'<TD ALIGN="LEFT" BALIGN="LEFT"><B>{escape(name)}</B><BR/>'
        f'<FONT POINT-SIZE="10">{escape(role)}</FONT></TD></TR></TABLE> >'
    )
    return Node(
        label,
        color=PLANNED if proposed else CURRENT,
        fillcolor="#f9fbf6" if proposed else "#f9fbfd",
        style="filled,dashed" if proposed else "filled",
    )


def row(group, *components):
    left, right = (
        Node("", shape="point", style="invis", width="0.01", height="0.01")
        for _ in range(2)
    )
    ordered = (left, *components, right)
    with group.dot.subgraph() as same_rank:
        same_rank.attr(rank="same")
        for item in ordered:
            same_rank.node(item.nodeid)
        for before, after in zip(ordered, ordered[1:]):
            same_rank.edge(before.nodeid, after.nodeid, style="invis", weight="40")
    return left, right


def planned_link(weight="1"):
    return Edge(color=PLANNED, style="dashed", arrowsize="0.65", weight=weight)


with Diagram(
    "Interior Design · deployment components",
    filename=str(OUTPUT),
    direction="TB",
    outformat="png",
    show=False,
    graph_attr={
        "label": '< <B>Interior Design · deployment components</B><BR ALIGN="LEFT"/>'
                 '<FONT POINT-SIZE="12">Solid: current deployment    ·    Dashed: proposed components and routes</FONT> >',
        "bgcolor": PAPER,
        "fontcolor": INK,
        "fontname": "Helvetica",
        "fontsize": "22",
        "labeljust": "l",
        "labelloc": "t",
        "pad": "0.30",
        "ranksep": "0.38",
        "nodesep": "0.36",
        "splines": "ortho",
        "newrank": "true",
        "dpi": "120",
    },
    node_attr={
        "shape": "component",
        "fontcolor": INK,
        "fontname": "Helvetica",
        "fontsize": "12",
        "labelloc": "c",
        "fixedsize": "false",
        "width": "1.65",
        "height": "0.72",
        "margin": "0.16,0.11",
        "penwidth": "1.25",
    },
    edge_attr={"color": CURRENT, "penwidth": "1.3", "arrowsize": "0.65"},
):
    with layer("01  ENTRY / CLIENT", "#f0ede6") as entry:
        browser = component(Client, "Browser", "HTML / JS / WebGL")
        domain = component(Router, "Registrar + DNS", "Custom domain / renewal", proposed=True)
        github = component(Github, "GitHub", "Build from main / PR")
        entry_bounds = row(entry, domain, browser, github)

    with layer("02  EDGE", "#eaf0f8") as delivery:
        static = component(Vercel, "Vercel static host", "Build output: dist/")
        edge = component(Vercel, "Vercel Edge", "HTTPS / CDN cache")
        preview = component(Cloudflare, "Cloudflare Pages Free", "Optional static demo", proposed=True)
        edge_bounds = row(delivery, edge, static, preview)

    with layer("03  BACKEND", "#f4ede4") as backend:
        read_plan = component(NodeJS, "Node.js Function", "POST /api/read-plan")
        catalog = component(NodeJS, "Catalog API", "GET /api/materials", proposed=True)
        backend_bounds = row(backend, read_plan, catalog)

    with layer("04  DATA / EXTERNAL", "#eaf0e7") as dependencies:
        model = component(Server, "LLM API", "OpenAI / Anthropic, if configured")
        identity = component(User, "Managed Auth", "OIDC identity", proposed=True)
        db = component(Postgresql, "PostgreSQL", "Catalog metadata", proposed=True)
        storage = component(Cloudflare, "Object storage", "Images / GLB · e.g. R2", proposed=True)
        dependency_bounds = row(dependencies, model, identity, db, storage)

    # Align cluster boundaries while keeping the main request path in one column.
    bounds = (entry_bounds, edge_bounds, backend_bounds, dependency_bounds)
    for above, below in zip(bounds, bounds[1:]):
        for start, end in zip(above, below):
            start >> Edge(style="invis", weight="1000") >> end

    browser >> Edge(weight="200") >> edge
    domain >> planned_link() >> edge
    edge >> static
    github >> Edge(weight="40") >> static
    github >> planned_link() >> preview
    edge >> Edge(weight="200") >> read_plan
    edge >> planned_link() >> catalog
    read_plan >> Edge(color="#a8482f", arrowsize="0.65", weight="200") >> model
    catalog >> planned_link() >> identity
    catalog >> planned_link(weight="40") >> db
    catalog >> planned_link() >> storage
