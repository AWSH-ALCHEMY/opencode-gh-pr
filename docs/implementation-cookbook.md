# Implementation Cookbook

This guide summarizes the supported way to adopt the workflows in this repo and shows when to use the available override surfaces.

## Recommended strategy

Use the workflows as orchestration and keep implementation in provider-owned code:

- `Secure PR Review` is the primary action entrypoint for PR analysis.
- `repo-hygiene.yml` is a reusable workflow that checks out the caller repo, then invokes the provider-owned hygiene action from this repo.
- `code-apply.yml` and `repo-sweep.yml` remain reusable workflows with explicit inputs for policy/prompt overrides.

The safest default is:

1. Pin to a release tag, not `main`.
2. Leave bundled prompts and policies alone unless your repo has a specific reason to override them.
3. Override only data files or prompt packs, not the execution model.
4. Use workflow inputs for repo-specific paths and commit SHAs.

## What can be overridden

The supported override surface is intentionally narrow so the behavior stays predictable.

| Surface | Where it applies | Typical use |
| --- | --- | --- |
| `prompt-registry-path` | `action.yml`, `code-apply.yml`, `repo-hygiene.yml`, `repo-sweep.yml` | Swap prompt packs without forking the code |
| `policy_path` | `code-apply.yml`, `repo-hygiene.yml` | Point at a repo-specific policy file |
| `config-file` | `action.yml` | Load a repo-specific review config |
| `base_sha` / `head_sha` | `repo-hygiene.yml`, `repo-sweep.yml` | Run the same logic against a different commit range |
| `report_path` / `artifact_name` | `repo-sweep.yml` | Choose where the sweep report is written and how it is published |

Suggested rule of thumb:

- Override paths when the repository has a unique policy or prompt pack.
- Keep the default prompt registry when you want the upstream behavior.
- Use `workflow_call` inputs for anything the caller repo should control explicitly.

## Usage scenarios

### 1. Standard JavaScript or TypeScript repo

Recommended setup:

- Use the default release tag.
- Keep the bundled prompt registry and policy files.
- Let `Secure PR Review` and `repo-hygiene` run with the default runner settings.

Why this works:

- The workflows analyze git diffs and repo files, so the application language does not matter.
- The action runtime is Node-based, but the bundled actions run on the GitHub runner; the repo itself does not need to be Node-first.

### 2. Python repo with notebooks or generated files

Recommended setup:

- Keep the upstream workflows.
- Override `policy_path` if you need to ban generated artifacts, notebook outputs, or large binary files.
- Override `prompt-registry-path` only if you want prompt wording that speaks more directly to Python-specific risks.

Good fit for:

- `requirements.txt`, `poetry.lock`, `uv.lock`, `Pipfile.lock`
- notebook outputs, data snapshots, build artifacts

### 3. Go, Rust, Java, or other compiled-language repo

Recommended setup:

- Use the same workflows.
- Add repository-specific file rules in policy files for build outputs, vendored code, or generated sources.
- Leave the prompts alone unless you want stronger language-specific examples in the review text.

Why this works:

- The analyzer is path-and-diff driven, not language-parser driven.
- Different languages only matter when you want the prompt or policy to call out certain file types.

### 4. Monorepo with multiple languages

Recommended setup:

- Keep one shared release pin.
- Use multiple workflow invocations if different directories need different policies.
- Pass different `policy_path` or `prompt_registry_path` values for each sub-area if needed.

Example patterns:

- frontend package: stricter JS/TS policy
- backend package: stricter service or infra policy
- docs package: lighter policy but stricter release-note checks

### 5. Enterprise repo with stricter review rules

Recommended setup:

- Pin the release tag.
- Override the policy file and prompt registry.
- Keep the execution model unchanged.

This is the best fit when you need:

- tighter forbidden-file enforcement
- custom severity thresholds
- company-specific prompt wording
- different behavior for different repository classes

## When to change the implementation model

Only change the implementation model if you need one of these:

- a different provider-owned runtime
- a new analysis mode that cannot be expressed as a prompt or policy change
- a new artifact/report shape that requires code changes

In those cases, prefer:

1. a provider-owned action for the runtime
2. a reusable workflow for orchestration
3. prompt or policy overrides only for user-specific behavior

## Practical defaults

If you are unsure, start here:

- `Secure PR Review`: use the latest release tag
- `code-apply.yml`: keep the default policy and registry
- `repo-hygiene.yml`: use the default provider-owned action and override only policy or prompt paths if your repo needs it
- `repo-sweep.yml`: keep the default sweep prompt and only override the registry when you have a custom audit format

## Avoid these patterns

- Do not depend on the caller repo carrying this repo’s source tree.
- Do not pin consumers to `main` if you want stable behavior.
- Do not use absolute paths for policy or prompt files.
- Do not override the workflow execution model unless you really need new behavior.

If you need a new capability, add a new prompt pack or policy first. Move to a code change only when the prompt/policy surface cannot express the desired behavior.
