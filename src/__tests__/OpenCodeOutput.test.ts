import { extractTextPayloads, parseJsonLines, parseJsonWithObjectFallback } from '../lib/OpenCodeOutput';

describe('OpenCodeOutput', () => {
  it('parses valid JSON lines and ignores non-JSON lines', () => {
    const output = [
      'not-json',
      '{"type":"step_start","id":"1"}',
      '{"type":"text","part":{"text":"hello"}}',
      '{"bad":',
    ].join('\n');

    const entries = parseJsonLines(output);
    expect(entries).toHaveLength(2);
    expect(entries[0]?.event['type']).toBe('step_start');
    expect(entries[1]?.event['type']).toBe('text');
  });

  it('extracts text payloads from parsed events', () => {
    const entries = parseJsonLines(
      [
        '{"type":"text","part":{"text":"first"}}',
        '{"type":"step_finish"}',
        '{"type":"text","part":{"text":"second"}}',
      ].join('\n')
    );

    expect(extractTextPayloads(entries)).toEqual(['first', 'second']);
  });

  it('falls back to parsing embedded JSON object when raw input has extra text', () => {
    const parsed = parseJsonWithObjectFallback('prefix {"decision":"pass","summary":"ok"} suffix') as {
      decision: string;
      summary: string;
    };

    expect(parsed.decision).toBe('pass');
    expect(parsed.summary).toBe('ok');
  });
});
