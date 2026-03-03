import * as github from '@actions/github';
import { SecurePRReview } from '../lib/SecurePRReview';
import { PRAnalysisResult } from '../lib/types';

describe('SecurePRReview skipped AI path', () => {
  beforeEach(() => {
    (github.context as any).payload = {
      pull_request: {
        number: 24,
        head: { sha: 'head-sha' },
        base: { sha: 'base-sha' },
      },
    };
  });

  it('approves low-risk PRs when detailed AI review is skipped by policy', async () => {
    const config: any = {
      get: jest.fn((key: string) => {
        if (key === 'securityAnalysis') return false;
        if (key === 'approvedThreshold') return 7;
        throw new Error(`Unexpected config key: ${key}`);
      }),
    };

    const logger: any = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      startGroup: jest.fn(),
      endGroup: jest.fn(),
    };

    const reviewer = new SecurePRReview({
      octokit: {} as any,
      config,
      logger,
      repo: { owner: 'acme', repo: 'demo' },
    });

    const analysis: PRAnalysisResult = {
      valid: true,
      filesChanged: ['docs/readme.md'],
      additions: 3,
      deletions: 1,
      totalChanges: 4,
      complexity: 'low',
      hasSecuritySensitiveFiles: false,
      shouldReview: false,
      reason: 'Tiny docs-only change',
    };

    const analyze = jest.fn().mockResolvedValue(analysis);
    const aiReview = jest.fn();
    const postReview = jest.fn().mockResolvedValue(undefined);
    const postSummary = jest.fn().mockResolvedValue(undefined);

    (reviewer as any).prAnalyzer = { analyze };
    (reviewer as any).aiReviewer = { review: aiReview };
    (reviewer as any).securityScanner = { scan: jest.fn() };
    (reviewer as any).commentPoster = {
      postReview,
      postSummary,
      postSecurityNotice: jest.fn(),
    };

    const result = await reviewer.execute();

    expect(aiReview).not.toHaveBeenCalled();
    expect(postReview).toHaveBeenCalledWith(
      expect.objectContaining({
        approved: true,
        overallScore: 7,
        commitSha: 'head-sha',
      })
    );
    expect(result).toEqual(
      expect.objectContaining({
        status: 'approved',
        approved: true,
        score: 7,
        summary: expect.stringContaining('Detailed AI review skipped by policy'),
      })
    );
  });
});

