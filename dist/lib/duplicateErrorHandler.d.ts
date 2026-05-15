export type DuplicateOutcome = {
    kind: 'duplicate';
    downloadId: string | null;
} | {
    kind: 'not-duplicate';
};
export declare function detectDuplicate(responseBody: unknown): DuplicateOutcome;
