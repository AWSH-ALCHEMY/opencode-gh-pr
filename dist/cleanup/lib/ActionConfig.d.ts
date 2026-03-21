import { z } from 'zod';
/**
 * Configuration schema validation using Zod
 * Ensures all configuration values are properly typed and validated
 */
declare const ConfigSchema: z.ZodObject<{
    maxDiffSize: z.ZodNumber;
    maxFiles: z.ZodNumber;
    maxLines: z.ZodNumber;
    maxAiDiffSize: z.ZodNumber;
    aiModel: z.ZodString;
    temperature: z.ZodNumber;
    maxTokens: z.ZodNumber;
    timeout: z.ZodNumber;
    approvedThreshold: z.ZodNumber;
    securityAnalysis: z.ZodBoolean;
    performanceCheck: z.ZodBoolean;
    documentationCheck: z.ZodBoolean;
    securityPatterns: z.ZodArray<z.ZodObject<{
        pattern: z.ZodString;
        type: z.ZodEnum<["credential", "security", "config", "ssh_key"]>;
        severity: z.ZodEnum<["low", "medium", "high", "critical"]>;
    }, "strip", z.ZodTypeAny, {
        type: "security" | "credential" | "config" | "ssh_key";
        pattern: string;
        severity: "low" | "medium" | "high" | "critical";
    }, {
        type: "security" | "credential" | "config" | "ssh_key";
        pattern: string;
        severity: "low" | "medium" | "high" | "critical";
    }>, "many">;
    reviewerTeams: z.ZodRecord<z.ZodString, z.ZodObject<{
        paths: z.ZodArray<z.ZodString, "many">;
        team: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        paths: string[];
        team: string;
    }, {
        paths: string[];
        team: string;
    }>>;
    createChecks: z.ZodBoolean;
    postComments: z.ZodBoolean;
    applyLabels: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    maxDiffSize: number;
    maxFiles: number;
    maxLines: number;
    maxAiDiffSize: number;
    aiModel: string;
    temperature: number;
    maxTokens: number;
    timeout: number;
    approvedThreshold: number;
    securityAnalysis: boolean;
    performanceCheck: boolean;
    documentationCheck: boolean;
    securityPatterns: {
        type: "security" | "credential" | "config" | "ssh_key";
        pattern: string;
        severity: "low" | "medium" | "high" | "critical";
    }[];
    reviewerTeams: Record<string, {
        paths: string[];
        team: string;
    }>;
    createChecks: boolean;
    postComments: boolean;
    applyLabels: boolean;
}, {
    maxDiffSize: number;
    maxFiles: number;
    maxLines: number;
    maxAiDiffSize: number;
    aiModel: string;
    temperature: number;
    maxTokens: number;
    timeout: number;
    approvedThreshold: number;
    securityAnalysis: boolean;
    performanceCheck: boolean;
    documentationCheck: boolean;
    securityPatterns: {
        type: "security" | "credential" | "config" | "ssh_key";
        pattern: string;
        severity: "low" | "medium" | "high" | "critical";
    }[];
    reviewerTeams: Record<string, {
        paths: string[];
        team: string;
    }>;
    createChecks: boolean;
    postComments: boolean;
    applyLabels: boolean;
}>;
export type ActionConfigType = z.infer<typeof ConfigSchema>;
/**
 * Action configuration management
 * Loads and validates configuration from inputs and config files
 */
export declare class ActionConfig {
    private config;
    private initialized;
    constructor();
    private ensureInitialized;
    /**
     * Load configuration from inputs and config file
     */
    load(): void;
    /**
     * Override configuration with GitHub Action inputs
     */
    private overrideWithInputs;
    /**
     * Load configuration from YAML file
     */
    private loadFromFile;
    /**
     * Deep merge configuration objects
     */
    private mergeConfig;
    /**
     * Validate configuration using Zod schema
     */
    private validate;
    /**
     * Get configuration value
     */
    get<K extends keyof ActionConfigType>(key: K): ActionConfigType[K];
    getAll(): ActionConfigType;
}
export {};
//# sourceMappingURL=ActionConfig.d.ts.map