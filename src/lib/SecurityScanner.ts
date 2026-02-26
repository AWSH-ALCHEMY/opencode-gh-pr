import { ActionConfig } from './ActionConfig';
import { Logger } from './Logger';
import { PRAnalysisResult } from './types';

export interface SecurityScanResult {
  issues: Array<{
    file: string;
    severity: 'high' | 'medium' | 'low' | 'critical';
    type: string;
    message: string;
  }>;
}

export class SecurityScanner {
  private readonly config: ActionConfig;
  private readonly logger: Logger;
  
  constructor(options: {
    config: ActionConfig;
    logger: Logger;
  }) {
    this.config = options.config;
    this.logger = options.logger;
  }
  
  scan(prAnalysis: PRAnalysisResult): SecurityScanResult {
    this.logger.startGroup('🔐 Security Scan');
    
    const result: SecurityScanResult = { issues: [] };
    
    try {
      if (prAnalysis.hasSecuritySensitiveFiles) {
        this.logger.info('Scanning for security-sensitive files...');
        
        const securityPatterns = this.config.get('securityPatterns');
        
        for (const file of prAnalysis.filesChanged) {
          for (const pattern of securityPatterns) {
            if (new RegExp(pattern.pattern, 'i').test(file)) {
              result.issues.push({
                file,
                severity: pattern.severity,
                type: pattern.type,
                message: `File matches security pattern for ${pattern.type}`,
              });
            }
          }
        }
      }
      
      this.logger.info(`Security scan completed: ${result.issues.length} issues found`);
      return result;
      
    } catch (error) {
      this.logger.error('Security scan failed', error as Error);
      return result;
      
    } finally {
      this.logger.endGroup();
    }
  }
}
