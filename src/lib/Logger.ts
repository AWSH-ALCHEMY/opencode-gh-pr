import * as core from '@actions/core';

/**
 * Secure logging utility
 * Provides sanitized logging with different levels
 */
export class Logger {
  private readonly prefix: string;
  
  constructor(prefix = '🔒 SecurePRReview') {
    this.prefix = prefix;
  }
  
  /**
   * Log debug information (sanitized)
   */
  debug(message: string, data?: Record<string, unknown>): void {
    const sanitizedMessage = this.sanitizeMessage(message);
    const sanitizedData = data ? this.sanitizeData(data) : undefined;
    
    core.debug(`${this.prefix} [DEBUG] ${sanitizedMessage}`);
    if (sanitizedData) {
      core.debug(`${this.prefix} [DEBUG] Data: ${JSON.stringify(sanitizedData)}`);
    }
  }
  
  /**
   * Log informational message
   */
  info(message: string, data?: Record<string, unknown>): void {
    const sanitizedMessage = this.sanitizeMessage(message);
    const sanitizedData = data ? this.sanitizeData(data) : undefined;
    
    core.info(`${this.prefix} [INFO] ${sanitizedMessage}`);
    if (sanitizedData) {
      core.info(`${this.prefix} [INFO] Data: ${JSON.stringify(sanitizedData)}`);
    }
  }
  
  /**
   * Log warning message
   */
  warn(message: string, data?: Record<string, unknown>): void {
    const sanitizedMessage = this.sanitizeMessage(message);
    const sanitizedData = data ? this.sanitizeData(data) : undefined;
    
    core.warning(`${this.prefix} [WARN] ${sanitizedMessage}`);
    if (sanitizedData) {
      core.warning(`${this.prefix} [WARN] Data: ${JSON.stringify(sanitizedData)}`);
    }
  }
  
  /**
   * Log error message
   */
  error(message: string, error?: Error | Record<string, unknown>): void {
    const sanitizedMessage = this.sanitizeMessage(message);
    
    if (error instanceof Error) {
      core.error(`${this.prefix} [ERROR] ${sanitizedMessage}: ${error.message}`);
      if (error.stack) {
        core.debug(`${this.prefix} [ERROR] Stack: ${error.stack}`);
      }
    } else if (error) {
      const sanitizedError = this.sanitizeData(error);
      core.error(`${this.prefix} [ERROR] ${sanitizedMessage}: ${JSON.stringify(sanitizedError)}`);
    } else {
      core.error(`${this.prefix} [ERROR] ${sanitizedMessage}`);
    }
  }
  
  /**
   * Start a group of log messages
   */
  startGroup(name: string): void {
    const sanitizedName = this.sanitizeMessage(name);
    core.startGroup(`${this.prefix} ${sanitizedName}`);
  }
  
  /**
   * End the current group
   */
  endGroup(): void {
    core.endGroup();
  }
  
  /**
   * Sanitize message content
   * Remove potentially dangerous characters and patterns
   */
  private sanitizeMessage(message: string): string {
    return message
      .replace(/[<>"'&]/g, '') // Remove HTML/XML dangerous chars
      .replace(/\r?\n/g, ' ') // Replace newlines with spaces
      .trim()
      .substring(0, 1000); // Limit length
  }
  
  /**
   * Sanitize data object
   * Remove sensitive information and dangerous content
   */
  private sanitizeData(data: Record<string, unknown>): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};
    
    for (const [key, value] of Object.entries(data)) {
      // Skip sensitive keys
      if (this.isSensitiveKey(key)) {
        sanitized[key] = '[REDACTED]';
        continue;
      }
      
      // Sanitize string values
      if (typeof value === 'string') {
        sanitized[key] = this.sanitizeString(value);
      } else if (typeof value === 'object' && value !== null) {
        // Recursively sanitize objects
        sanitized[key] = this.sanitizeData(value as Record<string, unknown>);
      } else {
        // Keep other types as-is
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }
  
  /**
   * Check if a key is sensitive and should be redacted
   */
  private isSensitiveKey(key: string): boolean {
    const sensitivePatterns = [
      'password', 'secret', 'key', 'token', 'credential',
      'api_key', 'apikey', 'private', 'auth', 'bearer',
      'jwt', 'oauth', 'ssh', 'pem', 'cert'
    ];
    
    const lowerKey = key.toLowerCase();
    return sensitivePatterns.some(pattern => lowerKey.includes(pattern));
  }
  
  /**
   * Sanitize string content
   */
  private sanitizeString(str: string): string {
    // Remove potential command injection patterns
    return str
      .replace(/[;&|`$]/g, '') // Remove shell metacharacters
      .replace(/[<>]/g, '') // Remove HTML tags
      .trim()
      .substring(0, 500); // Limit length
  }
}