export interface ReviewResult {
    status: 'approved' | 'changes_requested';
    score: number;
    securityIssues: number;
    performanceIssues: number;
    filesAnalyzed: number;
    approved: boolean;
    summary: string;
}
export interface PRAnalysisResult {
    valid: boolean;
    filesChanged: string[];
    additions: number;
    deletions: number;
    totalChanges: number;
    complexity: 'low' | 'medium' | 'high';
    hasSecuritySensitiveFiles: boolean;
    shouldReview: boolean;
    reason?: string;
}
export interface AIReviewResult {
    summary: string;
    issues: Array<{
        file: string;
        line: number;
        severity: 'error' | 'warning' | 'info';
        category: 'bug' | 'security' | 'performance' | 'style' | 'best-practice';
        message: string;
        suggestion: string;
    }>;
    overallScore: number;
    approved: boolean;
    reviewComments: string[];
    commitSha: string;
}
export interface RepoHygienePolicy {
    version: number;
    criticalForbiddenFiles: string[];
    aiReview: {
        model: string;
        failOnDecision: 'pass' | 'fail';
        severityThreshold: 'low' | 'medium' | 'high' | 'critical';
        confidenceThreshold: number;
    };
}
export interface RepoHygieneFinding {
    severity: 'low' | 'medium' | 'high' | 'critical';
    confidence: number;
    file: string;
    reason: string;
    suggestion: string;
}
export interface RepoHygieneResult {
    decision: 'pass' | 'fail';
    summary: string;
    findings: RepoHygieneFinding[];
}
//# sourceMappingURL=types.d.ts.map