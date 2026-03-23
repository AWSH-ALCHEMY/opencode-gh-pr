import { Logger } from './Logger';
import { PRAnalysisResult, AIReviewResult } from './types';
export declare class AIReviewer {
    private readonly logger;
    private readonly baseSha;
    private readonly prompts;
    constructor(options: {
        logger: Logger;
        baseSha?: string;
        promptRegistryPath?: string;
    });
    review(prAnalysis: PRAnalysisResult, commitSha: string): Promise<AIReviewResult | null>;
    private callAIAPI;
    private buildReviewContent;
    private getDiff;
    private createFallbackReview;
    private normalizeIssues;
    private normalizeLine;
    private resolveIssueFile;
}
//# sourceMappingURL=AIReviewer.d.ts.map