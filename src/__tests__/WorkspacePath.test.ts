import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { resolveWorkspacePath } from '../lib/WorkspacePath';

describe('WorkspacePath', () => {
  let workspaceRoot: string;

  beforeEach(() => {
    workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'workspace-path-'));
  });

  afterEach(() => {
    fs.rmSync(workspaceRoot, { recursive: true, force: true });
  });

  it('resolves repo-relative paths inside the workspace', () => {
    const resolved = resolveWorkspacePath('prompts/registry.json', workspaceRoot);
    expect(resolved).toBe(path.join(workspaceRoot, 'prompts/registry.json'));
  });

  it('rejects paths that escape the workspace', () => {
    expect(() => resolveWorkspacePath('../../etc/passwd', workspaceRoot)).toThrow(
      'Path escapes workspace root: ../../etc/passwd'
    );
  });

  it('rejects empty paths', () => {
    expect(() => resolveWorkspacePath('   ', workspaceRoot)).toThrow('Workspace path must not be empty.');
  });
});
