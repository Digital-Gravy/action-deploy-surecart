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
exports.runV2Mode = runV2Mode;
const core = __importStar(require("@actions/core"));
const node_path_1 = require("node:path");
const node_os_1 = require("node:os");
const node_fs_1 = require("node:fs");
const assetNameMatcher_1 = require("./assetNameMatcher");
const buildObjectKey_1 = require("./buildObjectKey");
const buildPublicUrl_1 = require("./buildPublicUrl");
const createDownload_1 = require("./createDownload");
const downloadAsset_1 = require("./downloadAsset");
const findReleaseAssets_1 = require("./findReleaseAssets");
const hashFile_1 = require("./hashFile");
const resolveTag_1 = require("./resolveTag");
const setCurrentRelease_1 = require("./setCurrentRelease");
const uploadToR2_1 = require("./uploadToR2");
async function runV2Mode(params) {
    const tag = await (0, resolveTag_1.resolveTag)(params.releaseTag, params.repo, params.githubToken);
    core.info(`Resolved tag: ${tag}`);
    const assets = await (0, findReleaseAssets_1.findReleaseAssets)(tag, params.repo, params.githubToken, params.assetPattern);
    core.info(`Matched ${assets.length} asset(s): ${assets.map((a) => a.name).join(', ')}`);
    const r2Client = (0, uploadToR2_1.createR2Client)({
        accountId: params.r2AccountId,
        accessKeyId: params.r2AccessKeyId,
        secretAccessKey: params.r2SecretAccessKey,
    });
    const uploaded = [];
    for (const asset of assets) {
        const tmpPath = (0, node_path_1.join)((0, node_os_1.tmpdir)(), asset.name);
        if (params.dryRun) {
            core.info(`[DRY-RUN] would download ${asset.name} (${asset.size} bytes) from GitHub`);
            const placeholderSha = '<sha16-not-computed-in-dry-run>';
            const key = (0, buildObjectKey_1.buildObjectKey)(params.objectKeyPrefix, asset.name, placeholderSha);
            const url = (0, buildPublicUrl_1.buildPublicUrl)(params.r2PublicBaseUrl, key);
            core.info(`[DRY-RUN] would PUT to s3://${params.r2Bucket}/${key}`);
            uploaded.push({ name: asset.name, publicUrl: url, objectKey: key });
            continue;
        }
        core.info(`Downloading ${asset.name} (${asset.size} bytes)...`);
        await (0, downloadAsset_1.downloadAsset)(asset.downloadUrl, params.githubToken, tmpPath);
        const sha = await (0, hashFile_1.hashFile)(tmpPath);
        const key = (0, buildObjectKey_1.buildObjectKey)(params.objectKeyPrefix, asset.name, sha);
        const url = (0, buildPublicUrl_1.buildPublicUrl)(params.r2PublicBaseUrl, key);
        core.info(`Uploading to s3://${params.r2Bucket}/${key}...`);
        await (0, uploadToR2_1.uploadToR2)({
            bucket: params.r2Bucket,
            key,
            localPath: tmpPath,
            client: r2Client,
        });
        core.info(`Uploaded → ${url}`);
        uploaded.push({ name: asset.name, publicUrl: url, objectKey: key });
        try {
            (0, node_fs_1.unlinkSync)(tmpPath);
        }
        catch {
            // ignore
        }
    }
    const downloadIds = [];
    const currentReleaseByProduct = {};
    let anyDuplicate = false;
    for (const productUuid of params.productUuids) {
        core.info(`--- Product ${productUuid} ---`);
        let firstAssetMatched = false;
        for (const asset of uploaded) {
            const downloadName = (0, node_path_1.basename)(asset.name, (0, node_path_1.extname)(asset.name));
            if (params.dryRun) {
                core.info(`[DRY-RUN] POST /v1/downloads {download: {product:"${productUuid}", url:"${asset.publicUrl}", name:"${downloadName}", enabled:true}}`);
                continue;
            }
            const result = await (0, createDownload_1.createDownload)({
                productUuid,
                externalUrl: asset.publicUrl,
                name: downloadName,
                apiToken: params.apiToken,
                behavior: params.duplicateBehavior,
            });
            if (result.isDuplicate)
                anyDuplicate = true;
            if (result.id) {
                downloadIds.push(result.id);
                core.info(`Download ${result.id} for ${asset.name} ${result.isDuplicate ? '(existing — duplicate URL)' : 'created'}`);
                const matchesCurrent = params.currentReleaseAssetPattern
                    ? (0, assetNameMatcher_1.matchesGlob)(asset.name, params.currentReleaseAssetPattern)
                    : !firstAssetMatched;
                if (matchesCurrent && !currentReleaseByProduct[productUuid]) {
                    currentReleaseByProduct[productUuid] = result.id;
                }
                firstAssetMatched = true;
            }
            else {
                core.warning(`Duplicate URL on ${asset.name} for product ${productUuid} and no existing download_id surfaced.`);
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
        publicUrls: uploaded.map((u) => u.publicUrl),
        objectKeys: uploaded.map((u) => u.objectKey),
        actionTaken: params.dryRun ? 'skipped' : anyDuplicate ? 'partial' : 'created',
    };
}
