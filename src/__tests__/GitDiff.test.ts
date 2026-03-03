import { exec } from '@actions/exec';
import { getChangedFilesBetween, getDiffBetween, getHeadDiff } from '../lib/GitDiff';

jest.mock('@actions/exec', () => ({
  exec: jest.fn(),
}));

describe('GitDiff helpers', () => {
  beforeEach(() => {
    (exec as jest.Mock).mockReset();
  });

  it('builds head diff command without base sha', async () => {
    (exec as jest.Mock).mockImplementation(async (_cmd: string, _args: string[], options?: any) => {
      options?.listeners?.stdout?.(Buffer.from('diff-output'));
      return 0;
    });

    const output = await getHeadDiff();

    expect(exec).toHaveBeenCalledWith('git', ['diff', '--no-color'], expect.any(Object));
    expect(output).toBe('diff-output');
  });

  it('builds head diff command with base sha', async () => {
    (exec as jest.Mock).mockResolvedValue(0);

    await getHeadDiff('abc123');

    expect(exec).toHaveBeenCalledWith('git', ['diff', '--no-color', 'abc123...HEAD'], expect.any(Object));
  });

  it('parses changed files output', async () => {
    (exec as jest.Mock).mockImplementation(async (_cmd: string, _args: string[], options?: any) => {
      options?.listeners?.stdout?.(Buffer.from('src/a.ts\n\nsrc/b.ts\n'));
      return 0;
    });

    const files = await getChangedFilesBetween('base', 'head');

    expect(exec).toHaveBeenCalledWith(
      'git',
      ['diff', '--name-only', '--diff-filter=ACMR', 'base', 'head'],
      expect.any(Object)
    );
    expect(files).toEqual(['src/a.ts', 'src/b.ts']);
  });

  it('builds range diff command with unified option', async () => {
    (exec as jest.Mock).mockResolvedValue(0);

    await getDiffBetween('base', 'head', { unified: 1 });

    expect(exec).toHaveBeenCalledWith('git', ['diff', '--unified=1', 'base', 'head'], expect.any(Object));
  });
});
