
import { exec } from '@actions/exec';
import { Logger } from './Logger';
import { PRAnalysisResult, AIReviewResult } from './types';
import * as path from 'path';
import { PromptContracts } from './PromptContracts';

export class AIReviewer {
  private readonly logger: Logger;
  private readonly baseSha: string | undefined;
  private readonly prompts: PromptContracts;

  constructor(options: { logger: Logger; baseSha?: string }) {
    this.logger = options.logger;
    this.baseSha = options.baseSha;
    this.prompts = new PromptContracts({ logger: this.logger });
  }

  public async review(prAnalysis: PRAnalysisResult, commitSha: string): Promise<AIReviewResult | null> {
    this.logger.startGroup('🧠 AI Code Review');
    try {
      const rawResponse = await this.callAIAPI(prAnalysis);

      if (!rawResponse) {
        this.logger.warn('AI review returned an empty response.');
        return this.createFallbackReview('AI review returned an empty response.', commitSha);
      }

      const reviewResult = JSON.parse(rawResponse) as AIReviewResult;
      reviewResult.issues = this.normalizeIssues(reviewResult.issues, prAnalysis.filesChanged);
      reviewResult.reviewComments = reviewResult.reviewComments || [];
      reviewResult.summary = reviewResult.summary || 'AI analysis complete.';
      reviewResult.overallScore = typeof reviewResult.overallScore === 'number' ? reviewResult.overallScore : 0;
      reviewResult.approved = typeof reviewResult.approved === 'boolean' ? reviewResult.approved : false;
      reviewResult.commitSha = commitSha; // Ensure commitSha is part of the final result
      this.logger.info('Successfully parsed AI review response.');
      return reviewResult;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`AI review failed: ${errorMessage}`);
      return this.createFallbackReview(errorMessage, commitSha);
    } finally {
      this.logger.endGroup();
    }
  }

  private async callAIAPI(prAnalysis: PRAnalysisResult): Promise<string> {
    const fullPrompt = await this.buildReviewContent(prAnalysis);

    let output = '';
    let errorOutput = '';
    const options: {
      listeners: {
        stdout: (data: Buffer) => void;
        stderr: (data: Buffer) => void;
      };
      input: Buffer;
    } = {
      listeners: {
        stdout: (data: Buffer) => {
          output += data.toString();
        },
        stderr: (data: Buffer) => {
          errorOutput += data.toString();
        },
      },
      input: Buffer.from(fullPrompt, 'utf8'),
    };

    const args = ['run', '-', '--format', 'json'];
    this.logger.info(`Running OpenCode CLI, piping prompt to stdin`);

    await exec('opencode', args, options);

    if (errorOutput) {
      this.logger.warn(`OpenCode CLI stderr: ${errorOutput}`);
    }

    const lines = output.split('\n').filter(line => line.trim().length > 0);
    let lastJson = '';
    let extractedReviewJson = '';
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine.startsWith('{') || !trimmedLine.endsWith('}')) {
        continue;
      }

      try {
        const parsed = JSON.parse(trimmedLine) as Record<string, unknown>;

        if (
          typeof parsed['summary'] === 'string' ||
          Array.isArray(parsed['issues']) ||
          typeof parsed['overallScore'] === 'number'
        ) {
          extractedReviewJson = trimmedLine;
        }

        if (parsed['type'] === 'text') {
          const part = parsed['part'] as Record<string, unknown> | undefined;
          const partText = part && typeof part['text'] === 'string' ? part['text'] : '';
          if (partText) {
            try {
              const maybeReview = JSON.parse(partText) as Record<string, unknown>;
              if (
                typeof maybeReview['summary'] === 'string' ||
                Array.isArray(maybeReview['issues']) ||
                typeof maybeReview['overallScore'] === 'number'
              ) {
                extractedReviewJson = JSON.stringify(maybeReview);
              }
            } catch {
              // Ignore non-JSON text payloads.
            }
          }
        }

        if (parsed['type'] !== 'step_start' && parsed['type'] !== 'step_finish') {
          lastJson = trimmedLine;
        }
      } catch {
        continue;
      }
    }

    if (extractedReviewJson) {
      return extractedReviewJson;
    }

    if (!lastJson) {
      const jsonMatch = output.match(/\{[\s\S]*?\}/g);
      if (jsonMatch && jsonMatch.length > 0) {
        lastJson = jsonMatch[jsonMatch.length - 1] ?? '';
      }
    }

    if (!lastJson) {
      throw new Error('No JSON found in OpenCode output');
    }

    try {
      const parsed = JSON.parse(lastJson) as Record<string, unknown>;
      if (
        typeof parsed['summary'] !== 'string' &&
        !Array.isArray(parsed['issues']) &&
        typeof parsed['overallScore'] !== 'number'
      ) {
        throw new Error('Parsed JSON is not a review payload');
      }
    } catch {
      throw new Error(`Invalid JSON in OpenCode output: ${lastJson.substring(0, 200)}`);
    }

    return lastJson;
  }

  private async buildReviewContent(prAnalysis: PRAnalysisResult): Promise<string> {
    const diff = await this.getDiff();
    const context: Record<string, string> = {
      files_changed_count: String(prAnalysis.filesChanged.length),
      additions: String(prAnalysis.additions),
      deletions: String(prAnalysis.deletions),
      complexity: prAnalysis.complexity,
      security_risks: prAnalysis.hasSecuritySensitiveFiles ? 'Yes' : 'No',
      diff,
    };

    const { text } = this.prompts.render('ai_review', context);
    return text;
  }

  private async getDiff(): Promise<string> {
    try {
      let output = '';
      const args: string[] = ['diff', '--no-color'];
      
      if (this.baseSha) {
        args.push(`${this.baseSha}...HEAD`);
      }
      
      await exec('git', args, {
        listeners: {
          stdout: (data: Buffer) => {
            output += data.toString();
          },
        },
      });
      return output || 'No changes detected';
    } catch (error) {
      this.logger.warn('Failed to get git diff, using empty diff');
      return 'No changes detected';
    }
  }

  private createFallbackReview(error: string, commitSha: string): AIReviewResult {
    this.logger.warn('Creating fallback review due to AI failure');
    return {
      summary: 'AI review failed. Please review the code manually.',
      issues: [
        {
          file: 'N/A',
          line: 0,
          severity: 'warning',
          category: 'bug',
          message: `The AI reviewer encountered an error: ${error}`,
          suggestion: 'Check the action logs for more details.',
        },
      ],
      overallScore: 3,
      approved: false,
      reviewComments: [],
      commitSha,
    };
  }

  private normalizeIssues(rawIssues: unknown, changedFiles: string[]): AIReviewResult['issues'] {
    if (!Array.isArray(rawIssues)) {
      return [];
    }

    return rawIssues
      .map((rawIssue) => {
        const issue = rawIssue as Record<string, unknown>;
        const rawFile = typeof issue['file'] === 'string' ? issue['file'] : 'N/A';
        const normalizedFile = this.resolveIssueFile(rawFile, changedFiles);
        const normalizedLine = this.normalizeLine(issue['line']);
        const severity: AIReviewResult['issues'][number]['severity'] =
          issue['severity'] === 'error' || issue['severity'] === 'warning' || issue['severity'] === 'info'
          ? issue['severity']
          : 'warning';
        const category: AIReviewResult['issues'][number]['category'] =
          issue['category'] === 'bug' || issue['category'] === 'security' || issue['category'] === 'performance' || issue['category'] === 'style' || issue['category'] === 'best-practice'
          ? issue['category']
          : 'bug';

        return {
          file: normalizedFile,
          line: normalizedLine,
          severity,
          category,
          message: typeof issue['message'] === 'string' ? issue['message'] : 'Potential issue detected',
          suggestion: typeof issue['suggestion'] === 'string' ? issue['suggestion'] : 'Review this section manually.',
        };
      })
      .filter(issue => issue.file !== 'N/A' && issue.line > 0);
  }

  private normalizeLine(rawLine: unknown): number {
    if (typeof rawLine === 'number' && Number.isFinite(rawLine)) {
      return Math.max(1, Math.floor(rawLine));
    }

    if (typeof rawLine === 'string') {
      const firstNumber = rawLine.match(/\d+/)?.[0];
      if (firstNumber) {
        return Math.max(1, parseInt(firstNumber, 10));
      }
    }

    return 0;
  }

  private resolveIssueFile(rawFile: string, changedFiles: string[]): string {
    const cleaned = rawFile.replace(/^a\//, '').replace(/^b\//, '').trim();
    if (!cleaned || cleaned === 'N/A') {
      return 'N/A';
    }

    if (changedFiles.includes(cleaned)) {
      return cleaned;
    }

    const cleanedBase = path.basename(cleaned);
    const baseMatches = changedFiles.filter(f => path.basename(f) === cleanedBase);
    if (baseMatches.length === 1) {
      return baseMatches[0] ?? 'N/A';
    }

    const containsMatch = changedFiles.find(f => f.endsWith(cleaned) || cleaned.endsWith(f));
    if (containsMatch) {
      return containsMatch;
    }

    return 'N/A';
  }
}
