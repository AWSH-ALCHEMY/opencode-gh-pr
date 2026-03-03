Changed files:
{{changed_files_list}}

Policy thresholds:
{{policy_json}}

Output JSON with this schema:
{
  "decision": "pass" | "fail",
  "summary": "<brief summary>",
  "findings": [
    {
      "severity": "low" | "medium" | "high" | "critical",
      "confidence": 0-1,
      "file": "path/to/file",
      "reason": "why this is a hygiene issue",
      "suggestion": "how to fix it"
    }
  ]
}

Diff:
{{diff}}
