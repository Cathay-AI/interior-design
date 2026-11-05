# 2026-11-05 Proposal slides

## Request / scope

Side conversation request: make the proposed 8-slide visual presentation, source under docs/proposal, prepare GitHub Pages publication separately from the future product domain. Use current product v0.2, bilingual, compact and image-led. No inherited main-thread tasks are resumed.

## Isolation

During drafting, only new docs/proposal files, a prepared workflow and this record belonged to this request. Parent-thread edits existed at start and were not modified or committed by this side conversation. The later explicit request to publish authorizes the publication actions recorded below. Shared repository state can change independently in the parent conversation.

## Decisions

Plain HTML/CSS/JS deck, eight slides, Chinese/English switch, keyboard/touch navigation, printing and responsive layout. One original generated concept image; no Victor skill samples or invented customer cases. Workflow manually publishes an explicit allowlist of slides/image files. Pages initially returns 404; repository is private. Online hosting is not claimed complete.

## Verification

PASS: Headless Chrome checked 80 combinations (8 slides × 2 languages × widths 320/390/768/1024/1440), one active slide, no horizontal page overflow, and desktop fit.

PASS: language persistence, keyboard arrows/Home/End, first/last navigation limits, and synthetic touch swipe; no runtime exceptions. Mobile previous/next buttons are 44 × 44 CSS pixels. Desktop and mobile screenshots visually inspected. This is viewport testing, not a physical-phone usability test.

PASS: both tagged A4 landscape PDFs contain exactly 8 pages (`pdfinfo`). HTML has 19 valid local links and no external runtime dependency; source whitespace and workflow YAML syntax checks passed.

Standards self-review: 0 blocking findings. No existing parent files or git index were changed; static dependencies, semantic controls, responsive layout and reduced-motion behavior are explicit.

Scope self-review: 0 blocking findings. Eight requested topics are present, bilingual; planned vs delivered capabilities, pricing candidates, genuine cases, engine flexibility and limited Taiwan checks are clear. Original generated artwork is identified as a concept.

At draft completion, hosting was not executed and Pages returned 404; publication results below supersede that state. Physical devices and product voice/3D/quote/payment functionality remain unverified. No custom domain was configured.

Draft deliverables: docs/proposal/index.html, bilingual PDFs/previews/README, source notes and original concept JPEG. The initially prepared private Pages workflow was removed during publication because the plan does not support it.


## Publication requested and completed

User explicitly requested「幫我上線」. GitHub API rejected Pages creation in the existing private repository with HTTP 422: current plan does not support Pages for this repository. Product repository visibility was preserved.

Created a separate public presentation repository: https://github.com/Cathay-AI/interior-design-proposal . Uploaded exactly four files: index.html, assets/space-concept.jpg, .nojekyll and a public README. No internal specifications, review notes, PDF files or unrelated code were published. The last slide links to the public presentation source instead of the private Project.

Public content commit: https://github.com/Cathay-AI/interior-design-proposal/commit/de6472cdadf1b885fa4d09c2236149069ac432f0

Site: https://cathay-ai.github.io/interior-design-proposal/ . Pages build/deployment succeeded: https://github.com/Cathay-AI/interior-design-proposal/actions/runs/41991637562 . Uses public repo main branch root; no custom domain, payment or DNS changes.

PASS: deployed HTML and JPEG return HTTP 200 and match local bytes. Public Git tree contains only the four allowlisted files. Original product repository remains private.

PASS: browser checks repeated against the live HTTPS site: 80 language/viewport/slide combinations, keyboard navigation, boundaries, language switching and synthetic swipe; no runtime exceptions. Bilingual PDFs/previews refreshed from the live page.
