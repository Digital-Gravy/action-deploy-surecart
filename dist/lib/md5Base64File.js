"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.md5Base64File = md5Base64File;
const node_crypto_1 = require("node:crypto");
const node_fs_1 = require("node:fs");
/**
 * Streamed MD5 of a file, base64-encoded — the checksum format the SureCart
 * direct-upload expects for a blob (Content-MD5 on the presigned PUT).
 * Distinct from hashFile, which returns a hex sha256.
 */
async function md5Base64File(path) {
    const hash = (0, node_crypto_1.createHash)('md5');
    const stream = (0, node_fs_1.createReadStream)(path);
    for await (const chunk of stream) {
        hash.update(chunk);
    }
    return hash.digest('base64');
}
