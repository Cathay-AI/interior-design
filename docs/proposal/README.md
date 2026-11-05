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
