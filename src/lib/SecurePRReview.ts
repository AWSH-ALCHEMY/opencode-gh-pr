import { Octokit } from '@octokit/rest';
import * as github from '@actions/github';
import { ActionConfig } from './ActionConfig';
import { Logger } from './Logger';
import { PRAnalyzer } from './PRAnalyzer';
import { AIReviewer } from './AIReviewer';
import { SecurityScanner } from './SecurityScanner';
import { CommentPoster } from './CommentPoster';
import { PRAnalysisResult, ReviewResult, AIReviewResult } from './types';

export interface SecurePRReviewOptions {
  octokit: Octokit;
  config: ActionConfig;
  logger: Logger;
  repo: { owner: string; repo: string };
}

export class SecurePRReview {
  private readonly octokit: Octokit;
  private readonly config: ActionConfig;
  private readonly logger: Logger;
  private readonly prNumber: number;
  private readonly commitSha: string;
  private readonly baseSha: string;
  private readonly repo: { owner: string; repo: string };
  
  private prAnalyzer: PRAnalyzer;
  private aiReviewer: AIReviewer;
  private securityScanner: SecurityScanner;
  private commentPoster: CommentPoster;
  
  constructor(options: SecurePRReviewOptions) {
    this.octokit = options.octokit;
    this.config = options.config;
    this.logger = options.logger;
    this.repo = options.repo;
    const payload = github.context.payload;
    if (!payload.pull_request || typeof payload.pull_request !== 'object') {
      throw new Error('This action can only be run on Pull Requests.');
    }
    const pullRequest = payload.pull_request as { number?: unknown; head?: { sha?: string }; base?: { sha?: string } };
    if (
      typeof pullRequest.number !== 'number' ||
      !pullRequest.head ||
      typeof pullRequest.head.sha !== 'string' ||
      !pullRequest.base ||
      typeof pullRequest.base.sha !== 'string'
    ) {
      throw new Error('Invalid pull request payload structure.');
    }
    this.prNumber = pullRequest.number;
    this.commitSha = pullRequest.head.sha;
    this.baseSha = pullRequest.base.sha;
    
    this.prAnalyzer = new PRAnalyzer({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      octokit: this.octokit,
      config: this.config,
      logger: this.logger,
      repo: this.repo,
      prNumber: this.prNumber,
    });
    
    this.aiReviewer = new AIReviewer({
      logger: this.logger,
      baseSha: this.baseSha,
    });
    
    this.securityScanner = new SecurityScanner({
      config: this.config,
      logger: this.logger,
    });
    
    this.commentPoster = new CommentPoster({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      octokit: this.octokit,
      config: this.config,
      logger: this.logger,
      repo: this.repo,
      prNumber: this.prNumber,
    });
  }
  
  async execute(): Promise<ReviewResult> {
    this.logger.startGroup('🔒 Secure PR Review Process');
    
    try {
      this.logger.info('Step 1/4: Analyzing PR structure...');
      const prAnalysis: PRAnalysisResult = await this.prAnalyzer.analyze();

      if (!prAnalysis.valid) {
        this.logger.warn('PR analysis failed validation - skipping detailed review');
        return this.createFallbackResult('PR validation failed');
      }

      let securityIssues = 0;
      if (this.config.get('securityAnalysis') && prAnalysis.hasSecuritySensitiveFiles) {
        this.logger.info('Step 2/4: Running security scan...');
        const securityResult = this.securityScanner.scan(prAnalysis);
        securityIssues = securityResult.issues.length;
        
        if (securityResult.issues.length > 0) {
          await this.commentPoster.postSecurityNotice(securityResult);
        }
      }

      let aiReview: AIReviewResult | null = null;
      if (prAnalysis.shouldReview) {
        this.logger.info('Step 3/4: Performing AI code review...');
        aiReview = await this.aiReviewer.review(prAnalysis, this.commitSha);
        
        if (aiReview) {
          await this.commentPoster.postReview(aiReview);
        }
      }

      this.logger.info('Step 4/4: Creating final summary...');
      const finalResult = this.createFinalResult(prAnalysis, aiReview, securityIssues);
      await this.commentPoster.postSummary(finalResult);
      
      this.logger.info('✅ Secure PR review completed successfully');
      return finalResult;
      
    } catch (error) {
      this.logger.error('Secure PR review failed', error as Error);
      return this.createFallbackResult('Review process failed');
      
    } finally {
      this.logger.endGroup();
    }
  }
  
  private createFinalResult(
    prAnalysis: PRAnalysisResult,
    aiReview: AIReviewResult | null,
    securityIssues: number
  ): ReviewResult {
    const approved = (aiReview?.overallScore ?? 0) >= this.config.get('approvedThreshold');
    
    return {
      status: approved ? 'approved' : 'changes_requested',
      score: aiReview?.overallScore ?? 0,
      approved,
      securityIssues,
      performanceIssues: 0,
      filesAnalyzed: prAnalysis.filesChanged.length,
      summary: aiReview?.summary ?? 'Manual review required - AI analysis unavailable',
    };
  }
  
  private createFallbackResult(reason: string): ReviewResult {
    this.logger.warn(`Creating fallback result: ${reason}`);
    
    return {
      status: 'changes_requested',
      score: 5,
      securityIssues: 0,
      performanceIssues: 0,
      filesAnalyzed: 0,
      approved: false,
      summary: `Review failed: ${reason}. Manual review required.`,
    };
  }
}
