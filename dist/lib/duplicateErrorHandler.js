"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectDuplicate = detectDuplicate;
const DUPLICATE_MESSAGES = new Set([
    'Media has already been taken',
    'Url has already been taken',
]);
function detectDuplicate(responseBody) {
    const body = responseBody;
    const firstErr = body.validation_errors?.[0];
    if (!firstErr?.message || !DUPLICATE_MESSAGES.has(firstErr.message)) {
        return { kind: 'not-duplicate' };
    }
    return { kind: 'duplicate', downloadId: firstErr.download_id ?? null };
}
