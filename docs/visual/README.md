# Visual proposal / 視覺提案 v0.2

| Language | Source | Browser page | GitHub entry |
|---|---|---|---|
| English | [proposal.en.am.md](proposal.en.am.md) | [proposal.en.html](proposal.en.html) | [English](../README.md) |
| 繁體中文 | [proposal.am.md](proposal.am.md) | [proposal.html](proposal.html) | [繁中](../README.zh-TW.md) |

Six compact panels per page. These are original product-planning diagrams, not screenshots of a shipped platform or customer cases. Victor's skill images were removed in v0.2.

Generate offline HTML with the installed `answer-me-with-html` CLI:

```sh
python3 docs/visual/render-proposal.py --renderer /path/to/answer-me-with-html/scripts/am.mjs
```

`workflow.*.png`, `constraints.*.png`, `business.*.png`, `team.*.png`, `roadmap.*.png` and `proposal-preview*.png` are Chrome captures of the generated pages. Regenerate them when source content changes. The HTML needs no server or external image files.

Desktop and 390px viewport checks verify documentation layout only, not physical-device 3D performance.
