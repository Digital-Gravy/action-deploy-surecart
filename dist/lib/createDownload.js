"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDownload = createDownload;
const duplicateErrorHandler_1 = require("./duplicateErrorHandler");
async function createDownload(params) {
    const fetcher = params.fetcher ?? fetch;
    const download = { product: params.productUuid };
    if ('mediaId' in params) {
        download.media_id = params.mediaId;
    }
    else {
        download.url = params.externalUrl;
        download.name = params.name;
        download.enabled = true;
    }
    const res = await fetcher('https://api.surecart.com/v1/downloads', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${params.apiToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ download }),
    });
    if (res.ok) {
        const data = (await res.json());
        return { id: data.id, isDuplicate: false };
    }
    const errBody = (await res.json().catch(() => ({})));
    const dup = (0, duplicateErrorHandler_1.detectDuplicate)(errBody);
    if (dup.kind === 'duplicate') {
        if (params.behavior === 'error') {
            const msg = errBody.validation_errors?.[0]?.message ??
                'duplicate';
            throw new Error(`SureCart rejected duplicate: ${msg}`);
        }
        return { id: dup.downloadId, isDuplicate: true };
    }
    throw new Error(`SureCart /v1/downloads returned ${res.status}: ${JSON.stringify(errBody)}`);
}
