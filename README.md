# OpenCode PR Review Workflows

GitHub Actions workflows for AI-assisted pull request review and targeted `/code_apply` fixes.

## Workflows

- `.github/workflows/main.yml`
  - Runs Secure PR Review on pull requests.
  - Builds action artifacts and posts AI review output (summary, inline review, labels, checks).
- `.github/workflows/repo-hygiene.yml`
  - Runs Repo Hygiene AI checks against PR diff using `.github/repo-hygiene-policy.json`.
- `.github/workflows/code-apply.yml`
  - Handles `/code_apply` commands from PR conversation comments.
  - Creates isolated apply branches and child PRs.

## Key Config

- `.github/code-apply-policy.json`: command authorization, label gating, and apply behavior.
- `.github/repo-hygiene-policy.json`: forbidden files + severity/confidence fail thresholds.
- `prompts/registry.json` and `prompts/*`: prompt packs for review, hygiene, and code apply.

## Command Notes

`code-apply.yml` can start on any PR `issue_comment`, but command logic only executes when the comment body is a single-line standalone command:

- `/code_apply <comment_id>`
- `/code_apply --all --force`

Narrative mentions (for example, "we can use /code_apply later") are ignored.

## Architecture Docs

- [Code Apply Child PR Design](docs/code-apply-child-pr-design.md)
- [Prompt Contracts](docs/prompt-contracts.md)

## Local Dev

```bash
npm ci
npm run build
npm test
```

For full validation:

```bash
npm run all
```
