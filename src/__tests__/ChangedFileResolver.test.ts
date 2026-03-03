import { normalizeGitPath, resolveChangedFile } from '../lib/ChangedFileResolver';

describe('ChangedFileResolver', () => {
  it('normalizes git path prefixes', () => {
    expect(normalizeGitPath('a/src/file.ts')).toBe('src/file.ts');
    expect(normalizeGitPath('b/src/file.ts')).toBe('src/file.ts');
    expect(normalizeGitPath(' src/file.ts ')).toBe('src/file.ts');
  });

  it('resolves exact path matches', () => {
    const changedFiles = ['src/lib/AIReviewer.ts', 'src/lib/CommentPoster.ts'];
    expect(resolveChangedFile('src/lib/AIReviewer.ts', changedFiles)).toBe('src/lib/AIReviewer.ts');
  });

  it('resolves unique basename matches', () => {
    const changedFiles = ['src/lib/AIReviewer.ts', 'src/lib/CommentPoster.ts'];
    expect(resolveChangedFile('a/CommentPoster.ts', changedFiles)).toBe('src/lib/CommentPoster.ts');
  });

  it('does not resolve ambiguous basename matches', () => {
    const changedFiles = ['src/a/config.ts', 'src/b/config.ts'];
    expect(resolveChangedFile('config.ts', changedFiles)).toBeNull();
  });

  it('resolves suffix contains matches', () => {
    const changedFiles = ['src/lib/ChangedFileResolver.ts'];
    expect(resolveChangedFile('lib/ChangedFileResolver.ts', changedFiles)).toBe('src/lib/ChangedFileResolver.ts');
  });
});
