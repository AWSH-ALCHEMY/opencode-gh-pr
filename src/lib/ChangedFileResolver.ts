import * as path from 'path';

export function normalizeGitPath(rawPath: string): string {
  return rawPath.replace(/^a\//, '').replace(/^b\//, '').trim();
}

export function resolveChangedFile(rawPath: string, changedFiles: string[]): string | null {
  const normalized = normalizeGitPath(rawPath);
  if (!normalized) {
    return null;
  }

  if (changedFiles.includes(normalized)) {
    return normalized;
  }

  const baseName = path.basename(normalized);
  const byBaseName = changedFiles.filter((f) => path.basename(f) === baseName);
  if (byBaseName.length === 1) {
    return byBaseName[0] ?? null;
  }

  const byContains = changedFiles.filter((f) => f.endsWith(normalized) || normalized.endsWith(f));
  if (byContains.length === 1) {
    return byContains[0] ?? null;
  }

  return null;
}
