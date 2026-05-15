"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildObjectKey = buildObjectKey;
function buildObjectKey(prefix, assetName, sha) {
    const cleanPrefix = prefix.replace(/^\/+|\/+$/g, '');
    return `${cleanPrefix}/${sha}/${assetName}`;
}
