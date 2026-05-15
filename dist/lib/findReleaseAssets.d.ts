export type ReleaseAsset = {
    name: string;
    downloadUrl: string;
    size: number;
};
export declare function findReleaseAssets(tag: string, repo: string, token: string, pattern: string, fetcher?: typeof fetch): Promise<ReleaseAsset[]>;
