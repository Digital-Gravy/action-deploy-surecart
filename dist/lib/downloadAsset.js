"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.downloadAsset = downloadAsset;
const node_fs_1 = require("node:fs");
const node_stream_1 = require("node:stream");
const promises_1 = require("node:stream/promises");
async function downloadAsset(assetUrl, token, destPath, fetcher = fetch) {
    const res = await fetcher(assetUrl, {
        headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/octet-stream',
        },
    });
    if (!res.ok) {
        throw new Error(`Asset download from ${assetUrl} returned ${res.status}`);
    }
    if (!res.body) {
        throw new Error(`Asset download from ${assetUrl} returned no body`);
    }
    await (0, promises_1.pipeline)(node_stream_1.Readable.fromWeb(res.body), (0, node_fs_1.createWriteStream)(destPath));
}
