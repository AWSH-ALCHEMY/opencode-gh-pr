import { exec } from '@actions/exec';
import { Logger } from './Logger';

export async function runOpenCodeJsonPrompt(
  prompt: string,
  options?: { logger?: Logger; stderrLabel?: string; stderrLimit?: number }
): Promise<string> {
  let output = '';
  let errorOutput = '';

  await exec('opencode', ['run', '-', '--format', 'json'], {
    input: Buffer.from(prompt, 'utf8'),
    listeners: {
      stdout: (data: Buffer) => {
        output += data.toString();
      },
      stderr: (data: Buffer) => {
        errorOutput += data.toString();
      },
    },
  });

  if (errorOutput && options?.logger) {
    const stderrLimit = options.stderrLimit ?? 2000;
    options.logger.warn(options.stderrLabel ?? 'OpenCode stderr output detected', {
      stderr: errorOutput.substring(0, stderrLimit),
    });
  }

  return output;
}
