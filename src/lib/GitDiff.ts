import { exec } from '@actions/exec';

async function runGit(args: string[]): Promise<string> {
  let output = '';
  await exec('git', args, {
    listeners: {
      stdout: (data: Buffer) => {
        output += data.toString();
      },
    },
  });
  return output;
}

export async function getHeadDiff(baseSha?: string): Promise<string> {
  const args: string[] = ['diff', '--no-color'];
  if (baseSha) {
    args.push(`${baseSha}...HEAD`);
  }
  return runGit(args);
}

export async function getChangedFilesBetween(baseSha: string, headSha: string): Promise<string[]> {
  const output = await runGit(['diff', '--name-only', '--diff-filter=ACMR', baseSha, headSha]);
  return output
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

export async function getDiffBetween(baseSha: string, headSha: string, options?: { unified?: number }): Promise<string> {
  const args = ['diff'];
  if (typeof options?.unified === 'number') {
    args.push(`--unified=${options.unified}`);
  }
  args.push(baseSha, headSha);
  return runGit(args);
}
