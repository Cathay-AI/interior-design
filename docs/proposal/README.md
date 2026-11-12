# Native HTML product proposal

English · [繁體中文](README.zh-TW.md)

**[Open the HTML presentation](https://cathay-ai.github.io/interior-design-proposal/?v=native)** · [Original PDF reference](assets/original-proposal.pdf)

All 29 pages are rebuilt as selectable HTML text, responsive CSS layouts and semantic SVG drawings. The original order, seven chapters, warm palette, typography, phone storyboards, charts, diagrams and tables guide the reconstruction. No full-slide images, canvas screenshots, PDF embeds or iframes render the deck.

- `index.html`: all 29 pages, readable content and diagrams.
- `native/style.css`: desktop slide layout and mobile reflow.
- `native/deck.js`: page/chapter navigation, keyboard/swipe, reading mode, larger text and print.
- `assets/original-proposal.pdf`: unchanged source for comparison/download, never the presentation renderer.

Phone storyboards and other wide diagrams have bounded horizontal scrolling on mobile. Reading mode shows all pages; the original Chinese content is not automatically translated. The source PDF’s literal icon placeholders are replaced with SVG icons. Page 9 has no visible source chart, so no numerical data is invented.

```sh
python3 -m http.server 8000 --bind 127.0.0.1 --directory docs/proposal
```

Public hosting contains only presentation files. Private product specifications stay private. [Public source](https://github.com/Cathay-AI/interior-design-proposal).

## Deck v3 and fast-route prototype

- `deck-v3/index.html`: 34-page HTML deck (background, market, needs, product experience, competitors, positioning, execution incl. work split, timeline, partner proposal). Arrow keys / swipe, chapter jump, `N` notes, `F` fullscreen, print to PDF.
- `../../prototype/fast-route/`: RWD prototype of the 快速找風格 route (entry with three routes, taste map, layout, confirm, result with 3D view, rough estimate, rule check, versions). See its README.
- The prototype is deployed on Vercel (`vercel.json` + `scripts/build-site.sh`); the deck is published on GitHub Pages at https://cathay-ai.github.io/interior-design/ (`.github/workflows/pages.yml`).
