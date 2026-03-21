import { Logger } from './Logger';
type PromptTask = 'ai_review' | 'code_apply' | 'hygiene_review';
export interface ResolvedPromptPack {
    id: PromptTask;
    version: string;
    riskTier: string;
    systemPath: string;
    templatePath?: string;
    schemaPath?: string;
}
export declare class PromptContracts {
    private readonly logger;
    private readonly registryPath;
    private readonly registry;
    constructor(options: {
        logger: Logger;
        registryPath?: string;
    });
    resolve(task: PromptTask): ResolvedPromptPack;
    render(task: PromptTask, context: Record<string, string>): {
        text: string;
        pack: ResolvedPromptPack;
    };
    private interpolate;
    private loadRegistry;
    private resolvePath;
    private assertFileExists;
}
export {};
//# sourceMappingURL=PromptContracts.d.ts.map