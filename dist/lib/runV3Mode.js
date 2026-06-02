"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.runV3Mode = runV3Mode;
const core = __importStar(require("@actions/core"));
const node_path_1 = require("node:path");
const node_os_1 = require("node:os");
const node_fs_1 = require("node:fs");
const assetNameMatcher_1 = require("./assetNameMatcher");
const createDownload_1 = require("./createDownload");
const createMedia_1 = require("./createMedia");
const directUpload_1 = require("./directUpload");
const downloadAsset_1 = require("./downloadAsset");
const findReleaseAssets_1 = require("./findReleaseAssets");
const md5Base64File_1 = require("./md5Base64File");
const pollMediaRelease_1 = require("./pollMediaRelease");
const putToStorage_1 = require("./putToStorage");
const resolveTag_1 = require("./resolveTag");
const setCurrentRelease_1 = require("./setCurrentRelease");
async function runV3Mode(params) {
    const tag = await (0, resolveTag_1.resolveTag)(params.releaseTag, params.repo, params.githubToken);
    core.info(`Resolved tag: ${tag}`);
    const assets = await (0, findReleaseAssets_1.findReleaseAssets)(tag, params.repo, params.githubToken, params.assetPattern);
    core.info(`Matched ${assets.length} asset(s): ${assets.map((a) => a.name).join(', ')}`);
    const uploaded = [];
    for (const asset of assets) {
        const tmpPath = (0, node_path_1.join)((0, node_os_1.tmpdir)(), asset.name);
        if (params.dryRun) {
            core.info(`[DRY-RUN] would download ${asset.name} (${asset.size} bytes) from GitHub`);
            core.info(`[DRY-RUN] would POST /v1/direct_upload/private + PUT to SureCart storage`);
            core.info(`[DRY-RUN] would POST /v1/medias and poll for release_json.version`);
            uploaded.push({ name: asset.name, mediaId: '<dry-run>', version: '<dry-run>' });
            continue;
        }
        core.info(`Downloading ${asset.name} (${asset.size} bytes)...`);
        await (0, downloadAsset_1.downloadAsset)(asset.downloadUrl, params.githubToken, tmpPath);
        const checksum = await (0, md5Base64File_1.md5Base64File)(tmpPath);
        const byteSize = (0, node_fs_1.statSync)(tmpPath).size;
        core.info(`Reserving direct-upload blob for ${asset.name}...`);
        const { signedId, uploadUrl, headers } = await (0, directUpload_1.directUpload)({
            filename: asset.name,
            contentType: 'application/zip',
            byteSize,
            checksum,
            apiToken: params.apiToken,
        });
        core.info(`Uploading ${asset.name} to SureCart storage...`);
        await (0, putToStorage_1.putToStorage)({ uploadUrl, headers, localPath: tmpPath });
        core.info(`Creating media for ${asset.name}...`);
        const media = await (0, createMedia_1.createMedia)({ signedId, apiToken: params.apiToken });
        core.info(`Waiting for SureCart to recognise the version for ${asset.name}...`);
        const release = await (0, pollMediaRelease_1.pollMediaRelease)({
            mediaId: media.id,
            apiToken: params.apiToken,
            timeoutSeconds: params.ingestTimeoutSeconds,
            intervalSeconds: params.ingestPollIntervalSeconds,
        });
        const version = String(release.version);
        core.info(`Media ${media.id} ingested — version ${version}`);
        if (params.expectedVersion && version !== params.expectedVersion) {
            throw new Error(`Version mismatch for ${asset.name}: SureCart parsed "${version}" but expected_version is "${params.expectedVersion}". ` +
                `Aborting — refusing to publish a release whose parsed version does not match.`);
        }
        uploaded.push({ name: asset.name, mediaId: media.id, version });
        try {
            (0, node_fs_1.unlinkSync)(tmpPath);
        }
        catch {
            // ignore
        }
    }
    const downloadIds = [];
    const mediaIds = uploaded.map((u) => u.mediaId);
    const currentReleaseByProduct = {};
    let anyDuplicate = false;
    for (const productUuid of params.productUuids) {
        core.info(`--- Product ${productUuid} ---`);
        let firstAssetMatched = false;
        for (const media of uploaded) {
            if (params.dryRun) {
                core.info(`[DRY-RUN] POST /v1/downloads {download: {product:"${productUuid}", media_id:"${media.mediaId}"}}`);
                continue;
            }
            const result = await (0, createDownload_1.createDownload)({
                productUuid,
                mediaId: media.mediaId,
                apiToken: params.apiToken,
                behavior: params.duplicateBehavior,
            });
            if (result.isDuplicate)
                anyDuplicate = true;
            if (result.id) {
                downloadIds.push(result.id);
                core.info(`Download ${result.id} for ${media.name} (v${media.version}) ${result.isDuplicate ? '(existing — duplicate media)' : 'created'}`);
                const matchesCurrent = params.currentReleaseAssetPattern
                    ? (0, assetNameMatcher_1.matchesGlob)(media.name, params.currentReleaseAssetPattern)
                    : !firstAssetMatched;
                if (matchesCurrent && !currentReleaseByProduct[productUuid]) {
                    currentReleaseByProduct[productUuid] = result.id;
                }
                firstAssetMatched = true;
            }
            else {
                core.warning(`Duplicate media on ${media.name} for product ${productUuid} and no existing download_id surfaced.`);
            }
        }
    }
    if (params.setAsCurrentRelease) {
        if (params.dryRun) {
            core.info(`[DRY-RUN] would PATCH current_release_download on ${params.productUuids.length} product(s)`);
        }
        else {
            for (const [productUuid, downloadId] of Object.entries(currentReleaseByProduct)) {
                await (0, setCurrentRelease_1.setCurrentRelease)({
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
