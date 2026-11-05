# 2026-11-05 Original PDF publication

## Request

User supplied a Claude artifact, then a local PDF after the artifact was inaccessible, and emphasized「原稿！」. Publish the original, preserving all 29 pages, order and layout, rather than rewriting into an independent proposal.

## Starting snapshot / scope

Private repo HEAD ade6f78, clean before this request. Public presentation repo main de6472cdadf1b885fa4d09c2236149069ac432f0. Only proposal source, associated reader assets and this record change. No main-thread implementation or issue work is resumed.

## Source / decisions

29-page PDF, 960×540 pt, SHA-256 8613a34710940f3c50a7c862690486e114721cb0716009c4dcb859aa3c8ec657. Preserve unchanged PDF, rasterize every page at 1920px, use verbatim extracted text only for optional reading assistance. English UI controls do not imply an English translation of the original. Preserve the previous deck as legacy, not as the original. Fetch only current and next-page images initially; page overview loads thumbnails on demand.

## Verification

Source metadata, extraction and 29 rendered pages checked. Visually inspected source pages 14 and 18. PASS: 232 page/UI-language/viewport combinations (29 × 2 × 4 widths: 320, 390, 768, 1440), every source image decoded, chapter/keyboard/page input/boundaries/overview/zoom/Escape/extracted text checked, no runtime exceptions. Desktop and mobile reader/zoom screenshots inspected. Fixed language-label selector specificity and added explicit Escape close.

PASS: checksum of original downloaded PDF matches the user file exactly; all 29 JPEGs and text entries present; local references resolve. English changes UI only, preserving the Chinese original.


## Publication

Public source-content commit: https://github.com/Cathay-AI/interior-design-proposal/commit/a5d476336595a9b082fc4ef44b7edb82b755e326

Final reader commit: https://github.com/Cathay-AI/interior-design-proposal/commit/b01565f6e07daab5d54eba949521bed81a37a84c

Pages deployment succeeded: https://github.com/Cathay-AI/interior-design-proposal/actions/runs/42000069294 . Site: https://cathay-ai.github.io/interior-design-proposal/ . Public tree has 36 presentation-only files, including original PDF, 29 images, extracted text, current reader, public README, .nojekyll and legacy deck/assets. No internal product specs published.

PASS: live HTML and sample page bytes match local, PDF hash matches source, HTTP success. Live browser results added below.

Standards self-review: no blocking issue; source-only scope, progressive image loading, semantic controls and explicit mobile zoom. Spec self-review: original 29-page content/order/layout preserved; no independently rewritten or translated slides. Physical-device testing remains unverified.

PASS: all 232 page/language/viewport checks repeated against live HTTPS with 29 images, chapter navigation, zoom, Escape and original text; no runtime exceptions.
