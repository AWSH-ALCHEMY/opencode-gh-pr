import { Octokit } from '@octokit/rest';
import { ActionConfig } from './ActionConfig';
import { Logger } from './Logger';
import { PRAnalysisResult } from './types';


export class PRAnalyzer {
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

  async analyze(): Promise<PRAnalysisResult> {
    this.logger.startGroup('📊 PR Analysis');
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const pullsApi = this.octokit.pulls as unknown as {
        get: (params: {
          owner: string;
          repo: string;
          pull_number: number;
        }) => Promise<{ data: { additions: number; deletions: number; title: string; } }>;
        listFiles: (params: {
          owner: string;
          repo: string;
          pull_number: number;
          per_page: number;
        }) => Promise<{ data: { filename: string; }[] }>;
      };
      
      const pullRequest = await pullsApi.get({
        owner: this.repo.owner,
        repo: this.repo.repo,
        pull_number: this.prNumber,
      });

      const files = await pullsApi.listFiles({
        owner: this.repo.owner,
        repo: this.repo.repo,
        pull_number: this.prNumber,
        per_page: 100,
      });

      const totalChanges = pullRequest.data.additions + pullRequest.data.deletions;
      const fileNames = files.data.map(f => f.filename);

      this.logger.info(`PR #${this.prNumber} analysis:`, {
        title: pullRequest.data.title,
        files: fileNames.length,
        additions: pullRequest.data.additions,
        deletions: pullRequest.data.deletions,
        total: totalChanges,
      });

      const validation = this.validateConstraints(fileNames.length, totalChanges);
      if (!validation.valid) {
        return {
          valid: false,
          filesChanged: [],
          additions: 0,
          deletions: 0,
          totalChanges: 0,
          complexity: 'low',
          hasSecuritySensitiveFiles: false,
          shouldReview: false,
          reason: validation.reason as string,
        };
      }

      const complexity = this.determineComplexity(totalChanges);
      const hasSecuritySensitiveFiles = this.checkSecurityFiles(fileNames);
      const shouldReview = this.shouldPerformReview(complexity, hasSecuritySensitiveFiles);

      const result: PRAnalysisResult = {
        valid: true,
        filesChanged: fileNames,
        additions: pullRequest.data.additions,
        deletions: pullRequest.data.deletions,
        totalChanges,
        complexity,
        hasSecuritySensitiveFiles,
        shouldReview,
        reason: ''
      };

      this.logger.info('PR analysis completed:', {
        valid: result.valid,
        complexity: result.complexity,
        securityFiles: result.hasSecuritySensitiveFiles,
        shouldReview: result.shouldReview,
      });

      return result;
    } catch (error) {
      this.logger.error('PR analysis failed', error as Error);
      throw error;
    } finally {
      this.logger.endGroup();
    }
  }

  private validateConstraints(fileCount: number, totalChanges: number): { valid: boolean; reason?: string } {
    const maxFiles = this.config.get('maxFiles');
    const maxLines = this.config.get('maxLines');

    this.logger.info(`Constraints: maxFiles=${maxFiles}, maxLines=${maxLines}`);

    if (fileCount > maxFiles) {
      return { valid: false, reason: `Too many files changed (${fileCount} > ${maxFiles})` };
    }

    if (totalChanges > maxLines) {
      return { valid: false, reason: `Too many lines changed (${totalChanges} > ${maxLines})` };
    }

    return { valid: true };
  }

  private determineComplexity(totalChanges: number): 'low' | 'medium' | 'high' {
    if (totalChanges >= 500) return 'high';
    if (totalChanges >= 100) return 'medium';
    return 'low';
  }

  private checkSecurityFiles(fileNames: string[]): boolean {
    const securityPatterns = this.config.get('securityPatterns');
    return fileNames.some(fileName =>
      securityPatterns.some(pattern => new RegExp(pattern.pattern, 'i').test(fileName))
    );
  }

  private shouldPerformReview(complexity: 'low' | 'medium' | 'high', hasSecurityFiles: boolean): boolean {
    if (hasSecurityFiles) return true;
    if (complexity === 'medium' || complexity === 'high') return true;
    return false;
  }
}
