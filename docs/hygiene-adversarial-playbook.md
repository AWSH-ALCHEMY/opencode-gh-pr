# Hygiene Adversarial Playbook

Repeatable smoke checks for `Repo Hygiene Review` behavior.

## Goals

- Confirm critical forbidden-file detection.
- Confirm documentation professionalism/tone detection.
- Confirm dual-signal detection (artifact + tone in one file).

## Scenarios

1. `forbidden-file`
- Injects `system_prompt.txt` (listed in `.github/repo-hygiene-policy.json`).
- Expected: `Repo Hygiene AI` fails immediately with critical forbidden-file summary.

2. `professionalism`
- Injects a docs file with explicitly unprofessional/profane language.
- Expected: `Repo Hygiene AI` fails with high-confidence professionalism findings.

3. `dual-signal`
- Injects one docs file containing both:
  - artifact/test wording, and
  - hostile/dismissive tone.
- Expected: `Repo Hygiene AI` fails and reports both categories.

## Runner Script

Use the helper script:

```bash
scripts/hygiene_smoke.sh <scenario>
```

Examples:

```bash
scripts/hygiene_smoke.sh forbidden-file
scripts/hygiene_smoke.sh professionalism
scripts/hygiene_smoke.sh dual-signal
```

Default behavior:

- Creates a temporary `codex/hygiene-smoke-*` branch.
- Opens a validation PR.
- Waits for `Repo Hygiene Review` completion.
- Prints expected-vs-actual check result.
- Closes the PR and deletes the remote/local branch.

Use `--keep-open` to keep the PR/branch for manual inspection:

```bash
scripts/hygiene_smoke.sh dual-signal --keep-open
```

## Preconditions

- `gh` CLI installed and authenticated.
- Clean local git working tree.
- Permission to create and close PRs in the repository.

## Pass Criteria

- Scenario expected `Repo Hygiene Review` conclusion = `failure`.
- PR merge state remains blocked while failed check is present.

## Failure Modes

- Run unexpectedly succeeds:
  - Treat as regression in prompt/policy sensitivity.
  - Review `prompts/hygiene/v1/system.prompt.md` and policy thresholds.
- No run detected for the branch:
  - Verify workflow triggers and Actions permissions.
