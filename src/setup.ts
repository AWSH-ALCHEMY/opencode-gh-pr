import { exec } from '@actions/exec';
import * as core from '@actions/core';

async function ensureOpenCodeCli(): Promise<void> {
  try {
    await exec('opencode', ['--version'], { silent: true });
    core.info('OpenCode CLI already available on PATH');
    return;
  } catch {
    core.info('OpenCode CLI not found on PATH; installing opencode-ai globally');
  }

  await exec('npm', ['install', '-g', 'opencode-ai']);
  core.info('OpenCode CLI installation complete');
}

async function run(): Promise<void> {
  core.info('🚀 Starting Secure PR Review action setup');
  await ensureOpenCodeCli();
}

run().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  core.setFailed(`Secure PR Review setup failed: ${message}`);
});
