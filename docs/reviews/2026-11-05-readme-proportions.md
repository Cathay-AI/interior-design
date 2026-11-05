# README visual proportions

## Request / baseline

User screenshot identifies the product repository README as visually awkward: a thin workflow banner, a cramped table and a dense image table. Start: clean main at a48c432. Scope is four bilingual README entry pages, two new vector hero assets and this record. The native HTML website is unchanged.

## Change

Replace image banners/tables with a single 1200×500 (12:5) hero per language, reusing the editable room illustration from the approved native HTML proposal. Keep short readable Markdown copy, one primary link to the live proposal, and secondary product/team/roadmap links. Root READMEs are 15 lines; docs entries 17 lines. No new product or pricing claims.

## Verification

PASS: both languages rendered through the GitHub Markdown API, then checked in a GitHub-sized local preview at 1000px and 390px. Hero renders about 838×349 on desktop and 324×135 on mobile. One image per README, no horizontal overflow; desktop/Chinese-mobile screenshots visually inspected.

PASS: all local Markdown links resolve; SVGs parse as XML, use the declared 12:5 ratio, and contain no embedded image, script or foreignObject. No new external dependency or generated photo. Minor final English feature wording matches the paid-upgrade model.

Standards self-review: no blocking issues. Spec self-review: proportions, visual hierarchy, bilingual entries and direct access to the interactive proposal addressed. Actual GitHub appearance may vary slightly by platform font/theme.
