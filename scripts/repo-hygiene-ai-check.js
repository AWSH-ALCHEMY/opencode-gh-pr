#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require("fs");
const { spawnSync, execSync } = require("child_process");

const POLICY_PATH = ".github/repo-hygiene-policy.json";
const BASE_SHA = process.env.BASE_SHA || "";
const HEAD_SHA = process.env.HEAD_SHA || "";

function fail(msg, code = 1) {
  console.error(msg);
  process.exit(code);
}

if (!BASE_SHA || !HEAD_SHA) {
  fail("BASE_SHA and HEAD_SHA are required.", 2);
}

if (!fs.existsSync(POLICY_PATH)) {
  fail(`Missing policy file: ${POLICY_PATH}`, 2);
}

const policy = JSON.parse(fs.readFileSync(POLICY_PATH, "utf8"));
const criticalForbiddenFiles = Array.isArray(policy.criticalForbiddenFiles)
  ? policy.criticalForbiddenFiles
  : [];
const aiPolicy = policy.aiReview || {};
const severityThreshold = String(aiPolicy.severityThreshold || "high").toLowerCase();
const confidenceThreshold = Number(aiPolicy.confidenceThreshold ?? 0.85);
const failOnDecision = String(aiPolicy.failOnDecision || "fail").toLowerCase();

const changedFilesRaw = execSync(
  `git diff --name-only --diff-filter=ACMR ${BASE_SHA} ${HEAD_SHA}`,
  { encoding: "utf8" }
).trim();
const changedFiles = changedFilesRaw ? changedFilesRaw.split("\n").filter(Boolean) : [];

if (changedFiles.length === 0) {
  console.log(`No changed files detected between ${BASE_SHA} and ${HEAD_SHA}.`);
  process.exit(0);
}

const hardHits = changedFiles.filter((file) => criticalForbiddenFiles.includes(file));
if (hardHits.length > 0) {
  console.error("Repo hygiene check failed (critical forbidden files):");
  hardHits.forEach((file) => console.error(`- ${file}`));
  process.exit(1);
}

const diff = execSync(`git diff --unified=1 ${BASE_SHA} ${HEAD_SHA}`, {
  encoding: "utf8",
  maxBuffer: 20 * 1024 * 1024,
});

const prompt = `
You are reviewing a GitHub PR for repository hygiene and professionalism.

Focus areas:
1) Documentation/prose professionalism and tone
2) Presence of debug, temporary, generated, or investigation artifacts
3) Overall merge readiness from a hygiene perspective

Return ONLY valid JSON with this exact schema:
{
  "decision": "pass" | "fail",
  "summary": "string",
  "findings": [
    {
      "severity": "low" | "medium" | "high" | "critical",
      "confidence": 0.0,
      "file": "path/to/file",
      "reason": "short explanation",
      "suggestion": "short actionable suggestion"
    }
  ]
}

Rules:
- Mark decision "fail" only when hygiene/professionalism risk is materially problematic.
- Keep findings concise and evidence-based.
- Confidence must be between 0 and 1.

Changed files:
${changedFiles.map((f) => `- ${f}`).join("\n")}

Policy:
${JSON.stringify(
  {
    severityThreshold,
    confidenceThreshold,
    failOnDecision,
  },
  null,
  2
)}

Diff:
${diff}
`;

const opencode = spawnSync("opencode", ["run", "-", "--format", "json"], {
  input: prompt,
  encoding: "utf8",
  maxBuffer: 25 * 1024 * 1024,
});

if (opencode.error) {
  fail(`Failed to execute opencode: ${opencode.error.message}`, 2);
}

if ((opencode.status ?? 1) !== 0) {
  fail(
    `OpenCode returned non-zero exit code (${opencode.status}).\n${(opencode.stderr || "").slice(
      0,
      2000
    )}`,
    2
  );
}

const stdout = opencode.stdout || "";
const textParts = [];
for (const line of stdout.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed) continue;
  try {
    const obj = JSON.parse(trimmed);
    if (obj?.type === "text" && typeof obj?.part?.text === "string") {
      textParts.push(obj.part.text);
    }
  } catch (_err) {
    // ignore non-JSON lines
  }
}

const mergedText = textParts.join("\n").trim();
if (!mergedText) {
  fail("OpenCode produced no parseable text output.", 2);
}

function parseReviewJson(raw) {
  try {
    return JSON.parse(raw);
  } catch (_e) {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(raw.slice(start, end + 1));
    }
    throw new Error("Unable to parse review JSON.");
  }
}

let review;
try {
  review = parseReviewJson(mergedText);
} catch (err) {
  fail(`Unable to parse AI hygiene JSON: ${err.message}`, 2);
}

const findings = Array.isArray(review.findings) ? review.findings : [];
const decision = String(review.decision || "fail").toLowerCase();
const summary = String(review.summary || "").trim();

const sevRank = { low: 1, medium: 2, high: 3, critical: 4 };
const thresholdRank = sevRank[severityThreshold] || sevRank.high;
const severeFindings = findings.filter((f) => {
  const sev = String(f.severity || "low").toLowerCase();
  const conf = Number(f.confidence ?? 0);
  const rank = sevRank[sev] || 0;
  return rank >= thresholdRank && conf >= confidenceThreshold;
});

const shouldFail = decision === failOnDecision || severeFindings.length > 0;

const lines = [];
lines.push("Repo Hygiene AI Review");
lines.push(`Decision: ${decision}`);
if (summary) lines.push(`Summary: ${summary}`);
lines.push(`Findings: ${findings.length}`);
if (severeFindings.length > 0) {
  lines.push(`High-confidence findings (threshold): ${severeFindings.length}`);
  for (const f of severeFindings) {
    lines.push(
      `- [${String(f.severity || "unknown")}] ${String(f.file || "unknown file")} (${Number(
        f.confidence ?? 0
      ).toFixed(2)}): ${String(f.reason || "No reason provided")}`
    );
  }
}
console.log(lines.join("\n"));

if (process.env.GITHUB_STEP_SUMMARY) {
  const md = [];
  md.push("### Repo Hygiene AI Review");
  md.push("");
  md.push(`- Decision: \`${decision}\``);
  md.push(`- Findings: \`${findings.length}\``);
  if (summary) md.push(`- Summary: ${summary}`);
  if (severeFindings.length > 0) {
    md.push("");
    md.push("#### High-confidence Findings");
    severeFindings.forEach((f) => {
      md.push(
        `- [${String(f.severity || "unknown")}] \`${String(f.file || "unknown")}\` (${Number(
          f.confidence ?? 0
        ).toFixed(2)}): ${String(f.reason || "No reason provided")}`
      );
    });
  }
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${md.join("\n")}\n`);
}

if (shouldFail) {
  process.exit(1);
}

