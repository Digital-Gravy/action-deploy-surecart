import * as core from '@actions/core';
import { createDownload } from './createDownload';
import { setCurrentRelease } from './setCurrentRelease';

export type RunV1Params = {
  mediaUuid: string;
  productUuids: string[];
  setAsCurrentRelease: boolean;
  duplicateBehavior: 'warn' | 'error';
  apiToken: string;
  dryRun: boolean;
};

export type RunResult = {
  downloadIds: string[];
  publicUrls: string[];
  objectKeys: string[];
  actionTaken: 'created' | 'partial' | 'skipped';
};

export async function runV1Mode(params: RunV1Params): Promise<RunResult> {
  const downloadIds: string[] = [];
  let anyDuplicate = false;

  for (const productUuid of params.productUuids) {
    core.info(`--- Product ${productUuid} ---`);

    if (params.dryRun) {
      core.info(
        `[DRY-RUN] POST /v1/downloads {download: {product:"${productUuid}", media_id:"${params.mediaUuid}"}}`
      );
      if (params.setAsCurrentRelease) {
        core.info(`[DRY-RUN] PATCH /v1/products/${productUuid} {current_release_download:"<id>"}`);
      }
      continue;
    }

    const result = await createDownload({
      productUuid,
      mediaId: params.mediaUuid,
      apiToken: params.apiToken,
      behavior: params.duplicateBehavior,
    });
    if (result.isDuplicate) anyDuplicate = true;

    if (result.id) {
      downloadIds.push(result.id);
      core.info(
        `Download ${result.id} ${result.isDuplicate ? '(existing — duplicate)' : 'created'}`
      );
      if (params.setAsCurrentRelease) {
        await setCurrentRelease({
          productUuid,
          downloadId: result.id,
          apiToken: params.apiToken,
        });
        core.info(`Set as current release.`);
      }
    } else {
      core.warning(
        `Duplicate media on product ${productUuid} and no existing download_id surfaced; skipping current-release update.`
      );
    }
  }

  return {
    downloadIds,
    publicUrls: [],
    objectKeys: [],
    actionTaken: params.dryRun ? 'skipped' : anyDuplicate ? 'partial' : 'created',
  };
}
