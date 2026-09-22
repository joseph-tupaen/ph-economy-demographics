# Operations

## Monthly update

The scheduled GitHub workflow fetches the pinned PSA table, validates a complete national-and-regional period, and opens a review pull request. Review the data diff, warning output, source date, and Cloudflare preview before merging. Do not edit generated observations by hand.

## Failure

A failed workflow does not change the published snapshot. Inspect the workflow error and PSA metadata before changing configured codes. Run the saved fixture offline with:

```sh
npm run ingest -- --fixture tests/fixtures/psa-openstat/regional.json
```

## Rollback

Revert the monthly data commit and let Cloudflare redeploy. Raw evidence and previous values remain in Git history.

## Facebook

The generated file under `data/drafts/` is review copy only. Compare every number with the release JSON, then post manually. No Facebook credentials or automatic publishing exist in this release.
