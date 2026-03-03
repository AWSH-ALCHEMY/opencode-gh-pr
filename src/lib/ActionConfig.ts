import * as core from '@actions/core';
import { z } from 'zod';
import * as yaml from 'js-yaml';
import * as fs from 'fs';


/**
 * Configuration schema validation using Zod
 * Ensures all configuration values are properly typed and validated
 */
const ConfigSchema = z.object({
  // Size limits
  maxDiffSize: z.number().min(1024).max(10485760), // 1KB - 10MB
  maxFiles: z.number().min(1).max(1000),
  maxLines: z.number().min(10).max(50000),
  maxAiDiffSize: z.number().min(1024).max(1048576),
  
  // AI Configuration
  aiModel: z.string().min(1),
  temperature: z.number().min(0).max(1),
  maxTokens: z.number().min(100).max(8000),
  timeout: z.number().min(5000).max(60000), // 5s - 60s
  
  // Review criteria
  approvedThreshold: z.number().min(1).max(10),
  securityAnalysis: z.boolean(),
  performanceCheck: z.boolean(),
  documentationCheck: z.boolean(),
  
  // Security patterns
  securityPatterns: z.array(z.object({
    pattern: z.string(),
    type: z.enum(['credential', 'security', 'config', 'ssh_key']),
    severity: z.enum(['low', 'medium', 'high', 'critical']),
  })),
  
  // Team assignments
  reviewerTeams: z.record(z.object({
    paths: z.array(z.string()),
    team: z.string(),
  })),
  
  // Output control
  createChecks: z.boolean(),
  postComments: z.boolean(),
  applyLabels: z.boolean(),
});

export type ActionConfigType = z.infer<typeof ConfigSchema>;

/**
 * Action configuration management
 * Loads and validates configuration from inputs and config files
 */
export class ActionConfig {
  private config: ActionConfigType;
  private initialized = false;
  
  constructor() {
    this.config = {
      maxDiffSize: 1048576, // 1MB
      maxFiles: 100,
      maxLines: 5000,
      maxAiDiffSize: 50000,
      aiModel: 'opencode-reviewer',
      temperature: 0.3,
      maxTokens: 2000,
      timeout: 30000,
      approvedThreshold: 7,
      securityAnalysis: true,
      performanceCheck: true,
      documentationCheck: true,
      securityPatterns: [
        { pattern: 'password|secret|key|credential|token', type: 'credential', severity: 'high' },
        { pattern: 'auth|security|encryption', type: 'security', severity: 'medium' },
        { pattern: '\\.env$|config\\.', type: 'config', severity: 'medium' },
        { pattern: '(id_rsa|id_dsa|id_ecdsa|id_ed25519)$', type: 'ssh_key', severity: 'critical' },
      ],
      reviewerTeams: {},
      createChecks: true,
      postComments: true,
      applyLabels: true,
    };
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      this.load();
      this.initialized = true;
    }
  }
  
  /**
   * Load configuration from inputs and config file
   */
  load(): void {
    try {
      // Override with action inputs
      this.overrideWithInputs();
      
      // Load from config file if specified
      const configFile = core.getInput('config-file');
      if (configFile && fs.existsSync(configFile)) {
        this.loadFromFile(configFile);
      }
      
      // Validate final configuration
      this.validate();
      
      core.info('✅ Configuration loaded and validated');
      
    } catch (error) {
      throw new Error(`Configuration loading failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Override configuration with GitHub Action inputs
   */
  private overrideWithInputs(): void {
    const inputs = {
      maxDiffSize: core.getInput('max-diff-size'),
      maxFiles: core.getInput('max-files'),
      maxLines: core.getInput('max-lines'),
      aiModel: core.getInput('ai-model'),
      approvedThreshold: core.getInput('approved-threshold'),
      securityAnalysis: core.getInput('security-analysis'),
      performanceCheck: core.getInput('performance-check'),
      documentationCheck: core.getInput('documentation-check'),
      createChecks: core.getInput('create-checks'),
      postComments: core.getInput('post-comments'),
      applyLabels: core.getInput('apply-labels'),
    };
    
    // Apply numeric inputs
    if (inputs.maxDiffSize) this.config.maxDiffSize = parseInt(inputs.maxDiffSize);
    if (inputs.maxFiles) this.config.maxFiles = parseInt(inputs.maxFiles);
    if (inputs.maxLines) this.config.maxLines = parseInt(inputs.maxLines);
    if (inputs.approvedThreshold) this.config.approvedThreshold = parseInt(inputs.approvedThreshold);
    
    // Apply string inputs
    if (inputs.aiModel) this.config.aiModel = inputs.aiModel;
    
    // Apply boolean inputs
    if (inputs.securityAnalysis) this.config.securityAnalysis = inputs.securityAnalysis === 'true';
    if (inputs.performanceCheck) this.config.performanceCheck = inputs.performanceCheck === 'true';
    if (inputs.documentationCheck) this.config.documentationCheck = inputs.documentationCheck === 'true';
    if (inputs.createChecks) this.config.createChecks = inputs.createChecks === 'true';
    if (inputs.postComments) this.config.postComments = inputs.postComments === 'true';
    if (inputs.applyLabels) this.config.applyLabels = inputs.applyLabels === 'true';
  }
  
  /**
   * Load configuration from YAML file
   */
  private loadFromFile(filePath: string): void {
    try {
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const fileConfig = yaml.load(fileContent) as Record<string, unknown>;
      
      // Merge file configuration with current config
      this.mergeConfig(fileConfig);
      
      core.info(`✅ Configuration loaded from ${filePath}`);
      
    } catch (error) {
      throw new Error(`Failed to load config file ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Deep merge configuration objects
   */
  private mergeConfig(fileConfig: Record<string, unknown>): void {
    if (typeof fileConfig['sizeLimits'] === 'object' && fileConfig['sizeLimits'] !== null) {
      const sizeLimits = fileConfig['sizeLimits'] as Record<string, unknown>;
      if (typeof sizeLimits['maxDiffSize'] === 'number') this.config.maxDiffSize = sizeLimits['maxDiffSize'];
      if (typeof sizeLimits['maxFiles'] === 'number') this.config.maxFiles = sizeLimits['maxFiles'];
      if (typeof sizeLimits['maxLines'] === 'number') this.config.maxLines = sizeLimits['maxLines'];
      if (typeof sizeLimits['maxAiDiffSize'] === 'number') this.config.maxAiDiffSize = sizeLimits['maxAiDiffSize'];
    }
    
    if (typeof fileConfig['aiReview'] === 'object' && fileConfig['aiReview'] !== null) {
      const aiReview = fileConfig['aiReview'] as Record<string, unknown>;
      if (typeof aiReview['model'] === 'string') this.config.aiModel = aiReview['model'];
      if (typeof aiReview['temperature'] === 'number') this.config.temperature = aiReview['temperature'];
      if (typeof aiReview['maxTokens'] === 'number') this.config.maxTokens = aiReview['maxTokens'];
      if (typeof aiReview['timeout'] === 'number') this.config.timeout = aiReview['timeout'];
    }
    
    if (typeof fileConfig['criteria'] === 'object' && fileConfig['criteria'] !== null) {
      const criteria = fileConfig['criteria'] as Record<string, unknown>;
      if (typeof criteria['approvedThreshold'] === 'number') this.config.approvedThreshold = criteria['approvedThreshold'];
      if (typeof criteria['securityAnalysis'] === 'boolean') this.config.securityAnalysis = criteria['securityAnalysis'];
      if (typeof criteria['performanceCheck'] === 'boolean') this.config.performanceCheck = criteria['performanceCheck'];
      if (typeof criteria['documentationCheck'] === 'boolean') this.config.documentationCheck = criteria['documentationCheck'];
    }
    
    if (Array.isArray(fileConfig['securityPatterns'])) {
      this.config.securityPatterns = fileConfig['securityPatterns'] as Array<{
        pattern: string;
        type: 'credential' | 'security' | 'config' | 'ssh_key';
        severity: 'low' | 'medium' | 'high' | 'critical';
      }>;
    }
    
    if (typeof fileConfig['reviewerTeams'] === 'object' && fileConfig['reviewerTeams'] !== null) {
      this.config.reviewerTeams = fileConfig['reviewerTeams'] as Record<string, { paths: string[]; team: string }>;
    }
  }
  
  /**
   * Validate configuration using Zod schema
   */
  private validate(): void {
    try {
      this.config = ConfigSchema.parse(this.config);
      core.info('✅ Configuration validation passed');
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
        throw new Error(`Configuration validation failed: ${errors}`);
      }
      throw error;
    }
  }
  
  /**
   * Get configuration value
   */
  get<K extends keyof ActionConfigType>(key: K): ActionConfigType[K] {
    this.ensureInitialized();
    return this.config[key];
  }
  
  getAll(): ActionConfigType {
    this.ensureInitialized();
    return { ...this.config };
  }
}
