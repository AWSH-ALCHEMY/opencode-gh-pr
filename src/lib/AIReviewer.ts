
import { exec, ExecOptions } from '@actions/exec';
import { Logger } from './Logger';
import { PRAnalysisResult, AIReviewResult } from './types';

export class AIReviewer {
  private readonly logger: Logger;
  private readonly baseSha: string | undefined;

  constructor(options: { logger: Logger; baseSha?: string }) {
    this.logger = options.logger;
    this.baseSha = options.baseSha;
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
      reviewResult.summary = reviewResult.summary || 'AI analysis complete.';
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

    const lines = output.split('\n').filter(line => line.trim().length > 0);
    let lastJson = '';
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith('{') && trimmedLine.endsWith('}')) {
        try {
          const parsed = JSON.parse(trimmedLine) as { type?: string };
          if (parsed.type !== 'step_start' && parsed.type !== 'step_finish') {
            lastJson = trimmedLine;
          }
        } catch {
          continue;
        }
      }
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
      JSON.parse(lastJson);
    } catch {
      throw new Error(`Invalid JSON in OpenCode output: ${lastJson.substring(0, 200)}`);
    }

    return lastJson;
  }

  private async buildReviewContent(prAnalysis: PRAnalysisResult): Promise<string> {
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

    const diff = await this.getDiff();

    const userContent = `PR Analysis:
- Files changed: ${prAnalysis.filesChanged.length}
- Lines: +${prAnalysis.additions} -${prAnalysis.deletions}
- Complexity: ${prAnalysis.complexity}
- Security risks: ${prAnalysis.hasSecuritySensitiveFiles ? 'Yes' : 'No'}

Please provide a review of the following code changes:

\`\`\`diff
${diff}
\`\`\`
`;

    return `${systemMessage}\n\n${userContent}`;
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
}
