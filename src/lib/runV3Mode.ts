import * as core from '@actions/core';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { statSync, unlinkSync } from 'node:fs';
import { matchesGlob } from './assetNameMatcher';
import { createDownload } from './createDownload';
import { createMedia } from './createMedia';
import { directUpload } from './directUpload';
import { downloadAsset } from './downloadAsset';
import { findReleaseAssets } from './findReleaseAssets';
import { md5Base64File } from './md5Base64File';
import { pollMediaRelease } from './pollMediaRelease';
import { putToStorage } from './putToStorage';
import { resolveTag } from './resolveTag';
import { setCurrentRelease } from './setCurrentRelease';
import type { RunResult } from './runV1Mode';

export type RunV3Params = {
  releaseTag: string;
  repo: string;
  githubToken: string;
  assetPattern: string;
  currentReleaseAssetPattern: string;
  productUuids: string[];
  setAsCurrentRelease: boolean;
  duplicateBehavior: 'warn' | 'error';
  apiToken: string;
  ingestTimeoutSeconds: number;
  ingestPollIntervalSeconds: number;
  expectedVersion: string;
  dryRun: boolean;
};

type UploadedMedia = {
  name: string;
  mediaId: string;
  version: string;
};

export async function runV3Mode(params: RunV3Params): Promise<RunResult> {
  const tag = await resolveTag(params.releaseTag, params.repo, params.githubToken);
  core.info(`Resolved tag: ${tag}`);

  const assets = await findReleaseAssets(tag, params.repo, params.githubToken, params.assetPattern);
  core.info(`Matched ${assets.length} asset(s): ${assets.map((a) => a.name).join(', ')}`);

  const uploaded: UploadedMedia[] = [];

  for (const asset of assets) {
    const tmpPath = join(tmpdir(), asset.name);

    if (params.dryRun) {
      core.info(`[DRY-RUN] would download ${asset.name} (${asset.size} bytes) from GitHub`);
      core.info(`[DRY-RUN] would POST /v1/direct_upload/private + PUT to SureCart storage`);
      core.info(`[DRY-RUN] would POST /v1/medias and poll for release_json.version`);
      uploaded.push({ name: asset.name, mediaId: '<dry-run>', version: '<dry-run>' });
      continue;
    }

    core.info(`Downloading ${asset.name} (${asset.size} bytes)...`);
    await downloadAsset(asset.downloadUrl, params.githubToken, tmpPath);

    const checksum = await md5Base64File(tmpPath);
    const byteSize = statSync(tmpPath).size;

    core.info(`Reserving direct-upload blob for ${asset.name}...`);
    const { signedId, uploadUrl, headers } = await directUpload({
      filename: asset.name,
      contentType: 'application/zip',
      byteSize,
      checksum,
      apiToken: params.apiToken,
    });

    core.info(`Uploading ${asset.name} to SureCart storage...`);
    await putToStorage({ uploadUrl, headers, localPath: tmpPath });

    core.info(`Creating media for ${asset.name}...`);
    const media = await createMedia({ signedId, apiToken: params.apiToken });

    core.info(`Waiting for SureCart to recognise the version for ${asset.name}...`);
    const release = await pollMediaRelease({
      mediaId: media.id,
      apiToken: params.apiToken,
      timeoutSeconds: params.ingestTimeoutSeconds,
      intervalSeconds: params.ingestPollIntervalSeconds,
    });
    const version = String(release.version);
    core.info(`Media ${media.id} ingested — version ${version}`);

    if (params.expectedVersion && version !== params.expectedVersion) {
      throw new Error(
        `Version mismatch for ${asset.name}: SureCart parsed "${version}" but expected_version is "${params.expectedVersion}". ` +
          `Aborting — refusing to publish a release whose parsed version does not match.`
      );
    }

    uploaded.push({ name: asset.name, mediaId: media.id, version });

    try {
      unlinkSync(tmpPath);
    } catch {
      // ignore
    }
  }

  const downloadIds: string[] = [];
  const mediaIds = uploaded.map((u) => u.mediaId);
  const currentReleaseByProduct: Record<string, string> = {};
  let anyDuplicate = false;

  for (const productUuid of params.productUuids) {
    core.info(`--- Product ${productUuid} ---`);
    let firstAssetMatched = false;

    for (const media of uploaded) {
      if (params.dryRun) {
        core.info(
          `[DRY-RUN] POST /v1/downloads {download: {product:"${productUuid}", media_id:"${media.mediaId}"}}`
        );
        continue;
      }

      const result = await createDownload({
        productUuid,
        mediaId: media.mediaId,
        apiToken: params.apiToken,
        behavior: params.duplicateBehavior,
      });
      if (result.isDuplicate) anyDuplicate = true;

      if (result.id) {
        downloadIds.push(result.id);
        core.info(
          `Download ${result.id} for ${media.name} (v${media.version}) ${result.isDuplicate ? '(existing — duplicate media)' : 'created'}`
        );

        const matchesCurrent = params.currentReleaseAssetPattern
          ? matchesGlob(media.name, params.currentReleaseAssetPattern)
          : !firstAssetMatched;

        if (matchesCurrent && !currentReleaseByProduct[productUuid]) {
          currentReleaseByProduct[productUuid] = result.id;
        }
        firstAssetMatched = true;
      } else {
        core.warning(
          `Duplicate media on ${media.name} for product ${productUuid} and no existing download_id surfaced.`
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
    publicUrls: [],
    objectKeys: [],
    mediaIds,
    actionTaken: params.dryRun ? 'skipped' : anyDuplicate ? 'partial' : 'created',
  };
}
