"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildPublicUrl = buildPublicUrl;
function buildPublicUrl(baseUrl, key) {
    const base = baseUrl.replace(/\/+$/, '');
    const cleanKey = key.replace(/^\/+/, '');
    return `${base}/${cleanKey}`;
}
