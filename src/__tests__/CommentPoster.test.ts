import { CommentPoster } from '../lib/CommentPoster';
import { AIReviewResult } from '../lib/types';

describe('CommentPoster review events', () => {
  const makeReview = (approved: boolean): AIReviewResult => ({
    summary: approved ? 'approved summary' : 'changes requested summary',
    issues: [],
    overallScore: approved ? 9 : 3,
    approved,
    reviewComments: [],
    commitSha: 'abc123',
  });

  const makePoster = () => {
    const createReview = jest.fn().mockResolvedValue({});
    const octokit: any = {
      paginate: jest.fn(),
      pulls: {
        listReviews: Symbol('listReviews'),
        listFiles: Symbol('listFiles'),
        createReview,
      },
    };

    octokit.paginate.mockImplementation((endpoint: unknown) => {
      if (endpoint === octokit.pulls.listReviews) {
        return Promise.resolve([]);
      }
      if (endpoint === octokit.pulls.listFiles) {
        return Promise.resolve([
          {
            filename: 'src/example.ts',
            patch: '@@ -1 +1 @@\n-old\n+new',
          },
        ]);
      }
      return Promise.resolve([]);
    });

    const config: any = { get: jest.fn() };
    const logger: any = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      startGroup: jest.fn(),
      endGroup: jest.fn(),
    };

    const poster = new CommentPoster({
      octokit,
      config,
      logger,
      repo: { owner: 'acme', repo: 'demo' },
      prNumber: 42,
    });

    return { createReview, poster };
  };

  it('submits APPROVE when AI review is approved', async () => {
    const { createReview, poster } = makePoster();
    await (poster as any).postInlineReviewComments(makeReview(true));
    expect(createReview).toHaveBeenCalledWith(expect.objectContaining({ event: 'APPROVE' }));
  });

  it('submits REQUEST_CHANGES when AI review is not approved', async () => {
    const { createReview, poster } = makePoster();
    await (poster as any).postInlineReviewComments(makeReview(false));
    expect(createReview).toHaveBeenCalledWith(expect.objectContaining({ event: 'REQUEST_CHANGES' }));
  });
});

