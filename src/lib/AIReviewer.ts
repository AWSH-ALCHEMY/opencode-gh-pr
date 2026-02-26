
import { exec } from '@actions/exec';
import { ActionConfig } from './ActionConfig';
import { Logger } from './Logger';
import { PRAnalysisResult, AIReviewResult } from './types';

export class AIReviewer {
  private readonly config: ActionConfig;
  private readonly logger: Logger;

  constructor(options: { config: ActionConfig; logger: Logger }) {
    this.config = options.config;
    this.logger = options.logger;
  }

  public async review(prAnalysis: PRAnalysisResult): Promise<AIReviewResult | null> {
    this.logger.startGroup('🧠 AI Code Review');
    try {
      const rawResponse = await this.callAIAPI(prAnalysis);

      if (!rawResponse) {
        this.logger.warn('AI review returned an empty response.');
        return this.createFallbackReview('AI review returned an empty response.');
      }

      const reviewResult = JSON.parse(rawResponse) as AIReviewResult;
      this.logger.info('Successfully parsed AI review response.');
      return reviewResult;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`AI review failed: ${errorMessage}`);
      return this.createFallbackReview(errorMessage);
    } finally {
      this.logger.endGroup();
    }
  }

  private async callAIAPI(prAnalysis: PRAnalysisResult): Promise<string> {
    const userContent = this.buildReviewContent(prAnalysis);
    const systemMessage = `You are an expert code reviewer. Analyze the provided code changes and respond with a JSON object containing:
          {
            "summary": "Brief overview of changes",
            "issues": [
              {
                "file": "path/to/file",
                "line": 123,
                "severity": "error|warning|info",
                "category": "bug|security|performance|style|best-practice",
                "message": "Issue description",
                "suggestion": "How to fix"
              }
            ],
            "overallScore": 1-10,
            "approved": true|false,
            "reviewComments": ["general comments"]
          }
          Focus on security, performance, and maintainability. Be constructive and specific.`;

    let output = '';
    let errorOutput = '';
    const options = {
      listeners: {
        stdout: (data: Buffer) => {
          output += data.toString();
        },
        stderr: (data: Buffer) => {
          errorOutput += data.toString();
        },
      },
      ignoreReturnCode: true, // We handle errors manually by checking the output
    };

    const args = ['run', userContent, '--prompt', systemMessage];
    this.logger.info(`Running OpenCode CLI with args: ${args.join(' ')}`)

    const exitCode = await exec('opencode', args, options);

    if (exitCode !== 0) {
      throw new Error(`OpenCode CLI failed with exit code ${exitCode}. Stderr: ${errorOutput}`);
    }

    if (errorOutput) {
      this.logger.warn(`OpenCode CLI stderr: ${errorOutput}`);
    }

    return output;
  }

  private buildReviewContent(prAnalysis: PRAnalysisResult): string {
    return `PR Analysis:
- Files changed: ${prAnalysis.filesChanged.length}
- Lines: +${prAnalysis.additions} -${prAnalysis.deletions}
- Complexity: ${prAnalysis.complexity}
- Security risks: ${prAnalysis.hasSecuritySensitiveFiles ? 'Yes' : 'No'}

Please provide a review of the following code changes:
${prAnalysis.filesChanged.join('\n')}`;
  }

  private createFallbackReview(error: string): AIReviewResult {
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
    };
  }
}
