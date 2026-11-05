# Visual proposal / 視覺提案

| Language | Source | Browser page | GitHub entry |
|---|---|---|---|
| English | [proposal.en.am.md](proposal.en.am.md) | [proposal.en.html](proposal.en.html) | [English proposal](../README.md) |
| 繁體中文 | [proposal.am.md](proposal.am.md) | [proposal.html](proposal.html) | [繁中提案](../README.zh-TW.md) |

Six compact panels per page. Photographs are embedded so each HTML opens offline. All diagrams and layout come from `answer-me-with-html` 0.4.7. Small responsive image elements are used because its native components cannot size photographs.

[Example image credits and MIT license](assets/README.md). These images demonstrate the existing skill, not a finished platform.

## Regenerate

From the repository root, using an installed skill CLI:

```sh
python3 docs/visual/render-proposal.py --renderer /path/to/answer-me-with-html/scripts/am.mjs
```

`workflow.*.png`, `team.*.png`, `roadmap.*.png` and `proposal-preview*.png` are actual Chrome screenshots of the generated pages. Capture these panels again after changing the source. PNGs are used in READMEs so GitHub can show them directly.

Desktop and 390px mobile viewport layout checks are documentation checks, not product WebGL or physical-device verification.
