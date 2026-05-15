"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildObjectKey = buildObjectKey;
const node_path_1 = require("node:path");
function buildObjectKey(prefix, assetName, sha) {
    const ext = (0, node_path_1.extname)(assetName);
    const base = (0, node_path_1.basename)(assetName, ext);
    const cleanPrefix = prefix.replace(/^\/+|\/+$/g, '');
    return `${cleanPrefix}/${base}-${sha}${ext}`;
}
