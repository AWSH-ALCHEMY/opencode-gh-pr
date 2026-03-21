# Prompt Contracts

This repository uses prompt contracts to keep AI interactions versioned and auditable.

## Structure

- Registry: `prompts/registry.json`
- Prompt packs:
  - `prompts/review/v1/`
  - `prompts/code_apply/v1/`
  - `prompts/hygiene/v1/`

Each pack defines:

- `system` prompt (`*.prompt.md`)
- optional `template` prompt (`*.prompt.md`)
- optional `schema` definition
- pack metadata (`id`, `version`, `riskTier`)

## Runtime Use

- TypeScript code uses `src/lib/PromptContracts.ts` to:
  - resolve active pack for a task
  - verify referenced files exist
  - render template variables
  - log pack version and risk tier
- The prompt registry path can be overridden via:
  - action input `prompt-registry-path`
  - workflow input `prompt_registry_path` for `code-apply.yml` and `repo-hygiene.yml`
  - environment variable `PROMPT_REGISTRY_PATH` for lower-level runtime entrypoints
- Workflow `/code_apply` resolves its prompt path from the configured prompt registry via `jq`.
- Workflow `/code_apply` policy loading can be overridden with the `policy_path` workflow input.
- Repo hygiene policy loading can be overridden with the `policy_path` workflow input.

## Hygiene Prompt Notes

- `prompts/hygiene/v1/system.prompt.md` requires explicit findings for documentation professionalism issues.
- Tone findings (dismissive/hostile/insulting language) should be reported separately from artifact/debug findings when both apply.

## Why

- Removes large inline prompt blocks from code/workflows.
- Makes prompt updates explicit and reviewable.
- Supports future prompt version upgrades without changing business logic.
