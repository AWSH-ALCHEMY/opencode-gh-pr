# PR Comment Reliability TODO

- [ ] Pass 1: Make summary/security/AI PR comments update reliably (no duplicates, always latest bot marker comment).
- [ ] Trigger workflow with a small commit and verify markers update in place:
  - [ ] `<!-- ai-review-comment -->`
  - [ ] `<!-- security-notice-comment -->`
  - [ ] `<!-- summary-comment -->`
- [ ] Pass 2: Add inline PR review comments in "Files changed" (step 3).
- [ ] Trigger workflow again and verify inline review comments appear on changed files.
