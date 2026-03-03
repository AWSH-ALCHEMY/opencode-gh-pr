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
- Workflow `/code_apply` resolves its prompt path from `prompts/registry.json` via `jq`.

## Hygiene Prompt Notes

- `prompts/hygiene/v1/system.prompt.md` requires explicit findings for documentation professionalism issues.
- Tone findings (dismissive/hostile/insulting language) should be reported separately from artifact/debug findings when both apply.

## Why

- Removes large inline prompt blocks from code/workflows.
- Makes prompt updates explicit and reviewable.
- Supports future prompt version upgrades without changing business logic.
