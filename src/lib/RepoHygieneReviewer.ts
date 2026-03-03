import { Logger } from './Logger';
import { RepoHygieneResult, RepoHygienePolicy } from './types';
import { PromptContracts } from './PromptContracts';
import { extractTextPayloads, parseJsonLines, parseJsonWithObjectFallback } from './OpenCodeOutput';
import { getChangedFilesBetween, getDiffBetween } from './GitDiff';
import { runOpenCodeJsonPrompt } from './OpenCodeRunner';

const SEVERITY_RANK: Record<'low' | 'medium' | 'high' | 'critical', number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

export class RepoHygieneReviewer {
  private readonly logger: Logger;
  private readonly policy: RepoHygienePolicy;
  private readonly prompts: PromptContracts;

  constructor(options: { logger: Logger; policy: RepoHygienePolicy }) {
    this.logger = options.logger;
    this.policy = options.policy;
    this.prompts = new PromptContracts({ logger: this.logger });
  }

  public async run(baseSha: string, headSha: string): Promise<{
    shouldFail: boolean;
    result: RepoHygieneResult;
    severeFindings: RepoHygieneResult['findings'];
    changedFiles: string[];
  }> {
    const changedFiles = await this.getChangedFiles(baseSha, headSha);
    if (changedFiles.length === 0) {
      return {
        shouldFail: false,
        changedFiles,
        severeFindings: [],
        result: {
          decision: 'pass',
          summary: `No changed files detected between ${baseSha} and ${headSha}.`,
          findings: [],
        },
      };
    }

    const criticalFiles = changedFiles.filter((file) => this.policy.criticalForbiddenFiles.includes(file));
    if (criticalFiles.length > 0) {
      return {
        shouldFail: true,
        changedFiles,
        severeFindings: criticalFiles.map((file) => ({
          severity: 'critical',
          confidence: 1,
          file,
          reason: 'Critical forbidden artifact was introduced in this PR.',
          suggestion: 'Remove this file from the PR before merging.',
        })),
        result: {
          decision: 'fail',
          summary: 'Critical forbidden files detected.',
          findings: criticalFiles.map((file) => ({
            severity: 'critical',
            confidence: 1,
            file,
            reason: 'Critical forbidden artifact was introduced in this PR.',
            suggestion: 'Remove this file from the PR before merging.',
          })),
        },
      };
    }

    const diff = await this.getDiff(baseSha, headSha);
    const raw = await this.callOpenCode(diff, changedFiles);
    const result = this.parseResult(raw);
    const severeFindings = this.getSevereFindings(result);
    const shouldFail = result.decision === this.policy.aiReview.failOnDecision || severeFindings.length > 0;

    return {
      shouldFail,
      result,
      severeFindings,
      changedFiles,
    };
  }

  private async getChangedFiles(baseSha: string, headSha: string): Promise<string[]> {
    return getChangedFilesBetween(baseSha, headSha);
  }

  private async getDiff(baseSha: string, headSha: string): Promise<string> {
    return getDiffBetween(baseSha, headSha, { unified: 1 });
  }

  private async callOpenCode(diff: string, changedFiles: string[]): Promise<string> {
    const prompt = this.buildPrompt(diff, changedFiles);
    const output = await runOpenCodeJsonPrompt(prompt, {
      logger: this.logger,
      stderrLabel: 'Repo hygiene OpenCode stderr output detected',
    });

    const jsonTextEvents = extractTextPayloads(parseJsonLines(output));

    if (jsonTextEvents.length === 0) {
      throw new Error('No text payload events found in OpenCode output.');
    }

    return jsonTextEvents.join('\n').trim();
  }

  private parseResult(raw: string): RepoHygieneResult {
    const fallback: RepoHygieneResult = {
      decision: 'fail',
      summary: 'AI hygiene output could not be parsed.',
      findings: [],
    };

    try {
      const parsed = parseJsonWithObjectFallback(raw) as Partial<RepoHygieneResult>;
      const decision = parsed.decision === 'pass' || parsed.decision === 'fail' ? parsed.decision : 'fail';
      const summary = typeof parsed.summary === 'string' ? parsed.summary : fallback.summary;
      const findings = Array.isArray(parsed.findings)
        ? parsed.findings
            .map((item) => {
              const finding = item as unknown as Record<string, unknown>;
              const severity = this.normalizeSeverity(finding['severity']);
              const confidence = this.normalizeConfidence(finding['confidence']);
              const file = typeof finding['file'] === 'string' ? finding['file'] : 'unknown';
              const reason = typeof finding['reason'] === 'string' ? finding['reason'] : 'No reason provided';
              const suggestion = typeof finding['suggestion'] === 'string' ? finding['suggestion'] : 'No suggestion provided';
              return { severity, confidence, file, reason, suggestion };
            })
            .filter((finding) => finding.file.length > 0)
        : [];

      return { decision, summary, findings };
    } catch (error) {
      this.logger.error('Failed to parse AI hygiene review JSON', error instanceof Error ? error : undefined);
      return fallback;
    }
  }

  private getSevereFindings(result: RepoHygieneResult): RepoHygieneResult['findings'] {
    const thresholdRank = SEVERITY_RANK[this.policy.aiReview.severityThreshold] || SEVERITY_RANK.high;
    return result.findings.filter((finding) => {
      const rank = SEVERITY_RANK[finding.severity] || 0;
      return rank >= thresholdRank && finding.confidence >= this.policy.aiReview.confidenceThreshold;
    });
  }

  private buildPrompt(diff: string, changedFiles: string[]): string {
    const context: Record<string, string> = {
      changed_files_list: changedFiles.map((f) => `- ${f}`).join('\n'),
      policy_json: JSON.stringify(this.policy.aiReview, null, 2),
      diff,
    };
    const { text } = this.prompts.render('hygiene_review', context);
    return text;
  }

  private normalizeSeverity(value: unknown): 'low' | 'medium' | 'high' | 'critical' {
    if (value === 'low' || value === 'medium' || value === 'high' || value === 'critical') {
      return value;
    }
    return 'medium';
  }

  private normalizeConfidence(value: unknown): number {
    const confidence = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(confidence)) return 0;
    if (confidence < 0) return 0;
    if (confidence > 1) return 1;
    return confidence;
  }
}
