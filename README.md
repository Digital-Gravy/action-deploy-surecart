# Deploy to SureCart

A GitHub Action that attaches a release to one or more [SureCart](https://surecart.com/) products. Supports two modes:

- **v2 mode (recommended)** — pass `release_tag` and Cloudflare R2 credentials. The action downloads the matching GitHub release asset(s), uploads them to R2, and creates SureCart Downloads pointing at the external URL. Fully automated, no manual upload.
- **v1 mode (backwards compat)** — pass a `media_uuid` of a file already uploaded to SureCart via their WP admin UI. The action only attaches it. Preserved so existing callers don't break.

The action picks the mode based on which inputs you pass. Both inputs together is an error; neither is an error. The v1 mode is byte-compatible with the Bash implementation that shipped under `@v1` (which remains pinned at its original commit).

## Why v2

SureCart's "secure downloads" upload API is a private internal not available to third parties. To fully automate releases, host the bytes yourself and point the SureCart Download at an external URL.

SureCart still proxies external-URL downloads through their entitlement gate — customers receive a tokenized SureCart URL (e.g. `https://um.<your-store>.com/api.XXXX?...`), never the R2 URL. The R2 URL is only fetched server-side by SureCart when a paying customer redeems their tokenized link.

The action still suffixes every R2 object key with the first 16 hex chars of the file's SHA-256 (`releases/<asset-basename>-<sha16>.<ext>`) as defense-in-depth: if the bucket ever gets enumerated, listed, or accidentally surfaced (browser history, server logs, misconfigured CDN), an unguessable key keeps the file safe from drive-by access.

## Quickstart (v2 mode)

```yaml
- name: Deploy to SureCart
  uses: Digital-Gravy/action-deploy-surecart@v2
  with:
    release_tag: ${{ inputs.release_tag }}
    product_uuids: '<uuid1>,<uuid2>'
    set_as_current_release: 'true'
    asset_pattern: 'my-plugin*.zip'
    current_release_asset_pattern: 'my-plugin-[0-9]*.zip'
    object_key_prefix: 'my-plugin'
    surecart_api_token: ${{ secrets.SURECART_API_TOKEN }}
    r2_account_id: ${{ secrets.R2_ACCOUNT_ID }}
    r2_access_key_id: ${{ secrets.R2_ACCESS_KEY_ID }}
    r2_secret_access_key: ${{ secrets.R2_SECRET_ACCESS_KEY }}
    r2_bucket: ${{ secrets.R2_BUCKET }}
    r2_public_base_url: 'https://dl.example.com'
```

## Quickstart (v1 mode — legacy)

```yaml
- name: Deploy to SureCart
  uses: Digital-Gravy/action-deploy-surecart@v2
  with:
    media_uuid: '<media uuid grabbed from the WP admin>'
    product_uuids: '<uuid1>,<uuid2>'
    set_as_current_release: 'true'
    surecart_api_token: ${{ secrets.SURECART_API_TOKEN }}
```

Same inputs and behavior as the Bash `@v1` action.

## Inputs

### Shared

| Input | Required | Default | Description |
| --- | --- | --- | --- |
| `product_uuids` | yes | — | CSV of SureCart product UUIDs. |
| `surecart_api_token` | yes | — | Bearer token. |
| `set_as_current_release` | no | `false` | When `true`, PATCH each product's `current_release_download`. |
| `duplicate_behavior` | no | `warn` | `warn` returns the existing Download ID (when SureCart surfaces it) and continues. `error` fails the workflow. |
| `duplicate_media_behavior` | no | — | Deprecated alias of `duplicate_behavior` (v1 callers). |
| `dry_run` | no | `false` | Log what would happen, don't make any R2 or SureCart calls. |

### v1 mode only

| Input | Required | Description |
| --- | --- | --- |
| `media_uuid` | yes (in v1) | UUID of a SureCart-hosted media. |

### v2 mode only

| Input | Required | Default | Description |
| --- | --- | --- | --- |
| `release_tag` | yes (in v2) | — | GitHub release tag in the caller repo. `latest` resolves to the most recent published release. |
| `asset_pattern` | no | `*.zip` | Glob over release asset names. |
| `current_release_asset_pattern` | no | `''` | Glob picking which asset becomes the current release. Empty = first matched asset per product. |
| `object_key_prefix` | no | `releases` | R2 object-key prefix. |
| `r2_account_id` | yes (in v2) | — | Cloudflare R2 account ID. |
| `r2_access_key_id` | yes (in v2) | — | R2 S3-compat access key. |
| `r2_secret_access_key` | yes (in v2) | — | R2 S3-compat secret. |
| `r2_bucket` | yes (in v2) | — | Bucket name. |
| `r2_public_base_url` | yes (in v2) | — | Public URL prefix (e.g. `https://dl.example.com`). No trailing slash. |
| `github_token` | no | `${{ github.token }}` | For reading the release asset; required if the caller repo is private. |

## Outputs

| Output | Description |
| --- | --- |
| `download_ids` | CSV of created/found Download IDs. |
| `public_urls` | CSV of public URLs uploaded this run. Empty in v1 mode. |
| `object_keys` | CSV of R2 object keys created. Empty in v1 mode. |
| `action_taken` | `created`, `partial` (some duplicates surfaced), or `skipped` (dry-run). |

## Behavior

### v2 pipeline (per invocation)

1. `release_tag = "latest"` → resolved via GitHub releases API.
2. Release fetched; assets filtered by `asset_pattern`.
3. For each matched asset:
   - Downloaded over the GitHub assets API with `Accept: application/octet-stream` (works on private repos with a Bearer token).
   - SHA-256 streamed; first 16 hex chars become the key suffix.
   - Uploaded to R2 at `<object_key_prefix>/<asset-basename>-<sha16>.<ext>`.
4. For each (product × asset): `POST /v1/downloads` with `{download: {product, url, name, enabled: true}}`.
5. If `set_as_current_release=true`: for each product, `PATCH /v1/products/<uuid>` with `{product: {current_release_download: <id>}}`. The Download chosen is the one whose asset matches `current_release_asset_pattern` (or the first matched asset if the pattern is empty).

### v1 pipeline (per invocation)

For each product: `POST /v1/downloads` with `{download: {product, media_id}}`, then optionally PATCH the current release. Identical to the legacy Bash action.

### Duplicate handling

SureCart enforces uniqueness on both `media` and `url` per product. When `duplicate_behavior=warn`, the action records the existing Download ID returned in SureCart's `validation_errors[0].download_id` and continues. When SureCart doesn't surface that ID, the action emits a warning and skips the current-release update for that product. With `duplicate_behavior=error`, any duplicate fails the workflow.

### Dry-run

`dry_run=true` makes the action log every R2 PUT and every SureCart POST/PATCH it would have made, then exit with `action_taken=skipped`. Safe to use on production credentials for sanity checks.

## R2 setup (v2 mode prerequisite)

1. Cloudflare dashboard → R2 → Create bucket.
2. R2 → API Tokens → Create token, scoped to your bucket, Object Read & Write.
3. R2 bucket → Settings → Custom Domains → Connect Domain (e.g. `dl.example.com`). DNS must be on the same Cloudflare account, or CNAME manually to `<bucket>.r2.cloudflarestorage.com`.
4. Confirm "Public access" through the custom domain is enabled.
5. Add to the caller workflow's repo secrets: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_BASE_URL`.

## Compatibility

- v1 of this action shipped as Bash. The `v1` tag still points at that commit and consumers pinned to `@v1` continue running the Bash version unchanged.
- v2 is a TS rewrite that supports both modes; consumers can upgrade `@v1` → `@v2` without changing their existing inputs.
- Inputs and behavior of v1 mode in v2 match the Bash version verbatim (same duplicate-error message, same skip-on-duplicate-no-id behavior, same payload shape).

## Development

```bash
npm install
npm test          # jest, ~50 tests, unit-level
npm run build     # tsc + esbuild → dist/index.js
npm run lint
```

Tests cover all pure logic (asset name matching, hash, URL/key composition, duplicate detection) and HTTP wrappers (with injected `fetch` / `S3Client`). The mode orchestrators (`runV1Mode`, `runV2Mode`) and the `src/index.ts` entrypoint are integration-validated by running the action against a real SureCart product (see the smoke workflow on the consuming repo).
