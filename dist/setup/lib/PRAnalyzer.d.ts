import { Octokit } from '@octokit/rest';
import { ActionConfig } from './ActionConfig';
import { Logger } from './Logger';
import { PRAnalysisResult } from './types';
export declare class PRAnalyzer {
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
    analyze(): Promise<PRAnalysisResult>;
    private validateConstraints;
    private determineComplexity;
    private checkSecurityFiles;
    private shouldPerformReview;
}
//# sourceMappingURL=PRAnalyzer.d.ts.map