# Implementation Progress

Official repository: <https://github.com/joseph-tupaen/ph-economy-demographics.git>

## Completed

- Astro 7 static site on Node 22 with national, 18 regional, comparison, methodology, source, release, and 404 pages.
- PSA OpenSTAT row-JSON ingestion for table `0012M4ACP23.px`, raw gzip archive, SHA-256 evidence, complete-period validation, revision detection, and deterministic social draft.
- Official snapshot through 2026-08 with 3,072 normalized observations.
- Fixture-driven parser and validation tests, accessible SVG chart with table fallback, sitemap, robots file, and Cloudflare security headers.
- GitHub checks and scheduled update-to-PR workflow.
- Published `main` to the official public repository; current implementation commit before this progress update is `89c7f6a`.
- Configured GitHub Actions to remain read-only by default while allowing the ingestion workflow to create review pull requests.
- Replaced the hardcoded robots sitemap URL with a build-time route driven by `SITE_URL` and updated Actions to the Node 24 runtime (`checkout@v7`, `setup-node@v7`).
- Excluded Markdown-only pushes and pull requests from CI to avoid spending runner minutes on documentation changes.
- Social drafts now carry machine-readable `pending_review` status and reference period metadata; ingestion rejects a draft when its percentage claims differ from the approved facts.

## Verified

- `npm test`: 8 passing tests.
- `npm run check`: 0 errors, warnings, or hints.
- `npm run build`: successful static build.
- `npm audit`: 0 known vulnerabilities after upgrading to Astro 7.3.3.
- GitHub `Checks` run `35696318243`: passed on the published `main` branch.
- GitHub `Checks` run `35696521065`: passed for the latest pushed progress commit `a576ba4`.
- GitHub `Checks` run `35696673405`: passed for the final workflow change `c933a29`.
- GitHub `Checks` run `35731332955`: passed for social draft validation commit `6690afc`.
- GitHub ingestion run `35696410855`: live PSA fetch, validation, tests, checks, and build passed; correctly reported no new validated release.
- Production output: 25 pages, about 400 KB total, with no client-side script bundles.
- Static integrity check: all internal links across 25 generated HTML files resolve.
- Generated `robots.txt` and sitemap both use the configured `SITE_URL`.

## Before production

- Choose the final domain, set `SITE_URL` in Cloudflare Pages, and add the same value as the GitHub Actions repository variable `SITE_URL`.
- Connect the official GitHub repository to Cloudflare Pages (`npm run build`, output directory `dist`).
- Visually check the production preview at 320px, 768px, 1024px, and 1440px. Chrome DevTools/browser tooling was unavailable in the implementation environment, so this has not been claimed as verified.
- Add a deterministic Facebook-ready PNG card only when an image renderer is selected; automatic Facebook publishing remains intentionally deferred until approvals and credentials are available.

## Paused map task

- Requested next slice: an interactive national Philippines map with understandable region selection and data panels.
- Reference review completed: Our World in Data’s map explorer emphasizes a clear indicator control, map/table alternatives, selected-area detail, and source context; mapaPH/Lens demonstrates lightweight Philippines GeoJSON, PSGC-based joins, and drill-down patterns. ([Our World in Data](https://ourworldindata.org/explorers/population-and-demography?tab=map), [mapaPH Lens](https://lens.mapaph.com/))
- Planned implementation: static, dependency-free SVG/GeoJSON choropleth using vendored MIT-licensed regional boundaries, keyboard-accessible region buttons, a visible legend, a selected-region detail panel, and a linked table fallback.
- Important data boundary: the current published PSA inflation snapshot has regional observations only; city/municipality values are not available yet. The map must label this clearly and avoid presenting city-level data until a city-level source is ingested and validated.
- Geometry research found current 2023 boundary assets and a separate NIR-aligned open-source map project; the implementation uses the MIT-licensed 17-region snapshot and keeps NIR in the table fallback until a current boundary is aligned.
- The map implementation is committed and pushed as `9273b3a`; GitHub Checks run `35735116198` passed.

## Map implementation checkpoint

- Added a dependency-free SVG choropleth to `/compare/regions/` with five-step legend, hover/focus states, keyboard selection, selected-region detail panel, source link, and the existing table fallback.
- Added a minimized 17-feature regional geometry asset (~380 KB) with attribution to the MIT-licensed `bendlikeabamboo/barangay-boundaries-repository` release.
- Explicitly labels that the published PSA snapshot has regional values only; city/municipality values are not shown.
- Verification: native Node TypeScript tests 8/8, `npm run check` zero diagnostics, `npm run build` 25 pages, all internal links resolve, and map coverage reports 17 mapped regions plus the expected NIR boundary gap.
- Remaining before publishing this slice: resolve or formally accept the NIR boundary asset gap, then run the GitHub CI check and perform real-browser visual testing when tooling is available.
