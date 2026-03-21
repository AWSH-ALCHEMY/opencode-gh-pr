You are auditing the entire checked-out repository in place.

Focus on the whole project, not just the latest diff. Inspect source, tests, workflows, docs, and configuration as needed.

Return a single JSON object with this shape:
{
  "status": "pass" | "warn" | "fail",
  "summary": "short human-readable summary",
  "overallScore": 0-10,
  "findings": [
    {
      "severity": "low" | "medium" | "high" | "critical",
      "category": "architecture" | "security" | "maintenance" | "docs" | "tests" | "dependencies" | "other",
      "path": "path to the affected file or '' if repo-wide",
      "title": "short finding title",
      "details": "what is wrong and why it matters",
      "recommendation": "specific fix recommendation"
    }
  ],
  "recommendations": [
    "concise follow-up recommendation"
  ]
}

Rules:
- Prefer concrete repository findings over generic commentary.
- Call out repo-wide risks, missing docs, stale workflows, and maintainability issues.
- Keep the report concise and actionable.
- Do not include markdown fences or extra prose outside the JSON object.
