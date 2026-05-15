export type RunV1Params = {
    mediaUuid: string;
    productUuids: string[];
    setAsCurrentRelease: boolean;
    duplicateBehavior: 'warn' | 'error';
    apiToken: string;
    dryRun: boolean;
};
export type RunResult = {
    downloadIds: string[];
    publicUrls: string[];
    objectKeys: string[];
    actionTaken: 'created' | 'partial' | 'skipped';
};
export declare function runV1Mode(params: RunV1Params): Promise<RunResult>;
