import { ActionConfig } from '../lib/ActionConfig';


describe('ActionConfig', () => {
  let config: ActionConfig;
  
  beforeEach(() => {
    config = new ActionConfig();
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