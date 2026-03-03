# `/code_apply` Child PR Design

## Problem

Current `/code_apply` behavior commits directly to the source PR branch. Over time this causes:

- Long, noisy branch history with mixed human and bot commits
- Weak auditability (hard to answer what was changed, why, and by whom)
- Higher risk when broad commands like `/code_apply --all` are used

## Goal

Change `/code_apply` to use an isolated bot branch and open a separate PR for AI-applied changes, instead of pushing directly to the source PR branch.

## Current Status

- Implemented: isolated apply branch + child PR creation from `/code_apply`
- Implemented: one-time approval label consumption (`requireLabel`)
- Implemented: managed feedback/result comment cleanup for older `/code_apply` bot comments
- Implemented: targeted inline review thread resolution when apply changes are produced

## Non-Goals

- Replacing the existing secure review workflow
- Introducing a GitHub App
- Auto-merging AI changes without human review

## Proposed Behavior

### Commands

- `/code_apply this`
- `/code_apply <comment_id>`
- `/code_apply --all`
- Optional later: `/code_apply --batch <n>`

Command parsing stays mostly the same, but apply target becomes a new bot branch.

### Branch and PR model

For a source PR `#123` on head branch `feature-x`:

- Create bot branch from PR head SHA:
  - `codeapply/pr-123/run-<run_id>`
- Apply requested changes on bot branch
- Push bot branch
- Open child PR:
  - Base: `feature-x` (source PR head branch)
  - Head: `codeapply/pr-123/run-<run_id>`

Result: source PR branch remains human-owned; AI changes are reviewed in an isolated PR first.

## Metadata and Traceability

### Commit message format

`chore(code_apply): apply requested review fixes (src-pr:#123 run:<run_id>)`

### Child PR title format

`code_apply: suggested fixes for PR #123 (<scope>)`

`<scope>` examples:

- `comment 2868151622`
- `47 comments`

### Child PR body template

- Source PR URL and number
- Command issuer (`@login`)
- Trigger command text
- Target review comment IDs
- Workflow run URL
- File-change summary
- Safety notes (for example: workflow-file edits reverted)

## Safety Controls

- Keep existing collaborator restrictions
- Add explicit gate:
  - Require label `ai-apply-approved` on source PR before apply job runs
- Keep fork block (do not apply for forked PRs with default token permissions)
- Keep restricted workflow-file revert logic
- Keep timeout and failure feedback commenting

## Policy Configuration

Policy is defined in `.github/code-apply-policy.json` with:

- `activeProfile`: selected profile name
- `profiles`: map of profile objects

Supported profile fields:

- `allowedAuthorAssociations` (array): allowed values include `OWNER`, `MEMBER`, `COLLABORATOR`, `CONTRIBUTOR`
- `requireLabel` (string): label that must exist on source PR to allow `/code_apply`
- `allowAll` (boolean): whether `/code_apply --all` is allowed
- `maxCommentsPerRun` (number): hard cap on target comments per command
- `requireForceForAll` (boolean): require `/code_apply --all --force` instead of plain `--all`
- `splitByTopic` (boolean): split eligible comments into topic buckets and process each bucket independently
- `simpleBatchTopics` (array): topic names that should be grouped into one `simple-batch` bucket
- `maxTopicGroupsPerRun` (number): hard cap on number of topic buckets spawned in a single `/code_apply` run

Operational note:

- Required approval labels are consumed as one-time approvals when a command passes label gating.

Security note:

- Workflow loads this policy file from the repository default branch (`main` in most repos), not from the PR head branch.

## Workflow Architecture

Use current `.github/workflows/code-apply.yml` with a two-job structure plus child-PR creation:

1. `resolve-command`
- Parse command and validate author/context
- Resolve source PR and target comment IDs
- Output source PR head ref + SHA

2. `apply` (matrix by topic bucket)
- Checkout source PR head SHA
- Create bot branch name per topic bucket
- Collect bucket comments and run OpenCode
- Revert restricted workflow-file changes if any
- Commit and push bot branch if diff exists
- Create child PR per topic bucket
- Post status comment to source PR with topic + child PR link

3. `feedback`
- Same as now for invalid commands or blocked runs

## Idempotency Rules

Prevent child PR spam from repeated commands:

- Search for open child PR with marker in body:
  - `<!-- code_apply:source_pr=123 -->`
- If found:
  - Push new commit(s) to same child branch and update same child PR
- If not found:
  - Create new child branch + child PR

## Permission Requirements

For `code-apply.yml`:

- `contents: write` (push bot branch)
- `pull-requests: write` (create/update child PR)
- `issues: write` (feedback comments)

No additional app installation required.

## Operational UX

When command is accepted on source PR:

- Post acknowledgment comment:
  - command accepted
  - run URL
  - target comment count

When child PR is created/updated:

- Post source-PR comment with:
  - child PR URL
  - commit SHA
  - number of applied comments
  - restricted edits note if any were reverted

## Rollout Plan

### Phase 1 (MVP)

- Add child branch creation and child PR creation
- Stop direct pushes to source PR branch
- Keep one-child-PR-per-source-PR behavior (update existing child PR)

### Phase 2

- Add label gate (`ai-apply-approved`)
- Add optional `--batch <n>`
- Improve commit/PR summaries with per-file change stats

### Phase 3

- Add stale child PR cleanup policy
- Add metrics (success rate, avg files changed, rejection reasons)

## Open Decisions

- Should child PR base always be source PR head branch, or default to `main` in some repos?
- Should `/code_apply --all` be restricted to OWNER only?
- Should each command create a new child PR or update one rolling child PR?

Current recommendation:

- Base child PR on source PR head branch
- Allow `--all` for collaborators only if source PR has `ai-apply-approved` label
- Use rolling single child PR per source PR (lower noise)
