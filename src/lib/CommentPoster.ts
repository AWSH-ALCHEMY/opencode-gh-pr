import { Octokit } from '@octokit/rest';
import { ActionConfig } from './ActionConfig';
import { Logger } from './Logger';
import { AIReviewResult, ReviewResult } from './types';
import { SecurityScanResult } from './SecurityScanner';

export class CommentPoster {
  private readonly octokit: Octokit;
  private readonly config: ActionConfig;
  private readonly logger: Logger;
  private readonly repo: { owner: string; repo: string };
  private readonly prNumber: number;
  
  constructor(options: { octokit: Octokit; config: ActionConfig; logger: Logger; repo: { owner: string; repo: string }; prNumber: number; }) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    this.octokit = options.octokit as unknown as Octokit;
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

    const comments = await this.octokit.issues.listComments({
      owner: this.repo.owner,
      repo: this.repo.repo,
      issue_number: this.prNumber,
    });

    const existingComment = comments.data.find(comment => comment.body?.includes(marker));

    if (existingComment) {
      await this.octokit.issues.updateComment({
        owner: this.repo.owner,
        repo: this.repo.repo,
        comment_id: existingComment.id,
        body: taggedBody,
      });
    } else {
      await this.octokit.issues.createComment({
        owner: this.repo.owner,
        repo: this.repo.repo,
        issue_number: this.prNumber,
        body: taggedBody,
      });
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
        annotations: annotations.slice(0, 50), // GitHub API has a limit of 50 annotations per request
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
