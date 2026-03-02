# Secure PR Review Action

This repository runs a self-review workflow on pull requests and supports policy-driven `/code_apply` automation.

## Quick Start

1. Add required repository secret:
   - `OPENCODE_API_KEY`
2. Open a pull request.
3. Verify the `Secure PR Review` workflow results in the Actions tab.

## Self-Review Guide

Use the self-validation guide for setup, test flow, and troubleshooting:

- [SELF_REVIEWING.md](SELF_REVIEWING.md)

## Architecture Notes

- [`/code_apply` child PR design](docs/code-apply-child-pr-design.md)
- [`/code_apply` policy config](.github/code-apply-policy.json)
