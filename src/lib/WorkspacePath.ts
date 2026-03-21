import * as path from 'path';

export function getWorkspaceRoot(): string {
  return process.env['GITHUB_WORKSPACE'] ?? process.cwd();
}

export function resolveWorkspacePath(inputPath: string, workspaceRoot = getWorkspaceRoot()): string {
  const trimmedPath = inputPath.trim();
  if (!trimmedPath) {
    throw new Error('Workspace path must not be empty.');
  }

  const resolvedRoot = path.resolve(workspaceRoot);
  const resolvedPath = path.isAbsolute(trimmedPath)
    ? path.normalize(trimmedPath)
    : path.resolve(resolvedRoot, trimmedPath);

  const relativePath = path.relative(resolvedRoot, resolvedPath);
  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    throw new Error(`Path escapes workspace root: ${trimmedPath}`);
  }

  return resolvedPath;
}
