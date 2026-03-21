import { Octokit } from '@octokit/rest';
import { ActionConfig } from './ActionConfig';
import { Logger } from './Logger';
import { AIReviewResult, ReviewResult } from './types';
import { SecurityScanResult } from './SecurityScanner';
export declare class CommentPoster {
    private readonly octokit;
    private readonly config;
    private readonly logger;
    private readonly repo;
    private readonly prNumber;
    constructor(options: {
        octokit: Octokit;
        config: ActionConfig;
        logger: Logger;
        repo: {
            owner: string;
            repo: string;
        };
        prNumber: number;
    });
    postReview(review: AIReviewResult): Promise<void>;
    postSecurityNotice(scanResult: SecurityScanResult): Promise<void>;
    postSummary(result: ReviewResult): Promise<void>;
    private upsertComment;
    private mapSeverityToAnnotationLevel;
    private parseRightSideLinesFromPatch;
    private resolveIssuePath;
    private findNearestLine;
    private postInlineReviewComments;
    private createCheckRun;
    private buildReviewComment;
    private buildSecurityComment;
    private buildSummaryComment;
    private applyLabels;
}
//# sourceMappingURL=CommentPoster.d.ts.map