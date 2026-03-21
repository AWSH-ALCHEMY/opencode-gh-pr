import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { PromptContracts } from '../lib/PromptContracts';
import { Logger } from '../lib/Logger';

describe('PromptContracts', () => {
  let workspaceRoot: string;
  const info = jest.fn();
  const logger: Logger = {
    info,
    warn: jest.fn(),
    error: jest.fn(),
    startGroup: jest.fn(),
    endGroup: jest.fn(),
  } as unknown as Logger;

  beforeEach(() => {
    workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'prompt-contracts-'));
  });

  afterEach(() => {
    delete process.env['GITHUB_WORKSPACE'];
    fs.rmSync(workspaceRoot, { recursive: true, force: true });
    jest.clearAllMocks();
  });

  it('resolves a custom registry relative to the workspace root', () => {
    process.env['GITHUB_WORKSPACE'] = workspaceRoot;

    fs.mkdirSync(path.join(workspaceRoot, 'prompts/review/v1'), { recursive: true });
    fs.mkdirSync(path.join(workspaceRoot, 'prompts/code_apply/v1'), { recursive: true });
    fs.mkdirSync(path.join(workspaceRoot, 'prompts/hygiene/v1'), { recursive: true });
    fs.mkdirSync(path.join(workspaceRoot, 'config'), { recursive: true });

    fs.writeFileSync(path.join(workspaceRoot, 'prompts/review/v1/system.prompt.md'), 'System prompt');
    fs.writeFileSync(path.join(workspaceRoot, 'prompts/review/v1/template.prompt.md'), 'Hello {{name}}');
    fs.writeFileSync(path.join(workspaceRoot, 'prompts/review/v1/schema.json'), '{}');
    fs.writeFileSync(path.join(workspaceRoot, 'prompts/code_apply/v1/system.prompt.md'), 'Apply prompt');
    fs.writeFileSync(path.join(workspaceRoot, 'prompts/code_apply/v1/schema.json'), '{}');
    fs.writeFileSync(path.join(workspaceRoot, 'prompts/hygiene/v1/system.prompt.md'), 'Hygiene prompt');
    fs.writeFileSync(path.join(workspaceRoot, 'prompts/hygiene/v1/template.prompt.md'), 'Check {{name}}');
    fs.writeFileSync(path.join(workspaceRoot, 'prompts/hygiene/v1/schema.json'), '{}');

    fs.writeFileSync(
      path.join(workspaceRoot, 'config/custom-registry.json'),
      JSON.stringify(
        {
          version: 1,
          active: {
            ai_review: 'review_custom',
            code_apply: 'code_apply_custom',
            hygiene_review: 'hygiene_custom',
          },
          packs: {
            review_custom: {
              id: 'ai_review',
              version: '2.0.0',
              riskTier: 'medium',
              system: 'prompts/review/v1/system.prompt.md',
              template: 'prompts/review/v1/template.prompt.md',
              schema: 'prompts/review/v1/schema.json',
            },
            code_apply_custom: {
              id: 'code_apply',
              version: '2.0.0',
              riskTier: 'high',
              system: 'prompts/code_apply/v1/system.prompt.md',
              schema: 'prompts/code_apply/v1/schema.json',
            },
            hygiene_custom: {
              id: 'hygiene_review',
              version: '2.0.0',
              riskTier: 'medium',
              system: 'prompts/hygiene/v1/system.prompt.md',
              template: 'prompts/hygiene/v1/template.prompt.md',
              schema: 'prompts/hygiene/v1/schema.json',
            },
          },
        },
        null,
        2
      )
    );

    const contracts = new PromptContracts({
      logger,
      registryPath: 'config/custom-registry.json',
    });

    const rendered = contracts.render('ai_review', { name: 'World' });

    expect(rendered.text).toContain('System prompt');
    expect(rendered.text).toContain('Hello World');
    expect(rendered.pack.version).toBe('2.0.0');
    expect(info).toHaveBeenCalledWith(
      'Using prompt pack',
      expect.objectContaining({
        task: 'ai_review',
        version: '2.0.0',
      })
    );
  });
});
