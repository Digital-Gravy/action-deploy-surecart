import type { RunResult } from './runV1Mode';
export type RunV3Params = {
    releaseTag: string;
    repo: string;
    githubToken: string;
    assetPattern: string;
    currentReleaseAssetPattern: string;
    productUuids: string[];
    setAsCurrentRelease: boolean;
    duplicateBehavior: 'warn' | 'error';
    apiToken: string;
    ingestTimeoutSeconds: number;
    ingestPollIntervalSeconds: number;
    expectedVersion: string;
    dryRun: boolean;
};
export declare function runV3Mode(params: RunV3Params): Promise<RunResult>;
