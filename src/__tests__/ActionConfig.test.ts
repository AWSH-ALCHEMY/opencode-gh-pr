import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { ActionConfig } from '../lib/ActionConfig';


describe('ActionConfig', () => {
  let config: ActionConfig;
  let workspaceRoot: string | undefined;
  
  beforeEach(() => {
    config = new ActionConfig();
  });

  afterEach(() => {
    delete process.env['INPUT_CONFIG_FILE'];
    delete process.env['INPUT_CONFIG-FILE'];
    delete process.env['GITHUB_WORKSPACE'];
    if (workspaceRoot) {
      fs.rmSync(workspaceRoot, { recursive: true, force: true });
      workspaceRoot = undefined;
    }
  });
  
  describe('load', () => {
    it('should load default configuration successfully', () => {
      config.load();
      
      expect(config.get('maxDiffSize')).toBe(1048576);
      expect(config.get('maxFiles')).toBe(100);
      expect(config.get('aiModel')).toBe('opencode-reviewer');
      expect(config.get('approvedThreshold')).toBe(7);
    });
    
    it('should override with environment inputs', () => {
      process.env['INPUT_MAX-DIFF-SIZE'] = '2097152';
      process.env['INPUT_AI-MODEL'] = 'custom-model';
      process.env['INPUT_APPROVED-THRESHOLD'] = '8';
      
      config.load();
      
      expect(config.get('maxDiffSize')).toBe(2097152);
      expect(config.get('aiModel')).toBe('custom-model');
      expect(config.get('approvedThreshold')).toBe(8);
      
      delete process.env['INPUT_MAX-DIFF-SIZE'];
      delete process.env['INPUT_AI-MODEL'];
      delete process.env['INPUT_APPROVED-THRESHOLD'];
    });

    it('should load a config file relative to the workspace root', () => {
      workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'action-config-'));
      process.env['GITHUB_WORKSPACE'] = workspaceRoot;
      process.env['INPUT_CONFIG_FILE'] = '.github/pr-review-config.yml';
      process.env['INPUT_CONFIG-FILE'] = '.github/pr-review-config.yml';

      fs.mkdirSync(path.join(workspaceRoot, '.github'), { recursive: true });
      fs.writeFileSync(
        path.join(workspaceRoot, '.github/pr-review-config.yml'),
        [
          'sizeLimits:',
          '  maxDiffSize: 2097152',
          '  maxFiles: 11',
          'aiReview:',
          '  model: custom-model',
          'criteria:',
          '  approvedThreshold: 9',
        ].join('\n')
      );

      config.load();

      expect(config.get('maxDiffSize')).toBe(2097152);
      expect(config.get('maxFiles')).toBe(11);
      expect(config.get('aiModel')).toBe('custom-model');
      expect(config.get('approvedThreshold')).toBe(9);
    });
    
    it('should validate configuration constraints', () => {
      process.env['INPUT_MAX-DIFF-SIZE'] = '100'; // Too small
      
      expect(() => config.load()).toThrow('Configuration validation failed');
      
      delete process.env['INPUT_MAX-DIFF-SIZE'];
    });
  });
  
  describe('validation', () => {
    it('should reject invalid size limits', () => {
      process.env['INPUT_MAX-DIFF-SIZE'] = '100'; // Below minimum
      
      expect(() => config.load()).toThrow('Configuration validation failed');
      
      delete process.env['INPUT_MAX-DIFF-SIZE'];
    });
    
    it('should reject invalid threshold values', () => {
      process.env['INPUT_APPROVED-THRESHOLD'] = '15'; // Above maximum
      
      expect(() => config.load()).toThrow('Configuration validation failed');
      
      delete process.env['INPUT_APPROVED-THRESHOLD'];
    });
  });
});
