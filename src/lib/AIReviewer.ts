
import { exec, ExecOptions } from '@actions/exec';
import { Logger } from './Logger';
import { PRAnalysisResult, AIReviewResult } from './types';

export class AIReviewer {
  private readonly logger: Logger;

  constructor(options: { logger: Logger }) {
    this.logger = options.logger;
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
      reviewResult.issues = reviewResult.issues || [];
      reviewResult.reviewComments = reviewResult.reviewComments || [];
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
    const fullPrompt = this.buildReviewContent(prAnalysis);

    let output = '';
    let errorOutput = '';
    const options: ExecOptions = {
      listeners: {
        stdout: (data: Buffer) => {
          output += data.toString();
        },
        stderr: (data: Buffer) => {
          errorOutput += data.toString();
        },
      },
      ignoreReturnCode: true, // We handle errors manually by checking the output
      input: Buffer.from(fullPrompt, 'utf8'),
    };

    const args = ['run', '-', '--format', 'json'];
    this.logger.info(`Running OpenCode CLI, piping prompt to stdin`);

    const exitCode = await exec('opencode', args, options);

    if (exitCode !== 0) {
      throw new Error(`OpenCode CLI failed with exit code ${exitCode}. Stderr: ${errorOutput}`);
    }

    if (errorOutput) {
      this.logger.warn(`OpenCode CLI stderr: ${errorOutput}`);
    }

    // The output can be a stream of concatenated JSON objects.
    // We split them by inserting a newline between adjacent objects.
    const jsonStream = output.replace(/}\s*{/g, '}\n{');
    const jsonObjects = jsonStream.trim().split('\n');

    // The last JSON object in the stream should be the final review.
    const lastJson = jsonObjects[jsonObjects.length - 1] || '';

    return lastJson;
  }

  private buildReviewContent(prAnalysis: PRAnalysisResult): string {
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

    const userContent = `PR Analysis:
- Files changed: ${prAnalysis.filesChanged.length}
- Lines: +${prAnalysis.additions} -${prAnalysis.deletions}
- Complexity: ${prAnalysis.complexity}
- Security risks: ${prAnalysis.hasSecuritySensitiveFiles ? 'Yes' : 'No'}

Please provide a review of the following code changes:
${prAnalysis.filesChanged.join('\n')}`;

    return `${systemMessage}\n\n${userContent}`;
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
      commitSha: commitSha,
    };
  }
}
