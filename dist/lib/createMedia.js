"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMedia = createMedia;
/**
 * Attach an uploaded blob (by signed_id) to a SureCart Media record. The
 * version is recognised asynchronously, so release_json is typically null in
 * this immediate response — poll the media afterwards (see pollMediaRelease)
 * until the version appears.
 */
async function createMedia(params) {
    const fetcher = params.fetcher ?? fetch;
    const res = await fetcher('https://api.surecart.com/v1/medias', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${params.apiToken}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
        },
        body: JSON.stringify({ media: { direct_upload_signed_id: params.signedId } }),
    });
    if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`SureCart POST /v1/medias returned ${res.status}: ${text}`);
    }
    const data = (await res.json());
    return { id: data.id, releaseJson: data.release_json ?? null };
}
