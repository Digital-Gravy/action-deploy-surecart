"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.directUpload = directUpload;
/**
 * Reserve a direct-upload blob on SureCart. Returns a presigned PUT URL + the
 * exact headers that PUT must carry, plus the signed_id used later to attach
 * the uploaded blob to a Media record.
 */
async function directUpload(params) {
    const fetcher = params.fetcher ?? fetch;
    const res = await fetcher('https://api.surecart.com/v1/direct_upload/private', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${params.apiToken}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
        },
        body: JSON.stringify({
            blob: {
                filename: params.filename,
                content_type: params.contentType,
                byte_size: params.byteSize,
                checksum: params.checksum,
            },
        }),
    });
    if (!res.ok) {
        const body = await res.text();
        throw new Error(`SureCart POST /v1/direct_upload/private returned ${res.status}: ${body}`);
    }
    const data = (await res.json());
    return {
        signedId: data.signed_id,
        uploadUrl: data.direct_upload.url,
        headers: data.direct_upload.headers,
    };
}
