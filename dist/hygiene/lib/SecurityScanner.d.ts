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
export declare class SecurityScanner {
    private readonly config;
    private readonly logger;
    constructor(options: {
        config: ActionConfig;
        logger: Logger;
    });
    scan(prAnalysis: PRAnalysisResult): SecurityScanResult;
}
//# sourceMappingURL=SecurityScanner.d.ts.map