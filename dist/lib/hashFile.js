"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashFile = hashFile;
const node_crypto_1 = require("node:crypto");
const node_fs_1 = require("node:fs");
async function hashFile(path, prefixLength = 16) {
    const hash = (0, node_crypto_1.createHash)('sha256');
    const stream = (0, node_fs_1.createReadStream)(path);
    for await (const chunk of stream) {
        hash.update(chunk);
    }
    return hash.digest('hex').slice(0, prefixLength);
}
