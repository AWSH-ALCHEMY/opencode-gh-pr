# Self-Review Guide

This guide explains how to validate this action repository against itself in a clean, repeatable way.

## Prerequisites

- GitHub repository with Actions enabled
- Node.js 20+
- Access to repository secrets

## Setup

1. Add repository secret:
   - `OPENCODE_API_KEY`
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build locally:
   ```bash
   npm run build
   ```

## Validation Flow

1. Create a feature branch.
2. Commit your changes.
3. Open a pull request to `main`.
4. Confirm `Secure PR Review` workflow completes.
5. Review bot comments and inline findings.

## `/code_apply` Notes

- Policy is controlled by `.github/code-apply-policy.json`.
- `--all` requires `--force` in the default policy profile.
- `ai-apply-approved` label is consumed as a one-time approval.

## Troubleshooting

- `Resource not accessible by integration`: verify workflow permissions.
- Child PR creation blocked: enable "Allow GitHub Actions to create and approve pull requests" in repository settings.
- No changes from `/code_apply`: requested comments may already be satisfied or edits may be filtered as restricted.
