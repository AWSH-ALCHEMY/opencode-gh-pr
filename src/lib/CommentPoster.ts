import { Octokit } from '@octokit/rest';
import { ActionConfig } from './ActionConfig';
import { Logger } from './Logger';
import { AIReviewResult, ReviewResult } from './types';
import { SecurityScanResult } from './SecurityScanner';
import * as path from 'path';

const MAX_INLINE_COMMENTS = 30;
const MAX_ANNOTATIONS = 50;

export class CommentPoster {
  private readonly octokit: Octokit;
  private readonly config: ActionConfig;
  private readonly logger: Logger;
  private readonly repo: { owner: string; repo: string };
  private readonly prNumber: number;
  
  constructor(options: { octokit: Octokit; config: ActionConfig; logger: Logger; repo: { owner: string; repo: string }; prNumber: number; }) {
    this.octokit = options.octokit;
    this.config = options.config;
    this.logger = options.logger;
    this.repo = options.repo;
    this.prNumber = options.prNumber;
  }
  
  async postReview(review: AIReviewResult): Promise<void> {
    this.logger.startGroup('📝 Posting AI Review');
    
    try {
      if (this.config.get('postComments')) {
        const summaryComment = this.buildReviewComment(review);
        await this.upsertComment(summaryComment, 'ai-review-comment');
        await this.postInlineReviewComments(review);
      }
      
      if (this.config.get('createChecks')) {
        await this.createCheckRun(review);
      }
      
      this.logger.info('✅ AI review posted successfully');
      
    } catch (error) {
      this.logger.error('Failed to post AI review', error as Error);
    } finally {
      this.logger.endGroup();
    }
  }
  
  async postSecurityNotice(scanResult: SecurityScanResult): Promise<void> {
    this.logger.startGroup('📝 Posting Security Notice');
    
    try {
      const securityComment = this.buildSecurityComment(scanResult);
      await this.upsertComment(securityComment, 'security-notice-comment');
      this.logger.info('✅ Security notice posted successfully');
      
    } catch (error) {
      this.logger.error('Failed to post security notice', error as Error);
    } finally {
      this.logger.endGroup();
    }
  }
  
  async postSummary(result: ReviewResult): Promise<void> {
    this.logger.startGroup('📝 Posting Final Summary');
    
    try {
      const summaryComment = this.buildSummaryComment(result);
      await this.upsertComment(summaryComment, 'summary-comment');
      
      if (this.config.get('applyLabels')) {
        await this.applyLabels(result);
      }
      
      this.logger.info('✅ Final summary posted successfully');
      
    } catch (error) {
      this.logger.error('Failed to post final summary', error as Error);
    } finally {
      this.logger.endGroup();
    }
  }
  
  private async upsertComment(body: string, identifier: string): Promise<void> {
    const marker = `<!-- ${identifier} -->`;
    const taggedBody = `${body}\n${marker}`;

    const allComments = await this.octokit.paginate(this.octokit.issues.listComments, {
      owner: this.repo.owner,
      repo: this.repo.repo,
      issue_number: this.prNumber,
    });

    const markerComments = allComments.filter(comment => comment.body?.includes(marker));
    const isActionsBot = (login?: string): boolean => {
      if (!login) return false;
      return login === 'github-actions[bot]' || login === 'github-actions';
    };
    const sortByRecency = (a: { updated_at: string; created_at: string }, b: { updated_at: string; created_at: string }): number => {
      const aTime = new Date(a.updated_at ?? a.created_at).getTime();
      const bTime = new Date(b.updated_at ?? b.created_at).getTime();
      return bTime - aTime;
    };

    const botMarkerComment = markerComments
      .filter(comment => isActionsBot(comment.user?.login))
      .sort(sortByRecency)[0];

    const existingComment = botMarkerComment ?? markerComments.sort(sortByRecency)[0];

    if (existingComment) {
      await this.octokit.issues.updateComment({
        owner: this.repo.owner,
        repo: this.repo.repo,
        comment_id: existingComment.id,
        body: taggedBody,
      });
      this.logger.info(`Comment updated: ${existingComment.html_url}`);
    } else {
      try {
        const result = await this.octokit.issues.createComment({
          owner: this.repo.owner,
          repo: this.repo.repo,
          issue_number: this.prNumber,
          body: taggedBody,
        });
        this.logger.info(`Comment created: ${result.data.html_url}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.error(`Failed to create comment: ${errorMessage}`);
        throw error;
      }
    }
  }
  
  private mapSeverityToAnnotationLevel(severity: 'error' | 'warning' | 'info'): 'failure' | 'warning' | 'notice' {
    switch (severity) {
      case 'error':
        return 'failure';
      case 'warning':
        return 'warning';
      case 'info':
        return 'notice';
    }
  }

  private parseRightSideLinesFromPatch(patch: string): Set<number> {
    const rightSideLines = new Set<number>();
    const lines = patch.split('\n');
    let newLine = 0;

    for (const line of lines) {
      const hunkMatch = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
      if (hunkMatch) {
        const hunkStart = hunkMatch[1];
        if (!hunkStart) {
          continue;
        }
        newLine = parseInt(hunkStart, 10);
        continue;
      }

      if (line.startsWith('+') && !line.startsWith('+++')) {
        rightSideLines.add(newLine);
        newLine += 1;
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        // Removed line does not advance new file line cursor
      } else if (line.startsWith(' ')) {
        rightSideLines.add(newLine);
        newLine += 1;
      } else if (line.startsWith('\\ No newline at end of file')) {
        // Metadata line, ignore.
      } else {
        // Skip patch metadata lines.
      }
    }

    return rightSideLines;
  }

  private resolveIssuePath(rawPath: string, changedFiles: string[]): string | null {
    const normalized = rawPath.replace(/^a\//, '').replace(/^b\//, '').trim();
    if (!normalized) {
      return null;
    }

    if (changedFiles.includes(normalized)) {
      return normalized;
    }

    const baseName = path.basename(normalized);
    const byBaseName = changedFiles.filter(f => path.basename(f) === baseName);
    if (byBaseName.length === 1) {
      return byBaseName[0] ?? null;
    }

    const byContains = changedFiles.find(f => f.endsWith(normalized) || normalized.endsWith(f));
    return byContains ?? null;
  }

  private findNearestLine(target: number, candidates: number[]): number {
    return candidates.reduce((best, current) =>
      Math.abs(current - target) < Math.abs(best - target) ? current : best
    );
  }

  private async postInlineReviewComments(review: AIReviewResult): Promise<void> {
    const marker = `<!-- ai-inline-review:${review.commitSha} -->`;

    const existingReviews = await this.octokit.paginate(this.octokit.pulls.listReviews, {
      owner: this.repo.owner,
      repo: this.repo.repo,
      pull_number: this.prNumber,
    });

    const alreadyPosted = existingReviews.some(r =>
      (r.user?.login === 'github-actions[bot]' || r.user?.login === 'github-actions') &&
      (r.body || '').includes(marker)
    );

    if (alreadyPosted) {
      this.logger.info(`Inline review already posted for commit ${review.commitSha}, skipping.`);
      return;
    }

    const filesResponse = await this.octokit.paginate(this.octokit.pulls.listFiles, {
      owner: this.repo.owner,
      repo: this.repo.repo,
      pull_number: this.prNumber,
      per_page: 100,
    });

    const changedFiles = filesResponse.map(f => f.filename);
    const rightSideLinesByFile = new Map<string, Set<number>>();
    for (const f of filesResponse) {
      if (typeof f.patch === 'string') {
        rightSideLinesByFile.set(f.filename, this.parseRightSideLinesFromPatch(f.patch));
      }
    }

    const inlineComments = (review.issues || [])
      .filter(issue => issue.file && issue.file !== 'N/A' && issue.line > 0)
      .map(issue => {
        const resolvedPath = this.resolveIssuePath(issue.file, changedFiles);
        if (!resolvedPath) {
          return null;
        }

        const lines = rightSideLinesByFile.get(resolvedPath);
        if (!lines || lines.size === 0) {
          return null;
        }
        const sortedLines = Array.from(lines).sort((a, b) => a - b);
        const targetLine = lines.has(issue.line) ? issue.line : this.findNearestLine(issue.line, sortedLines);
        return {
          path: resolvedPath,
          line: targetLine,
          side: 'RIGHT' as const,
          body: `**[${issue.severity.toUpperCase()}]** ${issue.message}\n\nSuggestion: ${issue.suggestion}`,
        };
      })
      .filter((comment): comment is { path: string; line: number; side: 'RIGHT'; body: string } => comment !== null)
      .filter((comment, index, all) =>
        all.findIndex(c => c.path === comment.path && c.line === comment.line && c.body === comment.body) === index
      );

    const totalInlineComments = (review.issues || []).filter(issue => issue.file && issue.file !== 'N/A' && issue.line > 0).length;
    const truncatedCount = totalInlineComments - Math.min(inlineComments.length, MAX_INLINE_COMMENTS);
    const displayComments = inlineComments.slice(0, MAX_INLINE_COMMENTS);
    const reviewEvent: 'APPROVE' | 'REQUEST_CHANGES' = review.approved ? 'APPROVE' : 'REQUEST_CHANGES';
    const reviewHeading = review.approved ? '✅ AI Approval Review' : '❌ AI Change Request Review';

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const pullsApi = this.octokit.pulls as unknown as {
      createReview: (params: {
        owner: string;
        repo: string;
        pull_number: number;
        commit_id: string;
        event: 'COMMENT' | 'APPROVE' | 'REQUEST_CHANGES';
        body: string;
        comments?: Array<{
          path: string;
          line: number;
          side: 'RIGHT';
          body: string;
        }>;
      }) => Promise<unknown>;
    };

    if (displayComments.length === 0) {
      await pullsApi.createReview({
        owner: this.repo.owner,
        repo: this.repo.repo,
        pull_number: this.prNumber,
        commit_id: review.commitSha,
        event: reviewEvent,
        body: `## ${reviewHeading}\n\nNo valid inline diff locations were found, so this review was posted without inline anchors.\n\n${marker}`,
      });
      this.logger.info('Posted PR review without inline anchors.');
      return;
    }

    const truncationWarning = truncatedCount > 0 ? `\n\n> ⚠️ Showing first ${MAX_INLINE_COMMENTS} of ${totalInlineComments} inline comments.` : '';
    await pullsApi.createReview({
      owner: this.repo.owner,
      repo: this.repo.repo,
      pull_number: this.prNumber,
      commit_id: review.commitSha,
      event: reviewEvent,
      body: `## ${reviewHeading}\n\nPosted ${displayComments.length} inline comments for this commit.${truncationWarning}\n\n${marker}`,
      comments: displayComments,
    });

    this.logger.info(`Inline review comments posted: ${displayComments.length}${truncatedCount > 0 ? ` (${truncatedCount} truncated)` : ''}`);
  }

  private async createCheckRun(review: AIReviewResult): Promise<void> {
    const annotations = (review.issues || []).map(issue => ({
      path: issue.file,
      start_line: issue.line,
      end_line: issue.line,
      annotation_level: this.mapSeverityToAnnotationLevel(issue.severity),
      message: issue.message,
      title: issue.category,
    }));

    const issuesText = (review.issues || []).map(issue => `- **${issue.file}#L${issue.line}** [${issue.severity}] ${issue.message}`).join('\n');

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const checksApi = this.octokit.checks as unknown as {
      create: (params: {
        owner: string;
        repo: string;
        name: string;
        head_sha: string;
        status: 'completed';
        conclusion: 'success' | 'failure' | 'neutral';
        output: {
          title: string;
          summary: string;
          text: string;
          annotations?: {
            path: string;
            start_line: number;
            end_line: number;
            annotation_level: 'notice' | 'warning' | 'failure';
            message: string;
            title?: string;
          }[];
        };
      }) => Promise<unknown>;
    };

    await checksApi.create({
      owner: this.repo.owner,
      repo: this.repo.repo,
      name: 'AI Code Review',
      head_sha: review.commitSha,
      status: 'completed',
      conclusion: review.approved ? 'success' : 'failure',
      output: {
        title: `AI Review: ${review.approved ? 'Approved' : 'Changes Requested'}`,
        summary: review.summary,
        text: `**${(review.issues || []).length} issues found.**\n\n${issuesText}\n\n**General Comments:**\n${(review.reviewComments || []).join('\n')}`,
        annotations: annotations.slice(0, MAX_ANNOTATIONS),
      },
    });
  }
  
  private buildReviewComment(review: AIReviewResult): string {
    const issues = review.issues || [];
    return `## 🤖 AI Code Review

**Score: ${review.overallScore}/10** - ${review.approved ? '✅ Approved' : '❌ Changes Requested'}

${review.summary}

### Issues Found:

${issues.map(issue => `- **${issue.file}:${issue.line}** [${issue.severity}] ${issue.message}`).join('\n')}
`;
  }
  
  private buildSecurityComment(scanResult: SecurityScanResult): string {
    return `## 🚨 Security Scan

Found ${scanResult.issues.length} security issues:

${scanResult.issues.map(issue => `- **${issue.file}** [${issue.severity}] ${issue.message}`).join('\n')}
`;
  }
  
  private buildSummaryComment(result: ReviewResult): string {
    return `## 📝 Review Summary

**Final Status: ${result.approved ? '✅ Approved' : '❌ Changes Requested'}**

- **AI Review Score:** ${result.score}/10
- **Security Issues:** ${result.securityIssues}
- **Performance Issues:** ${result.performanceIssues}

${result.summary}
`;
  }
  
  private async applyLabels(result: ReviewResult): Promise<void> {
    const labels: string[] = [];
    if (result.approved) {
      labels.push('ai-approved');
    } else {
      labels.push('ai-changes-requested');
    }
    
    if (result.securityIssues > 0) {
      labels.push('security-issue');
    }
    
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const issuesApi = this.octokit.issues as unknown as {
      addLabels: (params: {
        owner: string;
        repo: string;
        issue_number: number;
        labels: string[];
      }) => Promise<unknown>;
    };
    
    await issuesApi.addLabels({
      owner: this.repo.owner,
      repo: this.repo.repo,
      issue_number: this.prNumber,
      labels,
    });
  }
}
