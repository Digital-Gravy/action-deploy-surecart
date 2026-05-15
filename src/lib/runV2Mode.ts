import * as core from '@actions/core';
import { join, extname, basename } from 'node:path';
import { tmpdir } from 'node:os';
import { unlinkSync } from 'node:fs';
import { matchesGlob } from './assetNameMatcher';
import { buildObjectKey } from './buildObjectKey';
import { buildPublicUrl } from './buildPublicUrl';
import { createDownload } from './createDownload';
import { downloadAsset } from './downloadAsset';
import { findReleaseAssets } from './findReleaseAssets';
import { hashFile } from './hashFile';
import { resolveTag } from './resolveTag';
import { setCurrentRelease } from './setCurrentRelease';
import { createR2Client, uploadToR2 } from './uploadToR2';
import type { RunResult } from './runV1Mode';

export type RunV2Params = {
  releaseTag: string;
  repo: string;
  githubToken: string;
  assetPattern: string;
  currentReleaseAssetPattern: string;
  objectKeyPrefix: string;
  productUuids: string[];
  setAsCurrentRelease: boolean;
  duplicateBehavior: 'warn' | 'error';
  apiToken: string;
  r2AccountId: string;
  r2AccessKeyId: string;
  r2SecretAccessKey: string;
  r2Bucket: string;
  r2PublicBaseUrl: string;
  dryRun: boolean;
};

type UploadedAsset = {
  name: string;
  publicUrl: string;
  objectKey: string;
};

export async function runV2Mode(params: RunV2Params): Promise<RunResult> {
  const tag = await resolveTag(params.releaseTag, params.repo, params.githubToken);
  core.info(`Resolved tag: ${tag}`);

  const assets = await findReleaseAssets(tag, params.repo, params.githubToken, params.assetPattern);
  core.info(`Matched ${assets.length} asset(s): ${assets.map((a) => a.name).join(', ')}`);

  const r2Client = createR2Client({
    accountId: params.r2AccountId,
    accessKeyId: params.r2AccessKeyId,
    secretAccessKey: params.r2SecretAccessKey,
  });

  const uploaded: UploadedAsset[] = [];

  for (const asset of assets) {
    const tmpPath = join(tmpdir(), asset.name);

    if (params.dryRun) {
      core.info(`[DRY-RUN] would download ${asset.name} (${asset.size} bytes) from GitHub`);
      const placeholderSha = '<sha16-not-computed-in-dry-run>';
      const key = buildObjectKey(params.objectKeyPrefix, asset.name, placeholderSha);
      const url = buildPublicUrl(params.r2PublicBaseUrl, key);
      core.info(`[DRY-RUN] would PUT to s3://${params.r2Bucket}/${key}`);
      uploaded.push({ name: asset.name, publicUrl: url, objectKey: key });
      continue;
    }

    core.info(`Downloading ${asset.name} (${asset.size} bytes)...`);
    await downloadAsset(asset.downloadUrl, params.githubToken, tmpPath);

    const sha = await hashFile(tmpPath);
    const key = buildObjectKey(params.objectKeyPrefix, asset.name, sha);
    const url = buildPublicUrl(params.r2PublicBaseUrl, key);

    core.info(`Uploading to s3://${params.r2Bucket}/${key}...`);
    await uploadToR2({
      bucket: params.r2Bucket,
      key,
      localPath: tmpPath,
      client: r2Client,
    });
    core.info(`Uploaded → ${url}`);

    uploaded.push({ name: asset.name, publicUrl: url, objectKey: key });

    try {
      unlinkSync(tmpPath);
    } catch {
      // ignore
    }
  }

  const downloadIds: string[] = [];
  const currentReleaseByProduct: Record<string, string> = {};
  let anyDuplicate = false;

  for (const productUuid of params.productUuids) {
    core.info(`--- Product ${productUuid} ---`);
    let firstAssetMatched = false;

    for (const asset of uploaded) {
      const downloadName = basename(asset.name, extname(asset.name));

      if (params.dryRun) {
        core.info(
          `[DRY-RUN] POST /v1/downloads {download: {product:"${productUuid}", url:"${asset.publicUrl}", name:"${downloadName}", enabled:true}}`
        );
        continue;
      }

      const result = await createDownload({
        productUuid,
        externalUrl: asset.publicUrl,
        name: downloadName,
        apiToken: params.apiToken,
        behavior: params.duplicateBehavior,
      });
      if (result.isDuplicate) anyDuplicate = true;

      if (result.id) {
        downloadIds.push(result.id);
        core.info(
          `Download ${result.id} for ${asset.name} ${result.isDuplicate ? '(existing — duplicate URL)' : 'created'}`
        );

        const matchesCurrent = params.currentReleaseAssetPattern
          ? matchesGlob(asset.name, params.currentReleaseAssetPattern)
          : !firstAssetMatched;

        if (matchesCurrent && !currentReleaseByProduct[productUuid]) {
          currentReleaseByProduct[productUuid] = result.id;
        }
        firstAssetMatched = true;
      } else {
        core.warning(
          `Duplicate URL on ${asset.name} for product ${productUuid} and no existing download_id surfaced.`
        );
      }
    }
  }

  if (params.setAsCurrentRelease) {
    if (params.dryRun) {
      core.info(
        `[DRY-RUN] would PATCH current_release_download on ${params.productUuids.length} product(s)`
      );
    } else {
      for (const [productUuid, downloadId] of Object.entries(currentReleaseByProduct)) {
        await setCurrentRelease({
          productUuid,
          downloadId,
          apiToken: params.apiToken,
        });
        core.info(`Set ${downloadId} as current_release_download on ${productUuid}`);
      }
    }
  }

  return {
    downloadIds,
    publicUrls: uploaded.map((u) => u.publicUrl),
    objectKeys: uploaded.map((u) => u.objectKey),
    actionTaken: params.dryRun ? 'skipped' : anyDuplicate ? 'partial' : 'created',
  };
}
