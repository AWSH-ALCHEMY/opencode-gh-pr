import { withAIReviewDefaults } from '../lib/AIReviewResult';

describe('AIReviewResult', () => {
  it('fills default values when fields are missing', () => {
    const result = withAIReviewDefaults({}, { commitSha: 'abc123', defaultSummary: 'fallback' });

    expect(result).toEqual({
      summary: 'fallback',
      issues: [],
      overallScore: 0,
      approved: false,
      reviewComments: [],
      commitSha: 'abc123',
    });
  });

  it('preserves provided fields', () => {
    const issues = [
      {
        file: 'src/a.ts',
        line: 1,
        severity: 'warning' as const,
        category: 'bug' as const,
        message: 'm',
        suggestion: 's',
      },
    ];

    const result = withAIReviewDefaults(
      {
        summary: 'ok',
        issues,
        overallScore: 8,
        approved: true,
        reviewComments: ['note'],
      },
      { commitSha: 'head-sha' }
    );

    expect(result.summary).toBe('ok');
    expect(result.issues).toEqual(issues);
    expect(result.overallScore).toBe(8);
    expect(result.approved).toBe(true);
    expect(result.reviewComments).toEqual(['note']);
    expect(result.commitSha).toBe('head-sha');
  });
});
