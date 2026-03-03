import { AIReviewResult } from './types';

export function withAIReviewDefaults(
  review: Partial<AIReviewResult> & { issues?: AIReviewResult['issues'] },
  options: { commitSha: string; defaultSummary?: string }
): AIReviewResult {
  return {
    summary: review.summary || options.defaultSummary || 'AI analysis complete.',
    issues: Array.isArray(review.issues) ? review.issues : [],
    overallScore: typeof review.overallScore === 'number' ? review.overallScore : 0,
    approved: typeof review.approved === 'boolean' ? review.approved : false,
    reviewComments: Array.isArray(review.reviewComments) ? review.reviewComments : [],
    commitSha: options.commitSha,
  };
}
