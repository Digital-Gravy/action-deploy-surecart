"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.putToStorage = putToStorage;
const promises_1 = require("node:fs/promises");
/**
 * PUT a local file to a presigned storage URL. The headers MUST be the ones
 * returned by directUpload (Content-Type, Content-MD5) — S3 signs them, so
 * any mismatch or omission is rejected with a signature error.
 */
async function putToStorage(params) {
    const fetcher = params.fetcher ?? fetch;
    const body = await (0, promises_1.readFile)(params.localPath);
    const res = await fetcher(params.uploadUrl, {
        method: 'PUT',
        headers: params.headers,
        body,
    });
    if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Storage PUT to presigned URL returned ${res.status}: ${text}`);
    }
}
