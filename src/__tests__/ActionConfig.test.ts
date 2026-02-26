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
      process.env.INPUT_MAX_DIFF_SIZE = '2097152';
      process.env.INPUT_AI_MODEL = 'custom-model';
      process.env.INPUT_APPROVED_THRESHOLD = '8';
      
      config.load();
      
      expect(config.get('maxDiffSize')).toBe(2097152);
      expect(config.get('aiModel')).toBe('custom-model');
      expect(config.get('approvedThreshold')).toBe(8);
      
      delete process.env.INPUT_MAX_DIFF_SIZE;
      delete process.env.INPUT_AI_MODEL;
      delete process.env.INPUT_APPROVED_THRESHOLD;
    });
    
    it('should validate configuration constraints', () => {
      process.env.INPUT_MAX_DIFF_SIZE = '100'; // Too small
      
      expect(() => config.load()).toThrow('Configuration validation failed');
      
      delete process.env.INPUT_MAX_DIFF_SIZE;
    });
  });
  
  describe('validation', () => {
    it('should reject invalid size limits', async () => {
      process.env.INPUT_MAX_DIFF_SIZE = '100'; // Below minimum
      
      await expect(config.load()).rejects.toThrow('Configuration validation failed');
      
      delete process.env.INPUT_MAX_DIFF_SIZE;
    });
    
    it('should reject invalid threshold values', async () => {
      process.env.INPUT_APPROVED_THRESHOLD = '15'; // Above maximum
      
      await expect(config.load()).rejects.toThrow('Configuration validation failed');
      
      delete process.env.INPUT_APPROVED_THRESHOLD;
    });
  });
});