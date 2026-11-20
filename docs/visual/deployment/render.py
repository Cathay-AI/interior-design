"""Render the layerwise component diagram used by both deployment guides."""

from pathlib import Path

from diagrams import Cluster, Diagram, Edge, Node


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


def component(name, role, proposed=False):
    return Node(
        f"{name}\n{role}",
        color=PLANNED if proposed else CURRENT,
        fillcolor="#f9fbf6" if proposed else "#f9fbfd",
        style="filled,dashed" if proposed else "filled",
    )


def row(group, *components):
    with group.dot.subgraph() as same_rank:
        same_rank.attr(rank="same")
        for item in components:
            same_rank.node(item.nodeid)
        for left, right in zip(components, components[1:]):
            same_rank.edge(left.nodeid, right.nodeid, style="invis", weight="40")


def planned_link():
    return Edge(color=PLANNED, style="dashed", arrowsize="0.65")


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
        browser = component("Browser", "HTML / JS / WebGL")
        domain = component("Registrar + DNS", "Custom domain / renewal", proposed=True)
        row(entry, browser, domain)

    with layer("02  DELIVERY", "#eaf0f8") as delivery:
        static = component("Vercel static host", "dist/")
        edge = component("Vercel Edge", "HTTPS / CDN cache")
        row(delivery, static, edge)

    with layer("03  BACKEND", "#f4ede4") as backend:
        read_plan = component("Node.js Function", "POST /api/read-plan")
        catalog = component("Catalog API", "GET /api/materials", proposed=True)
        row(backend, read_plan, catalog)

    with layer("04  DATA / EXTERNAL", "#eaf0e7") as dependencies:
        model = component("LLM API", "OpenAI or Anthropic, if configured")
        identity = component("Managed Auth", "OIDC identity", proposed=True)
        db = component("PostgreSQL", "Catalog metadata", proposed=True)
        storage = component("Object storage", "Images / GLB files", proposed=True)
        row(dependencies, model, identity, db, storage)

    browser >> edge
    domain >> planned_link() >> edge
    edge >> static
    edge >> read_plan
    edge >> planned_link() >> catalog
    read_plan >> Edge(color="#a8482f", arrowsize="0.65") >> model
    catalog >> planned_link() >> identity
    catalog >> planned_link() >> db
    catalog >> planned_link() >> storage
