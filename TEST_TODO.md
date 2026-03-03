# PR Comment Reliability TODO

- [x] Pass 1: Make summary/security/AI PR comments update reliably (no duplicates, always latest bot marker comment).
- [x] Trigger workflow with a small commit and verify markers update in place:
  - [x] `<!-- ai-review-comment -->`
  - [x] `<!-- security-notice-comment -->`
  - [x] `<!-- summary-comment -->`
- [x] Pass 2: Add inline PR review comments in "Files changed" (step 3).
- [x] Trigger workflow again and verify inline review comments appear on changed files.
- [ ] Pass 3: Validate `/code_apply` child PR creation when source PR head branch is missing.
  - [ ] Ensure workflow falls back child PR base from deleted head branch to source PR base branch.
  - [ ] Ensure `/code_apply` result comment reports explicit failure reason when child PR creation fails.
