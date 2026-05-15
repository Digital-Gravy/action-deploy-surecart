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
exports.runV1Mode = runV1Mode;
const core = __importStar(require("@actions/core"));
const createDownload_1 = require("./createDownload");
const setCurrentRelease_1 = require("./setCurrentRelease");
async function runV1Mode(params) {
    const downloadIds = [];
    let anyDuplicate = false;
    for (const productUuid of params.productUuids) {
        core.info(`--- Product ${productUuid} ---`);
        if (params.dryRun) {
            core.info(`[DRY-RUN] POST /v1/downloads {download: {product:"${productUuid}", media_id:"${params.mediaUuid}"}}`);
            if (params.setAsCurrentRelease) {
                core.info(`[DRY-RUN] PATCH /v1/products/${productUuid} {current_release_download:"<id>"}`);
            }
            continue;
        }
        const result = await (0, createDownload_1.createDownload)({
            productUuid,
            mediaId: params.mediaUuid,
            apiToken: params.apiToken,
            behavior: params.duplicateBehavior,
        });
        if (result.isDuplicate)
            anyDuplicate = true;
        if (result.id) {
            downloadIds.push(result.id);
            core.info(`Download ${result.id} ${result.isDuplicate ? '(existing — duplicate)' : 'created'}`);
            if (params.setAsCurrentRelease) {
                await (0, setCurrentRelease_1.setCurrentRelease)({
                    productUuid,
                    downloadId: result.id,
                    apiToken: params.apiToken,
                });
                core.info(`Set as current release.`);
            }
        }
        else {
            core.warning(`Duplicate media on product ${productUuid} and no existing download_id surfaced; skipping current-release update.`);
        }
    }
    return {
        downloadIds,
        publicUrls: [],
        objectKeys: [],
        actionTaken: params.dryRun ? 'skipped' : anyDuplicate ? 'partial' : 'created',
    };
}
