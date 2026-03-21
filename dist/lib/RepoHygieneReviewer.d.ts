import { Logger } from './Logger';
import { RepoHygieneResult, RepoHygienePolicy } from './types';
export declare class RepoHygieneReviewer {
    private readonly logger;
    private readonly policy;
    private readonly prompts;
    constructor(options: {
        logger: Logger;
        policy: RepoHygienePolicy;
    });
    run(baseSha: string, headSha: string): Promise<{
        shouldFail: boolean;
        result: RepoHygieneResult;
        severeFindings: RepoHygieneResult['findings'];
        changedFiles: string[];
    }>;
    private getChangedFiles;
    private getDiff;
    private callOpenCode;
    private parseResult;
    private getSevereFindings;
    private buildPrompt;
    private normalizeSeverity;
    private normalizeConfidence;
}
//# sourceMappingURL=RepoHygieneReviewer.d.ts.map