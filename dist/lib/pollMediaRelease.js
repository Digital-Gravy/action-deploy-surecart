"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pollMediaRelease = pollMediaRelease;
const defaultSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
/**
 * Poll a SureCart Media until release_json.version is populated, then return
 * that release_json. Throws (fails loud) if the version never appears within
 * the timeout — a silent miss would ship a release with no version.
 */
async function pollMediaRelease(params) {
    const fetcher = params.fetcher ?? fetch;
    const sleep = params.sleep ?? defaultSleep;
    const attempts = Math.max(1, Math.floor(params.timeoutSeconds / params.intervalSeconds) + 1);
    for (let i = 0; i < attempts; i++) {
        const res = await fetcher(`https://api.surecart.com/v1/medias/${params.mediaId}`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${params.apiToken}`,
                Accept: 'application/json',
            },
        });
        if (!res.ok) {
            const text = await res.text().catch(() => '');
            throw new Error(`SureCart GET /v1/medias/${params.mediaId} returned ${res.status}: ${text}`);
        }
        const data = (await res.json());
        if (data.release_json?.version) {
            return data.release_json;
        }
        if (i < attempts - 1) {
            await sleep(params.intervalSeconds * 1000);
        }
    }
    throw new Error(`Timed out after ${params.timeoutSeconds}s waiting for release_json.version on media ${params.mediaId}`);
}
