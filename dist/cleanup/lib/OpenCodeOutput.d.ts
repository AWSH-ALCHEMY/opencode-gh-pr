export interface ParsedJsonLine {
    raw: string;
    event: Record<string, unknown>;
}
export declare function parseJsonLines(output: string): ParsedJsonLine[];
export declare function extractTextPayloads(entries: ParsedJsonLine[]): string[];
export declare function parseJsonWithObjectFallback(raw: string): unknown;
export declare function isAIReviewPayload(value: unknown): value is Record<string, unknown>;
//# sourceMappingURL=OpenCodeOutput.d.ts.map