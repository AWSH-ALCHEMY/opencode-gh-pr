import * as fs from 'fs';
import * as path from 'path';
import { Logger } from './Logger';

type PromptTask = 'ai_review' | 'code_apply' | 'hygiene_review';

interface PromptPackConfig {
  id: PromptTask;
  version: string;
  riskTier: string;
  system: string;
  template?: string;
  schema?: string;
}

interface PromptRegistry {
  version: number;
  active: Record<PromptTask, string>;
  packs: Record<string, PromptPackConfig>;
}

export interface ResolvedPromptPack {
  id: PromptTask;
  version: string;
  riskTier: string;
  systemPath: string;
  templatePath?: string;
  schemaPath?: string;
}

export class PromptContracts {
  private readonly logger: Logger;
  private readonly registryPath: string;
  private readonly registry: PromptRegistry;

  constructor(options: { logger: Logger; registryPath?: string }) {
    this.logger = options.logger;
    this.registryPath = options.registryPath || path.resolve(process.cwd(), 'prompts/registry.json');
    this.registry = this.loadRegistry();
  }

  public resolve(task: PromptTask): ResolvedPromptPack {
    const activePackName = this.registry.active[task];
    if (!activePackName) {
      throw new Error(`No active prompt pack configured for task '${task}'.`);
    }
    const pack = this.registry.packs[activePackName];
    if (!pack) {
      throw new Error(`Active prompt pack '${activePackName}' not found in registry.`);
    }
    if (pack.id !== task) {
      throw new Error(`Active pack '${activePackName}' is declared for '${pack.id}', not '${task}'.`);
    }

    const systemPath = this.resolvePath(pack.system);
    this.assertFileExists(systemPath, `${task} system prompt`);

    const templatePath = pack.template ? this.resolvePath(pack.template) : undefined;
    if (templatePath) {
      this.assertFileExists(templatePath, `${task} template prompt`);
    }

    const schemaPath = pack.schema ? this.resolvePath(pack.schema) : undefined;
    if (schemaPath) {
      this.assertFileExists(schemaPath, `${task} schema`);
    }

    const resolved: ResolvedPromptPack = {
      id: pack.id,
      version: pack.version,
      riskTier: pack.riskTier,
      systemPath,
    };
    if (templatePath) {
      resolved.templatePath = templatePath;
    }
    if (schemaPath) {
      resolved.schemaPath = schemaPath;
    }
    return resolved;
  }

  public render(task: PromptTask, context: Record<string, string>): { text: string; pack: ResolvedPromptPack } {
    const pack = this.resolve(task);
    const systemPrompt = fs.readFileSync(pack.systemPath, 'utf8').trim();
    const templatePrompt = pack.templatePath ? fs.readFileSync(pack.templatePath, 'utf8').trim() : '';
    const renderedTemplate = templatePrompt ? this.interpolate(templatePrompt, context) : '';
    const fullPrompt = renderedTemplate ? `${systemPrompt}\n\n${renderedTemplate}` : systemPrompt;

    this.logger.info(`Using prompt pack`, {
      task,
      version: pack.version,
      riskTier: pack.riskTier,
      systemPath: path.relative(process.cwd(), pack.systemPath),
      templatePath: pack.templatePath ? path.relative(process.cwd(), pack.templatePath) : '',
      schemaPath: pack.schemaPath ? path.relative(process.cwd(), pack.schemaPath) : '',
    });

    return { text: fullPrompt, pack };
  }

  private interpolate(template: string, context: Record<string, string>): string {
    const missing = new Set<string>();
    const rendered = template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key: string) => {
      const value = context[key];
      if (value === undefined) {
        missing.add(key);
        return '';
      }
      return value;
    });

    if (missing.size > 0) {
      throw new Error(`Missing prompt template variables: ${Array.from(missing).sort().join(', ')}`);
    }

    return rendered;
  }

  private loadRegistry(): PromptRegistry {
    if (!fs.existsSync(this.registryPath)) {
      throw new Error(`Prompt registry file not found: ${this.registryPath}`);
    }

    const raw = fs.readFileSync(this.registryPath, 'utf8');
    const parsed = JSON.parse(raw) as Partial<PromptRegistry>;

    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Prompt registry JSON is invalid.');
    }
    if (typeof parsed.version !== 'number') {
      throw new Error('Prompt registry missing numeric version.');
    }
    if (!parsed.active || typeof parsed.active !== 'object') {
      throw new Error('Prompt registry missing active map.');
    }
    if (!parsed.packs || typeof parsed.packs !== 'object') {
      throw new Error('Prompt registry missing packs map.');
    }

    return parsed as PromptRegistry;
  }

  private resolvePath(relativePath: string): string {
    const normalizedPath = path.normalize(relativePath);
    if (normalizedPath.includes('..')) {
      throw new Error(`Invalid path: path traversal not allowed: ${relativePath}`);
    }
    return path.resolve(process.cwd(), normalizedPath);
  }

  private assertFileExists(filePath: string, label: string): void {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Missing ${label}: ${filePath}`);
    }
  }
}
