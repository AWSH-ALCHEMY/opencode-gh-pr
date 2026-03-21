import * as path from 'path';

export function getWorkspaceRoot(): string {
  return process.env['GITHUB_WORKSPACE'] ?? process.cwd();
}

export function resolveWorkspacePath(inputPath: string, workspaceRoot = getWorkspaceRoot()): string {
  if (!inputPath) {
    return workspaceRoot;
  }

  if (path.isAbsolute(inputPath)) {
    return path.normalize(inputPath);
  }

  return path.resolve(workspaceRoot, inputPath);
}
