# OpenCode PR Review Workflows

GitHub Actions workflows for AI-assisted pull request review and targeted `/code_apply` fixes.

Recommended consumer pin: `AWSH-ALCHEMY/opencode-gh-pr@v1.1.1`

## Workflows

- `.github/workflows/main.yml`
  - Runs Secure PR Review on pull requests.
  - Builds action artifacts and posts AI review output (summary, inline review, labels, checks).
- `.github/workflows/repo-hygiene.yml`
  - Runs Repo Hygiene AI checks against PR diff using `.github/repo-hygiene-policy.json`.
- `.github/workflows/repo-sweep.yml`
  - Runs a repository-wide audit/sweep and emits a structured JSON report artifact plus step summary.
- `.github/workflows/code-apply.yml`
  - Handles `/code_apply` commands from PR conversation comments.
  - Creates isolated apply branches and child PRs.

## Key Config

- `.github/code-apply-policy.json`: command authorization, label gating, and apply behavior.
- `.github/repo-hygiene-policy.json`: forbidden files + severity/confidence fail thresholds.
- `prompts/registry.json` and `prompts/*`: prompt packs for review, hygiene, repo sweep, and code apply.

## Overrides

These entrypoints now support explicit override paths so downstream repos can bring their own policy or prompt registry without forking the implementation:

- `action.yml`
  - `config-file`: custom PR review config file, resolved relative to the checked-out repository.
  - `prompt-registry-path`: custom prompt registry for Secure PR Review and the prompt packs it loads.
- `/.github/workflows/code-apply.yml`
  - `policy_path`: custom `/code_apply` policy file.
  - `prompt_registry_path`: custom prompt registry for the apply prompt pack.
- `/.github/workflows/repo-hygiene.yml`
  - `policy_path`: custom repo hygiene policy file.
  - `prompt_registry_path`: custom prompt registry for the hygiene prompt pack.
- `/.github/workflows/repo-sweep.yml`
  - `prompt_registry_path`: custom prompt registry for the sweep prompt pack.
  - `report_path`: custom path for the generated JSON report.
  - `artifact_name`: custom artifact name for the JSON report.

## Command Notes

`code-apply.yml` can start on any PR `issue_comment`, but command logic only executes when the comment body is a single-line standalone command:

- `/code_apply <comment_id>`
- `/code_apply --all --force`

Narrative mentions (for example, "we can use /code_apply later") are ignored.

## Architecture Docs

- [Code Apply Child PR Design](docs/code-apply-child-pr-design.md)
- [Prompt Contracts](docs/prompt-contracts.md)
- [Hygiene Adversarial Playbook](docs/hygiene-adversarial-playbook.md)

## Reusable workflow interface

- **`/.github/workflows/code-apply.yml`** still listens for `/code_apply` issue and review comments, but it can now also be called directly via `workflow_call`. Provide the triggering event (`issue_comment` or `pull_request_review_comment`), the PR number, comment body, comment metadata (ID, author login/association, optional user type and reply target), plus optional prompt registry and policy paths when you want to override the bundled defaults.
- **`/.github/workflows/repo-hygiene.yml`** now exposes `workflow_call` inputs for `base_sha`, `head_sha`, and optional prompt/policy paths, so downstream repos can run the same hygiene checks from a parent workflow while keeping the existing PR event trigger in this repo.
- **`/.github/workflows/repo-sweep.yml`** provides a reusable repository-wide audit entrypoint with a default sweep prompt, optional prompt registry override, and JSON report artifact/step summary output.

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

Adversarial hygiene smoke runner:

```bash
scripts/hygiene_smoke.sh dual-signal
```
