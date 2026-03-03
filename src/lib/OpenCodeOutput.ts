export interface ParsedJsonLine {
  raw: string;
  event: Record<string, unknown>;
}

export function parseJsonLines(output: string): ParsedJsonLine[] {
  const parsed: ParsedJsonLine[] = [];
  for (const line of output.split('\n')) {
    const trimmed = line.trim();
    // Fast-path filter: only attempt JSON.parse on object-like lines.
    if (!(trimmed.startsWith('{') && trimmed.endsWith('}'))) {
      continue;
    }
    try {
      parsed.push({
        raw: trimmed,
        event: JSON.parse(trimmed) as Record<string, unknown>,
      });
    } catch {
      continue;
    }
  }
  return parsed;
}

export function extractTextPayloads(entries: ParsedJsonLine[]): string[] {
  const payloads: string[] = [];
  for (const entry of entries) {
    if (entry.event['type'] !== 'text') {
      continue;
    }
    const part = entry.event['part'] as Record<string, unknown> | undefined;
    const text = part && typeof part['text'] === 'string' ? part['text'] : '';
    if (text) {
      payloads.push(text);
    }
  }
  return payloads;
}

export function parseJsonWithObjectFallback(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return JSON.parse(raw.slice(start, end + 1));
    }
    throw new Error('No parseable JSON object in AI output.');
  }
}

export function isAIReviewPayload(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const parsed = value as Record<string, unknown>;
  return (
    typeof parsed['summary'] === 'string' ||
    Array.isArray(parsed['issues']) ||
    typeof parsed['overallScore'] === 'number'
  );
}
