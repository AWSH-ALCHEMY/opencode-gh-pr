export declare function getHeadDiff(baseSha?: string): Promise<string>;
export declare function getChangedFilesBetween(baseSha: string, headSha: string): Promise<string[]>;
export declare function getDiffBetween(baseSha: string, headSha: string, options?: {
    unified?: number;
}): Promise<string>;
//# sourceMappingURL=GitDiff.d.ts.map