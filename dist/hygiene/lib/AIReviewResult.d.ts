import { AIReviewResult } from './types';
export declare function withAIReviewDefaults(review: Partial<AIReviewResult> & {
    issues?: AIReviewResult['issues'];
}, options: {
    commitSha: string;
    defaultSummary?: string;
}): AIReviewResult;
//# sourceMappingURL=AIReviewResult.d.ts.map