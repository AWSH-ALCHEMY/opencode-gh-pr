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
        await this.createComment(summaryComment);
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
      await this.createComment(securityComment);
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
      await this.createComment(summaryComment);
      
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
  
  private async createComment(body: string): Promise<void> {
    await this.octokit.issues.createComment({
      owner: this.repo.owner,
      repo: this.repo.repo,
      issue_number: this.prNumber,
      body,
    });
  }
  
  private async createCheckRun(review: AIReviewResult): Promise<void> {
    await this.octokit.checks.create({
      owner: this.repo.owner,
      repo: this.repo.repo,
      name: 'AI Code Review',
      head_sha: review.commitSha,
      status: 'completed',
      conclusion: review.approved ? 'success' : 'failure',
      output: {
        title: 'AI Code Review',
        summary: review.summary,
        text: review.reviewComments.join('\n'),
      },
    });
  }
  
  private buildReviewComment(review: AIReviewResult): string {
    return `## 🤖 AI Code Review

**Score: ${review.overallScore}/10** - ${review.approved ? '✅ Approved' : '❌ Changes Requested'}

${review.summary}

### Issues Found:

${review.issues.map(issue => `- **${issue.file}:${issue.line}** [${issue.severity}] ${issue.message}`).join('\n')}
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
    
    await this.octokit.issues.addLabels({
      owner: this.repo.owner,
      repo: this.repo.repo,
      issue_number: this.prNumber,
      labels,
    });
  }
}
