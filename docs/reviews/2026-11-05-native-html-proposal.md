# Native HTML proposal reconstruction

## Authorized scope / acceptance

User explicitly rejected page-image publication and requires HTML implementation that follows the original PDF as closely as possible. Rebuild all 29 pages and seven chapters with selectable HTML text, CSS layout and semantic SVG diagrams. Preserve copy, order, figures and visual language where the PDF exposes them. Recreate five-phone storyboard, result phone, market charts, industry timeline, journey curve, swimlane, comparison/role tables, positioning plot, SWOT, architecture and task graph. Do not use full-slide images, canvas screenshots, PDF embed or iframe as the presentation.

Desktop should retain slide composition; mobile should reflow text and provide bounded scrolling for inherently wide diagrams. Keep page/chapter/keyboard/touch navigation, deep links, original PDF download and print. UI language is distinct from translating the original Chinese content. Re-publish the public GitHub Pages site. No unrelated main-thread work or sub-agent use.

## Baseline

Private repo starts clean at 8ddca52. Existing public source at b01565f6e07daab5d54eba949521bed81a37a84c is the rejected image reader. User PDF SHA-256 remains 8613a34710940f3c50a7c862690486e114721cb0716009c4dcb859aa3c8ec657. Only docs/proposal and this record change.

## Evidence and implementation decisions

Inspect original page renders and text. Some source pages (notably page 9) contain a heading but no visible chart: do not invent numeric data. Repair literal icon placeholders using inline SVG icons. Market and comparison statements remain original-deck content with original attribution; this task is faithful reconstruction, not a new research report.

Use a small static HTML/CSS/JS site with no build/runtime framework. Layout, diagrams and controls are editable source. PDF remains a comparison/download reference, not the rendering mechanism. Side-conversation prohibition on agents/worktrees takes precedence over skill delegation; perform standards and spec reviews separately here.

## Verification

PASS: static assertions confirm 29 native sections, six CSS phone frames (five-screen storyboard plus detailed result), two HTML tables, semantic SVG diagrams and zero img/canvas/iframe/object/embed elements in the active presentation. No literal icon placeholders remain.

PASS: 145 page/viewport combinations at widths 320, 390, 768, 1280 and 1440; one active page, no horizontal page overflow, no desktop clipping warnings, no phone-content frame overflow, no runtime exceptions. Keyboard/chapter/boundary navigation, reading mode and selectable headline checked. Network capture confirms no raster slide or PDF rendering requests.

PASS: visual inspection against original reference for desktop cover, seven-stage timeline, market chart, emotional curve, five phones, detailed result, dependency graph and role matrix. Fixed phone-frame containment, consistent storyboard heights and unintentional chart-label wrapping. Mobile reflows prose and bounds wide charts/storyboards.

PASS: HTML print export has 29 pages at original 960×540pt; pdftotext yields selectable text and pdfimages reports no raster images. Fixed print dimensions and hid assistive-only elements to remove an extra blank page.

Standards self-review: 0 blocking findings after fixing layout issues; static, dependency-free source, accessible controls and deliberate scrolling boundaries. Spec self-review: 0 blocking findings; 29 pages rebuilt as native content rather than page images, source story/hierarchy preserved, no invented numerical chart for source page 9. This is not a pixel-identical or translated PDF clone. Physical-device testing remains unverified.


## Publication / main

User additionally requested push/merge into main. Public main commit: https://github.com/Cathay-AI/interior-design-proposal/commit/b9e16da0168abcc3de097cd44c318ddcd8358c17 . Removed 30 obsolete public slide-JPEG/transcript assets. Only source HTML/CSS/JS, original PDF download, public README and legacy assets remain public; internal specs remain private.

Deployment succeeded: https://github.com/Cathay-AI/interior-design-proposal/actions/runs/42004378503 . Live HTML/CSS/JS match local bytes. Canonical link with a fresh cache key: https://cathay-ai.github.io/interior-design-proposal/?v=native . Live browser verification follows below.

PASS: repeated all 145 page/viewport and native-rendering checks on live HTTPS; no image/PDF renderer requests, no runtime exceptions or desktop clipping.

Final public stylesheet formatting commit: https://github.com/Cathay-AI/interior-design-proposal/commit/397aaf719bdf1c9c2ca79f33e6f4a603d831850f (trailing blank line only).
