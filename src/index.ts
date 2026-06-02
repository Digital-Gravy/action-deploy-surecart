import * as core from '@actions/core';
import { runV1Mode, type RunResult } from './lib/runV1Mode';
import { runV2Mode } from './lib/runV2Mode';
import { runV3Mode } from './lib/runV3Mode';

function parseCsv(s: string): string[] {
  return s
    .split(',')
    .map((x) => x.trim())
    .filter((x) => x.length > 0);
}

function getBoolInput(name: string, fallback = false): boolean {
  const raw = core.getInput(name);
  if (!raw) return fallback;
  return raw === 'true' || raw === 'True' || raw === 'TRUE';
}

function getNumberInput(name: string, fallback: number): number {
  const raw = core.getInput(name);
  if (!raw) return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error(`Input '${name}' must be a positive number, got '${raw}'.`);
  }
  return n;
}

function getUploadTarget(): 'r2' | 'surecart' {
  const raw = (core.getInput('upload_target') || 'r2').trim().toLowerCase();
  if (raw !== 'r2' && raw !== 'surecart') {
    throw new Error(`Input 'upload_target' must be 'r2' or 'surecart', got '${raw}'.`);
  }
  return raw;
}

function getBehavior(): 'warn' | 'error' {
  // Honor legacy alias for v1 callers
  const legacy = core.getInput('duplicate_media_behavior');
  if (legacy) {
    core.warning(
      "Input 'duplicate_media_behavior' is deprecated; use 'duplicate_behavior' instead."
    );
    return legacy === 'error' ? 'error' : 'warn';
  }
  const current = core.getInput('duplicate_behavior') || 'warn';
  return current === 'error' ? 'error' : 'warn';
}

async function main(): Promise<void> {
  const mediaUuid = core.getInput('media_uuid');
  const releaseTag = core.getInput('release_tag');
  const productUuidsRaw = core.getInput('product_uuids', { required: true });
  const apiToken = core.getInput('surecart_api_token', { required: true });
  const setAsCurrentRelease = getBoolInput('set_as_current_release', false);
  const dryRun = getBoolInput('dry_run', false);
  const behavior = getBehavior();

  const productUuids = parseCsv(productUuidsRaw);
  if (productUuids.length === 0) {
    throw new Error("Input 'product_uuids' is required (CSV of product UUIDs).");
  }

  let result: RunResult;
  let modeLabel: string;

  if (mediaUuid && releaseTag) {
    throw new Error(
      "Pass exactly one of 'media_uuid' (v1 mode) or 'release_tag' (v2 mode), not both."
    );
  }

  if (mediaUuid) {
    core.info('Running in v1 mode (media_uuid).');
    modeLabel = 'v1 (media_uuid)';
    result = await runV1Mode({
      mediaUuid,
      productUuids,
      setAsCurrentRelease,
      duplicateBehavior: behavior,
      apiToken,
      dryRun,
    });
  } else if (releaseTag) {
    const repo = process.env.GITHUB_REPOSITORY;
    if (!repo) throw new Error('GITHUB_REPOSITORY env var is not set.');
    const uploadTarget = getUploadTarget();

    if (uploadTarget === 'surecart') {
      core.info('Running in v3 mode (release_tag → upload to SureCart).');
      modeLabel = 'v3 (release_tag → SureCart)';
      result = await runV3Mode({
        releaseTag,
        repo,
        githubToken: core.getInput('github_token', { required: true }),
        assetPattern: core.getInput('asset_pattern') || '*.zip',
        currentReleaseAssetPattern: core.getInput('current_release_asset_pattern'),
        productUuids,
        setAsCurrentRelease,
        duplicateBehavior: behavior,
        apiToken,
        ingestTimeoutSeconds: getNumberInput('release_ingest_timeout_seconds', 30),
        ingestPollIntervalSeconds: getNumberInput('release_ingest_poll_interval_seconds', 2),
        expectedVersion: core.getInput('expected_version'),
        dryRun,
      });
    } else {
      core.info('Running in v2 mode (release_tag + R2 upload).');
      modeLabel = 'v2 (release_tag + R2)';
      result = await runV2Mode({
        releaseTag,
        repo,
        githubToken: core.getInput('github_token', { required: true }),
        assetPattern: core.getInput('asset_pattern') || '*.zip',
        currentReleaseAssetPattern: core.getInput('current_release_asset_pattern'),
        objectKeyPrefix: core.getInput('object_key_prefix') || 'releases',
        productUuids,
        setAsCurrentRelease,
        duplicateBehavior: behavior,
        apiToken,
        r2AccountId: core.getInput('r2_account_id', { required: true }),
        r2AccessKeyId: core.getInput('r2_access_key_id', { required: true }),
        r2SecretAccessKey: core.getInput('r2_secret_access_key', { required: true }),
        r2Bucket: core.getInput('r2_bucket', { required: true }),
        r2PublicBaseUrl: core.getInput('r2_public_base_url', { required: true }),
        dryRun,
      });
    }
  } else {
    throw new Error("Pass either 'media_uuid' (v1 mode) or 'release_tag' (v2/v3 mode).");
  }

  core.setOutput('download_ids', result.downloadIds.join(','));
  core.setOutput('public_urls', result.publicUrls.join(','));
  core.setOutput('object_keys', result.objectKeys.join(','));
  core.setOutput('media_ids', (result.mediaIds ?? []).join(','));
  core.setOutput('action_taken', result.actionTaken);

  const summary = process.env.GITHUB_STEP_SUMMARY;
  if (summary) {
    const { appendFileSync } = await import('node:fs');
    const lines = [
      `### Deploy to SureCart — ${result.actionTaken}`,
      '',
      `**Mode:** ${modeLabel}`,
      `**Products:** ${productUuids.length}`,
      `**Downloads created/found:** ${result.downloadIds.length}`,
    ];
    if (result.mediaIds && result.mediaIds.length > 0) {
      lines.push(`**Media uploaded:** ${result.mediaIds.length}`);
    }
    if (result.publicUrls.length > 0) {
      lines.push('', '**Public URLs:**');
      for (const u of result.publicUrls) lines.push(`- ${u}`);
    }
    appendFileSync(summary, lines.join('\n') + '\n');
  }
}

main().catch((err) => {
  core.setFailed(err instanceof Error ? err.message : String(err));
});
