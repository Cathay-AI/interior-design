# Native HTML product proposal

English · [繁體中文](README.zh-TW.md)

**[Open the HTML presentation](https://cathay-ai.github.io/interior-design-proposal/?v=native)** · [Original PDF reference](assets/original-proposal.pdf)

The 29 original pages are rebuilt as selectable HTML text, responsive CSS layouts and semantic SVG drawings. The original order, seven chapters, warm palette, typography, phone storyboards, charts, diagrams and tables guide the reconstruction. Page 16 is a new overview of the candidate style-finalization flow that is not part of the original, for 30 pages in total. No full-slide images, canvas screenshots, PDF embeds or iframes render the deck.

- `index.html`: all 30 pages, readable content and diagrams.
- `native/style.css`: desktop slide layout and mobile reflow.
- `native/deck.js`: page/chapter navigation, keyboard/swipe, reading mode, larger text and print.
- `product-design/`: 21-page product-design deck for style finalization (story levels, 16 home personalities, family co-test, simulated furnishing mall, voice assistant, decision-model and technical evaluation). This is an unvalidated candidate design.
- `assets/original-proposal.pdf`: unchanged source for comparison/download, never the presentation renderer.

Phone storyboards and other wide diagrams have bounded horizontal scrolling on mobile. Reading mode shows all pages; the original Chinese content is not automatically translated. The source PDF’s literal icon placeholders are replaced with SVG icons. Page 9 has no visible source chart, so no numerical data is invented.

```sh
python3 -m http.server 8000 --bind 127.0.0.1 --directory docs/proposal
```

Public hosting contains only presentation files. Private product specifications stay private. [Public source](https://github.com/Cathay-AI/interior-design-proposal).
