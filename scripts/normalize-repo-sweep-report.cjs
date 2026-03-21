#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function readEnv(name) {
  const value = process.env[name];
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${name} must be set.`);
  }
  return value;
}

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stripAnsi(text) {
  return text.replace(/[\u001B\u009B][[\]()#;?]*(?:(?:(?:[a-zA-Z\d]*(?:;[a-zA-Z\d]*)*)?\u0007)|(?:(?:\d{1,4}(?:;\d{0,4})*)?[\dA-PR-TZcf-ntqry=><~]))/g, '');
}

function readTail(text, maxLines = 20) {
  return text.split(/\r?\n/).slice(-maxLines).join('\n').trim();
}

function extractCandidateJson(raw) {
  const sanitizedRaw = stripAnsi(raw);
  let textPayload = '';
  let lastRawObject = '';

  for (const line of sanitizedRaw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!(trimmed.startsWith('{') && trimmed.endsWith('}'))) {
      continue;
    }

    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && parsed.type === 'text') {
        const part = parsed.part || {};
        const text = typeof part.text === 'string' ? part.text.trim() : '';
        if (text) {
          textPayload = text;
        }
      } else {
        lastRawObject = trimmed;
      }
    } catch {
      continue;
    }
  }

  const candidate = textPayload || lastRawObject;
  if (!candidate) {
    return '';
  }

  try {
    JSON.parse(candidate);
    return candidate;
  } catch {
    const start = candidate.indexOf('{');
    const end = candidate.lastIndexOf('}');
    if (start < 0 || end <= start) {
      return '';
    }
    const sliced = candidate.slice(start, end + 1);
    JSON.parse(sliced);
    return sliced;
  }
}

function normalizeFindings(findings) {
  if (!Array.isArray(findings)) {
    return [];
  }

  return findings.filter((finding) => {
    if (!isPlainObject(finding)) {
      return false;
    }
    return ['severity', 'category', 'path', 'title', 'details', 'recommendation'].every((key) => typeof finding[key] === 'string');
  }).map((finding) => ({
    severity: finding.severity,
    category: finding.category,
    path: finding.path,
    title: finding.title,
    details: finding.details,
    recommendation: finding.recommendation,
  }));
}

function normalizeRecommendations(recommendations) {
  if (!Array.isArray(recommendations)) {
    return [];
  }
  return recommendations.filter((item) => typeof item === 'string' && item.trim().length > 0);
}

function parseReport(rawReport, exitCode) {
  if (!isPlainObject(rawReport)) {
    return {
      status: 'fail',
      summary: exitCode === 0
        ? 'OpenCode output did not contain a parseable JSON report.'
        : `Repository sweep exited with code ${exitCode}.`,
      overallScore: 0,
      findings: [],
      recommendations: [],
    };
  }

  const summary = typeof rawReport.summary === 'string' && rawReport.summary.trim().length > 0
    ? rawReport.summary.trim()
    : exitCode === 0
      ? 'Repository sweep completed.'
      : `Repository sweep exited with code ${exitCode}.`;

  const normalized = {
    status: rawReport.status === 'pass' || rawReport.status === 'warn' || rawReport.status === 'fail'
      ? rawReport.status
      : exitCode === 0
        ? 'warn'
        : 'fail',
    summary,
    overallScore: typeof rawReport.overallScore === 'number' && Number.isFinite(rawReport.overallScore)
      ? Math.max(0, Math.min(10, rawReport.overallScore))
      : 0,
    findings: normalizeFindings(rawReport.findings),
    recommendations: normalizeRecommendations(rawReport.recommendations),
  };

  if (exitCode !== 0) {
    normalized.status = 'fail';
    if (!normalized.summary.includes(`code ${exitCode}`)) {
      normalized.summary = `${normalized.summary} (exit code ${exitCode})`;
    }
  }

  return normalized;
}

function setOutput(name, value) {
  const outputPath = process.env.GITHUB_OUTPUT || '';
  if (!outputPath) {
    return;
  }
  const delimiter = `EOF_${crypto.randomUUID()}`;
  fs.appendFileSync(outputPath, `${name}<<${delimiter}\n${String(value)}\n${delimiter}\n`, 'utf8');
}

function appendSummary(report, reportFile) {
  const summaryPath = process.env.GITHUB_STEP_SUMMARY || '';
  if (!summaryPath) {
    return;
  }

  const lines = [
    '### Repository Sweep',
    '',
    `- Status: \`${report.status}\``,
    `- Score: \`${report.overallScore}\``,
    `- Findings: \`${report.findings.length}\``,
    `- Summary: ${report.summary}`,
    `- Report: \`${reportFile}\``,
  ];

  if (report.recommendations.length > 0) {
    lines.push('');
    lines.push('#### Recommendations');
    for (const item of report.recommendations) {
      lines.push(`- ${item}`);
    }
  }

  fs.appendFileSync(summaryPath, `${lines.join('\n')}\n`, 'utf8');
}

async function main() {
  const reportFile = readEnv('REPO_SWEEP_REPORT_FILE');
  const logPath = readEnv('REPO_SWEEP_LOG_PATH');
  const exitCode = Number(process.env.REPO_SWEEP_EXIT_CODE || '0');

  const rawLog = fs.readFileSync(logPath, 'utf8');
  let parsedReport = null;
  const candidateJson = extractCandidateJson(rawLog);
  if (candidateJson) {
    try {
      parsedReport = JSON.parse(candidateJson);
    } catch {
      parsedReport = null;
    }
  }
  const report = parseReport(parsedReport, exitCode);

  if (!candidateJson) {
    report.summary = `${report.summary} Log tail: ${readTail(rawLog) || 'no output captured.'}`;
  }

  fs.mkdirSync(path.dirname(reportFile), { recursive: true });
  fs.writeFileSync(reportFile, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  appendSummary(report, reportFile);

  setOutput('status', report.status);
  setOutput('score', String(report.overallScore));
  setOutput('findings_count', String(report.findings.length));
  setOutput('report_file', reportFile);

  if (exitCode !== 0) {
    process.exit(exitCode);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exit(1);
});
