import { Logger } from '../lib/Logger';

describe('Logger', () => {
  let logger: Logger;
  
  beforeEach(() => {
    logger = new Logger('test');
  });
  
  describe('sanitizeMessage', () => {
    it('should remove dangerous characters from messages', () => {
      const dangerous = 'Hello <script>alert("xss")</script> & "quotes"';
      const sanitized = logger['sanitizeMessage'](dangerous);
      
      expect(sanitized).not.toContain('<');
      expect(sanitized).not.toContain('>');
      expect(sanitized).not.toContain('"');
      expect(sanitized).not.toContain('&');
    });
    
    it('should limit message length', () => {
      const longMessage = 'a'.repeat(2000);
      const sanitized = logger['sanitizeMessage'](longMessage);
      
      expect(sanitized.length).toBeLessThanOrEqual(1000);
    });
  });
  
  describe('sanitizeData', () => {
    it('should redact sensitive keys', () => {
      const data = {
        username: 'john',
        password: 'secret123',
        apiKey: 'key456',
        normalField: 'value',
      };
      
      const sanitized = logger['sanitizeData'](data);
      
      expect(sanitized.password).toBe('[REDACTED]');
      expect(sanitized.apiKey).toBe('[REDACTED]');
      expect(sanitized.username).toBe('john');
      expect(sanitized.normalField).toBe('value');
    });
    
    it('should sanitize string values', () => {
      const data = {
        message: 'Hello; rm -rf / | exec',
      };
      
      const sanitized = logger['sanitizeData'](data);
      
      expect(sanitized.message).not.toContain(';');
      expect(sanitized.message).not.toContain('|');
      expect(sanitized.message).not.toContain('$');
    });
    
    it('should recursively sanitize nested objects', () => {
      const data = {
        user: {
          name: 'john',
          password: 'secret',
        },
        config: {
          api_key: 'key123',
        },
      };
      
      const sanitized = logger['sanitizeData'](data);
      
      expect(sanitized.user.password).toBe('[REDACTED]');
      expect(sanitized.config.api_key).toBe('[REDACTED]');
      expect(sanitized.user.name).toBe('john');
    });
  });
  
  describe('isSensitiveKey', () => {
    it('should identify sensitive key patterns', () => {
      expect(logger['isSensitiveKey']('password')).toBe(true);
      expect(logger['isSensitiveKey']('api_key')).toBe(true);
      expect(logger['isSensitiveKey']('jwt_token')).toBe(true);
      expect(logger['isSensitiveKey']('ssh_private')).toBe(true);
      expect(logger['isSensitiveKey']('username')).toBe(false);
      expect(logger['isSensitiveKey']('name')).toBe(false);
    });
  });
});