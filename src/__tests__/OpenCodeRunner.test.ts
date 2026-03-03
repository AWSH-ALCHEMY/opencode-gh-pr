import { exec } from '@actions/exec';
import { runOpenCodeJsonPrompt } from '../lib/OpenCodeRunner';

jest.mock('@actions/exec', () => ({
  exec: jest.fn(),
}));

describe('OpenCodeRunner', () => {
  beforeEach(() => {
    (exec as jest.Mock).mockReset();
  });

  it('runs opencode with json format and returns stdout', async () => {
    (exec as jest.Mock).mockImplementation(async (_cmd: string, _args: string[], options?: any) => {
      options?.listeners?.stdout?.(Buffer.from('{"type":"text"}\n'));
      return 0;
    });

    const output = await runOpenCodeJsonPrompt('hello world');

    expect(exec).toHaveBeenCalledWith(
      'opencode',
      ['run', '-', '--format', 'json'],
      expect.objectContaining({
        input: Buffer.from('hello world', 'utf8'),
        listeners: expect.any(Object),
      })
    );
    expect(output).toBe('{"type":"text"}\n');
  });

  it('logs stderr with truncation when logger is provided', async () => {
    (exec as jest.Mock).mockImplementation(async (_cmd: string, _args: string[], options?: any) => {
      options?.listeners?.stderr?.(Buffer.from('abcdefghijk'));
      return 0;
    });

    const logger: any = { warn: jest.fn() };
    await runOpenCodeJsonPrompt('prompt', {
      logger,
      stderrLabel: 'OpenCode stderr',
      stderrLimit: 5,
    });

    expect(logger.warn).toHaveBeenCalledWith('OpenCode stderr', { stderr: 'abcde' });
  });
});
