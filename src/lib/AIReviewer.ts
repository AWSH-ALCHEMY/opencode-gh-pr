import { ActionConfig } from './ActionConfig';
import { Logger } from './Logger';
import { PRAnalysisResult, AIReviewResult } from './types';
import axios, { AxiosError } from 'axios';
import { z } from 'zod';

const AIReviewRequestSchema = z.object({
  model: z.string(),
  messages: z.array(z.object({
    role: z.enum(['system', 'user', 'assistant']),
    content: z.string(),
  })),
  temperature: z.number().min(0).max(1),
  max_tokens: z.number().min(100).max(8000),
});

const AIResponseSchema = z.object({
  summary: z.string(),
  issues: z.array(z.object({
    file: z.string(),
    line: z.number(),
    severity: z.enum(['error', 'warning', 'info']),
    category: z.enum(['bug', 'security', 'performance', 'style', 'best-practice']),
    message: z.string(),
    suggestion: z.string(),
  })),
  overallScore: z.number(),
  approved: z.boolean(),
  reviewComments: z.array(z.string()),
});

const AIReviewResponseSchema = z.object({
  choices: z.array(z.object({
    message: z.object({
      content: z.string(),
    }),
  })),
});

export class AIReviewer {
  private readonly config: ActionConfig;
  private readonly logger: Logger;
  private readonly aiApiKey: string;
  
  constructor(options: {
    config: ActionConfig;
    logger: Logger;
    aiApiKey: string;
  }) {
    this.config = options.config;
    this.logger = options.logger;
    this.aiApiKey = options.aiApiKey;
  }
  
  async review(prAnalysis: PRAnalysisResult): Promise<AIReviewResult | null> {
    this.logger.startGroup('🧠 AI Code Review');
    
    try {
      if (!prAnalysis.shouldReview) {
        this.logger.info('Skipping AI review based on PR analysis');
        return null;
      }
      
      const prompt = this.buildReviewPrompt(prAnalysis);
      const response = await this.callAIAPI(prompt);
      const reviewResult = this.parseReviewResponse(response);
      
      this.logger.info('AI review completed', {
        score: reviewResult.overallScore,
        approved: reviewResult.approved,
        issues: reviewResult.issues.length,
      });
      
      return reviewResult;
      
    } catch (error) {
      this.logger.error('AI review failed', error as Error);
      return this.createFallbackReview();
      
    } finally {
      this.logger.endGroup();
    }
  }
  
  private buildReviewPrompt(prAnalysis: PRAnalysisResult): z.infer<typeof AIReviewRequestSchema> {
    const model = this.config.get('aiModel');
    const temperature = this.config.get('temperature');
    const maxTokens = this.config.get('maxTokens');
    
    const prompt = {
      model,
      messages: [
        {
          role: 'system',
          content: `You are an expert code reviewer. Analyze the provided code changes and respond with a JSON object containing:
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
          Focus on security, performance, and maintainability. Be constructive and specific.`,
        },
        {
          role: 'user',
          content: this.buildReviewContent(prAnalysis),
        },
      ],
      temperature,
      max_tokens: maxTokens,
    };
    
    return AIReviewRequestSchema.parse(prompt);
  }
  
  private buildReviewContent(prAnalysis: PRAnalysisResult): string {
    const { filesChanged, additions, deletions, complexity, hasSecuritySensitiveFiles } = prAnalysis;
    
    return `PR Analysis:
- Files changed: ${filesChanged.length}
- Lines: +${additions} -${deletions}
- Complexity: ${complexity}
- Security sensitive: ${hasSecuritySensitiveFiles}
- Files: ${filesChanged.slice(0, 10).join(', ')}${filesChanged.length > 10 ? '...' : ''}

Please review the code changes for security vulnerabilities, performance issues, and code quality concerns.`;
  }
  
  private async callAIAPI(prompt: z.infer<typeof AIReviewRequestSchema>): Promise<string> {
    const timeout = this.config.get('timeout');
    
    try {
      const response = await axios.post(
        'https://api.opencode.ai/v1/chat/completions',
        prompt,
        {
          headers: {
            'Authorization': `Bearer ${this.aiApiKey}`,
            'Content-Type': 'application/json',
          },
          timeout,
          validateStatus: (status) => status >= 200 && status < 300,
        }
      );
      
      const validatedResponse = AIReviewResponseSchema.parse(response.data);
      return validatedResponse.choices[0].message.content;
      
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        if (axiosError.response) {
          throw new Error(`AI API error: ${axiosError.response.status} - ${JSON.stringify(axiosError.response.data)}`);
        } else if (axiosError.request) {
          throw new Error(`AI API request failed: ${axiosError.message}`);
        } else {
          throw new Error(`AI API setup error: ${axiosError.message}`);
        }
      }
      throw new Error(`AI API call failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  private parseReviewResponse(responseContent: string): AIReviewResult {
    try {
      const parsedResponse = JSON.parse(responseContent);
      const validatedData = AIResponseSchema.parse(parsedResponse);

      const sanitizedIssues = validatedData.issues.map(issue => ({
        ...issue,
        file: issue.file.replace(/[<>"'&]/g, ''),
        message: issue.message.replace(/[<>"'&]/g, '').substring(0, 500),
        suggestion: issue.suggestion.replace(/[<>"'&]/g, '').substring(0, 500),
      }));

      return {
        ...validatedData,
        summary: validatedData.summary.replace(/[<>"'&]/g, '').substring(0, 1000),
        issues: sanitizedIssues,
        overallScore: Math.max(1, Math.min(10, validatedData.overallScore)),
        reviewComments: validatedData.reviewComments.map(c => c.replace(/[<>"'&]/g, '').substring(0, 500)),
        commitSha: ''
      };
    } catch (error) {
      throw new Error(`Failed to parse AI review response: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  private createFallbackReview(): AIReviewResult {
    this.logger.warn('Creating fallback review due to AI failure');
    
    return {
      summary: 'AI review unavailable - manual review required',
      issues: [],
      overallScore: 5,
      approved: false,
      reviewComments: ['AI analysis failed - requires human review'],
      commitSha: ''
    };
  }
}
