# PH Economic Updates

A static, mobile-first view of official Philippine inflation data from PSA OpenSTAT.

Official repository: <https://github.com/joseph-tupaen/ph-economy-demographics>

## Requirements

- Node.js 22.12 or newer
- npm

## Commands

```sh
npm install
npm run dev
npm test
npm run check
npm run build
```

Run `npm run ingest` to fetch and validate the configured PSA dataset. Add `-- --fixture tests/fixtures/psa-openstat/regional.json` to work offline.

The default `SITE_URL` is a placeholder. Set it to the production domain in Cloudflare Pages before launch.

## Deploy

Connect the official repository to Cloudflare Pages with build command `npm run build` and output directory `dist`. Set `SITE_URL` to the final HTTPS origin. Merging a validated monthly data pull request triggers the next static deployment.
