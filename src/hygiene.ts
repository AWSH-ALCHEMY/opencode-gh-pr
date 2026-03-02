import * as core from '@actions/core';
import * as fs from 'fs';
import { Logger } from './lib/Logger';
import { RepoHygienePolicy } from './lib/types';
import { RepoHygieneReviewer } from './lib/RepoHygieneReviewer';

function loadPolicy(path: string): RepoHygienePolicy {
  const raw = fs.readFileSync(path, 'utf8');
  const parsed = JSON.parse(raw) as Partial<RepoHygienePolicy>;

  const aiReviewRaw = parsed.aiReview || ({} as RepoHygienePolicy['aiReview']);
  const aiReview: RepoHygienePolicy['aiReview'] = {
    model: typeof aiReviewRaw.model === 'string' ? aiReviewRaw.model : 'opencode-reviewer',
    failOnDecision: aiReviewRaw.failOnDecision === 'pass' ? 'pass' : 'fail',
    severityThreshold:
      aiReviewRaw.severityThreshold === 'low' ||
      aiReviewRaw.severityThreshold === 'medium' ||
      aiReviewRaw.severityThreshold === 'high' ||
      aiReviewRaw.severityThreshold === 'critical'
        ? aiReviewRaw.severityThreshold
        : 'high',
    confidenceThreshold:
      typeof aiReviewRaw.confidenceThreshold === 'number' && aiReviewRaw.confidenceThreshold >= 0 && aiReviewRaw.confidenceThreshold <= 1
        ? aiReviewRaw.confidenceThreshold
        : 0.85,
  };

  return {
    version: typeof parsed.version === 'number' ? parsed.version : 1,
    criticalForbiddenFiles: Array.isArray(parsed.criticalForbiddenFiles)
      ? parsed.criticalForbiddenFiles.filter((item): item is string => typeof item === 'string')
      : [],
    aiReview,
  };
}

async function run(): Promise<void> {
  const logger = new Logger('🧹 RepoHygiene');
  const baseSha = process.env['BASE_SHA'] || '';
  const headSha = process.env['HEAD_SHA'] || '';
  const policyPath = '.github/repo-hygiene-policy.json';

  if (!baseSha || !headSha) {
    throw new Error('BASE_SHA and HEAD_SHA are required.');
  }

  if (!fs.existsSync(policyPath)) {
    throw new Error(`Missing policy file: ${policyPath}`);
  }

  const policy = loadPolicy(policyPath);
  const reviewer = new RepoHygieneReviewer({ logger, policy });
  const outcome = await reviewer.run(baseSha, headSha);

  core.info(`Repo Hygiene AI decision: ${outcome.result.decision}`);
  core.info(`Changed files: ${outcome.changedFiles.length}`);
  core.info(`Findings: ${outcome.result.findings.length}`);
  if (outcome.result.summary) {
    core.info(`Summary: ${outcome.result.summary}`);
  }

  const stepSummaryPath = process.env['GITHUB_STEP_SUMMARY'] || '';
  if (stepSummaryPath) {
    const lines: string[] = [];
    lines.push('### Repo Hygiene AI Review');
    lines.push('');
    lines.push(`- Decision: \`${outcome.result.decision}\``);
    lines.push(`- Changed files: \`${outcome.changedFiles.length}\``);
    lines.push(`- Findings: \`${outcome.result.findings.length}\``);
    lines.push(`- Summary: ${outcome.result.summary || 'No summary provided.'}`);
    if (outcome.severeFindings.length > 0) {
      lines.push('');
      lines.push('#### High-Confidence Findings');
      for (const finding of outcome.severeFindings) {
        lines.push(
          `- [${finding.severity}] \`${finding.file}\` (${finding.confidence.toFixed(2)}): ${finding.reason}`
        );
      }
    }
    fs.appendFileSync(stepSummaryPath, `${lines.join('\n')}\n`);
  }

  if (outcome.shouldFail) {
    throw new Error('Repo hygiene AI check failed based on policy thresholds.');
  }
}

run().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  core.setFailed(message);
});
