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

## Verified

- `npm test`: 8 passing tests.
- `npm run check`: 0 errors, warnings, or hints.
- `npm run build`: successful static build.
- `npm audit`: 0 known vulnerabilities after upgrading to Astro 7.3.3.
- GitHub `Checks` run `35696318243`: passed on the published `main` branch.
- GitHub ingestion run `35696410855`: live PSA fetch, validation, tests, checks, and build passed; correctly reported no new validated release.
- Production output: 25 pages, about 400 KB total, with no client-side script bundles.
- Generated `robots.txt` and sitemap both use the configured `SITE_URL`.

## Before production

- Choose the final domain, set `SITE_URL` in Cloudflare Pages, and add the same value as the GitHub Actions repository variable `SITE_URL`.
- Connect the official GitHub repository to Cloudflare Pages (`npm run build`, output directory `dist`).
- Visually check the production preview at 320px, 768px, 1024px, and 1440px. Chrome DevTools/browser tooling was unavailable in the implementation environment, so this has not been claimed as verified.
