import type { ReleaseJson } from './createMedia';
export type PollMediaReleaseParams = {
    mediaId: string;
    apiToken: string;
    timeoutSeconds: number;
    intervalSeconds: number;
    fetcher?: typeof fetch;
    sleep?: (ms: number) => Promise<void>;
};
/**
 * Poll a SureCart Media until release_json.version is populated, then return
 * that release_json. Throws (fails loud) if the version never appears within
 * the timeout — a silent miss would ship a release with no version.
 */
export declare function pollMediaRelease(params: PollMediaReleaseParams): Promise<ReleaseJson>;
