/**
 * Secure logging utility
 * Provides sanitized logging with different levels
 */
export declare class Logger {
    private readonly prefix;
    constructor(prefix?: string);
    /**
     * Log debug information (sanitized)
     */
    debug(message: string, data?: Record<string, unknown>): void;
    /**
     * Log informational message
     */
    info(message: string, data?: Record<string, unknown>): void;
    /**
     * Log warning message
     */
    warn(message: string, data?: Record<string, unknown>): void;
    /**
     * Log error message
     */
    error(message: string, error?: Error | Record<string, unknown>): void;
    /**
     * Start a group of log messages
     */
    startGroup(name: string): void;
    /**
     * End the current group
     */
    endGroup(): void;
    /**
     * Sanitize message content
     * Remove potentially dangerous characters and patterns
     */
    private sanitizeMessage;
    /**
     * Sanitize data object
     * Remove sensitive information and dangerous content
     */
    private sanitizeData;
    /**
     * Check if a key is sensitive and should be redacted
     */
    private isSensitiveKey;
    /**
     * Sanitize string content
     */
    private sanitizeString;
}
//# sourceMappingURL=Logger.d.ts.map