import { Octokit } from '@octokit/rest';
import { ActionConfig } from './ActionConfig';
import { Logger } from './Logger';
import { ReviewResult } from './types';
export interface SecurePRReviewOptions {
    octokit: Octokit;
    config: ActionConfig;
    logger: Logger;
    repo: {
        owner: string;
        repo: string;
    };
}
export declare class SecurePRReview {
    private readonly octokit;
    private readonly config;
    private readonly logger;
    private readonly prNumber;
    private readonly commitSha;
    private readonly baseSha;
    private readonly repo;
    private prAnalyzer;
    private aiReviewer;
    private securityScanner;
    private commentPoster;
    constructor(options: SecurePRReviewOptions);
    execute(): Promise<ReviewResult>;
    private createFinalResult;
    private createFallbackResult;
    private createSkippedReviewResult;
}
//# sourceMappingURL=SecurePRReview.d.ts.map