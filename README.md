# Deploy to SureCart

A GitHub Action that attaches a release to one or more [SureCart](https://surecart.com/) products.

## Modes

Pick a mode by the inputs you pass:

- **v3 — upload to SureCart** (`release_tag` + `upload_target: surecart`). Use this for plugin/theme updates: the version is recognised and the WordPress "update available" prompt works. No R2 needed.
- **v2 — upload to R2** (`release_tag`, `upload_target: r2` is the default). Hosts the bytes on your own Cloudflare R2 and attaches an external URL. Use for non-plugin assets or when you need the bytes on your own infra. Does not surface a version to WordPress.
- **v1 — attach existing media** (`media_uuid`). Attaches a file already uploaded to SureCart. Legacy.

`media_uuid` and `release_tag` are mutually exclusive.

## Quickstart — v3 (plugin/theme releases)

```yaml
- name: Deploy to SureCart
  uses: Digital-Gravy/action-deploy-surecart@v2
  with:
    release_tag: ${{ inputs.release_tag }}
    upload_target: surecart
    product_uuids: '<uuid1>,<uuid2>'
    set_as_current_release: 'true'
    # Match only the plugin/theme zip(s) you ship as updates.
    asset_pattern: 'my-plugin-[0-9]*.zip'
    expected_version: ${{ inputs.release_tag }}   # optional: fail if it doesn't match
    surecart_api_token: ${{ secrets.SURECART_API_TOKEN }}
```

## Quickstart — v2 (R2-hosted)

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

## Quickstart — v1 (legacy)

```yaml
- name: Deploy to SureCart
  uses: Digital-Gravy/action-deploy-surecart@v2
  with:
    media_uuid: '<media uuid from the SureCart admin>'
    product_uuids: '<uuid1>,<uuid2>'
    set_as_current_release: 'true'
    surecart_api_token: ${{ secrets.SURECART_API_TOKEN }}
```

## Inputs

### Shared

| Input | Required | Default | Description |
| --- | --- | --- | --- |
| `product_uuids` | yes | — | CSV of SureCart product UUIDs. |
| `surecart_api_token` | yes | — | Bearer token. |
| `set_as_current_release` | no | `false` | When `true`, set each product's current release to the new Download. |
| `duplicate_behavior` | no | `warn` | `warn` reuses the existing Download (when SureCart surfaces it) and continues. `error` fails the workflow. |
| `duplicate_media_behavior` | no | — | Deprecated alias of `duplicate_behavior`. |
| `dry_run` | no | `false` | Log what would happen without making any calls. |

### v2/v3 (with `release_tag`)

| Input | Required | Default | Description |
| --- | --- | --- | --- |
| `release_tag` | yes | — | GitHub release tag in the caller repo. `latest` resolves to the most recent published release. |
| `upload_target` | no | `r2` | `r2` → v2 (R2 + external URL). `surecart` → v3 (upload to SureCart, version recognised). Case-insensitive. |
| `asset_pattern` | no | `*.zip` | Glob over release asset names. In v3, narrow this to the plugin/theme zip(s) you ship as updates. |
| `current_release_asset_pattern` | no | `''` | Glob picking which asset becomes the current release. Empty = first matched asset per product. |
| `github_token` | no | `${{ github.token }}` | For reading the release asset; required if the caller repo is private. |

### v2 only

| Input | Required | Default | Description |
| --- | --- | --- | --- |
| `object_key_prefix` | no | `releases` | R2 object-key prefix. |
| `r2_account_id` | yes (in v2) | — | Cloudflare R2 account ID. |
| `r2_access_key_id` | yes (in v2) | — | R2 S3-compat access key. |
| `r2_secret_access_key` | yes (in v2) | — | R2 S3-compat secret. |
| `r2_bucket` | yes (in v2) | — | Bucket name. |
| `r2_public_base_url` | yes (in v2) | — | Public URL prefix (e.g. `https://dl.example.com`). No trailing slash. |

### v3 only

| Input | Required | Default | Description |
| --- | --- | --- | --- |
| `release_ingest_timeout_seconds` | no | `30` | Max seconds to wait for the version to be recognised. Fails the run on timeout. |
| `release_ingest_poll_interval_seconds` | no | `2` | Seconds between checks. |
| `expected_version` | no | `''` | If set, fail the run unless the recognised version matches exactly. |

## Outputs

| Output | Description |
| --- | --- |
| `download_ids` | CSV of created/found Download IDs. |
| `public_urls` | CSV of public URLs uploaded this run. v2 mode only. |
| `object_keys` | CSV of R2 object keys created. v2 mode only. |
| `media_ids` | CSV of SureCart media UUIDs created this run. v3 mode only. |
| `action_taken` | `created`, `partial` (some duplicates surfaced), or `skipped` (dry-run). |

## Notes

- **Duplicates.** SureCart enforces uniqueness per product. With `duplicate_behavior=warn` (default), an already-attached release is reused and the run continues; with `error` it fails.
- **Dry-run.** `dry_run=true` logs every call the action would make, then exits with `action_taken=skipped`. Safe to run on production credentials.

## R2 setup (v2 only)

1. Cloudflare dashboard → R2 → Create bucket.
2. R2 → API Tokens → Create token, scoped to your bucket, Object Read & Write.
3. R2 bucket → Settings → Custom Domains → Connect Domain (e.g. `dl.example.com`).
4. Confirm public access through the custom domain is enabled.
5. Add repo secrets: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_BASE_URL`.

## Compatibility

- `@v1` shipped as Bash and stays pinned at its original commit; consumers on `@v1` are unaffected.
- `@v2` is the current TypeScript action and supports all three modes; v3 is reached via `upload_target: surecart`. Upgrading `@v1` → `@v2` needs no input changes.

## Development

```bash
npm install
npm test          # jest, unit-level
npm run build     # tsc + esbuild → dist/index.js
npm run lint
```
