import { describe, it, expect } from 'vitest';
import { Readable } from 'node:stream';
import { parseEventStream, buildArgs } from '../src/claude-runner';
import type { AgentEvent } from '../src/events';

async function collect(stream: Readable): Promise<AgentEvent[]> {
  const out: AgentEvent[] = [];
  for await (const e of parseEventStream(stream)) out.push(e);
  return out;
}

describe('parseEventStream', () => {
  it('按行解析 JSONL,翻成事件序列', async () => {
    const lines = [
      JSON.stringify({ type: 'system', subtype: 'init', session_id: 's1' }),
      JSON.stringify({ type: 'assistant', message: { content: [{ type: 'tool_use', id: 't1', name: 'Write', input: {} }] } }),
      JSON.stringify({ type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: 't1', content: 'ok', is_error: false }] } }),
      JSON.stringify({ type: 'result', subtype: 'success', session_id: 's1' }),
    ].join('\n') + '\n';
    const events = await collect(Readable.from([lines]));
    expect(events.map((e) => e.type)).toEqual(['system', 'tool_use', 'tool_result', 'done']);
  });

  it('忽略空行与非 JSON 行', async () => {
    const lines = '\n  \nnot-json\n' + JSON.stringify({ type: 'result', session_id: 's1' }) + '\n';
    const events = await collect(Readable.from([lines]));
    expect(events).toEqual([{ type: 'done', sessionId: 's1' }]);
  });
});

describe('buildArgs', () => {
  it('基本参数', () => {
    const a = buildArgs({ prompt: 'hi', cwd: '/x' });
    expect(a.slice(0, 6)).toEqual(['-p', 'hi', '--output-format', 'stream-json', '--verbose', '--permission-mode']);
  });
  it('有 model → 追加 --model', () => {
    const a = buildArgs({ prompt: 'hi', cwd: '/x', model: 'opus' });
    expect(a).toContain('--model');
    expect(a[a.indexOf('--model') + 1]).toBe('opus');
  });
  it('有 settingsPath/sessionId → 追加', () => {
    const a = buildArgs({ prompt: 'hi', cwd: '/x', settingsPath: '/s.json', sessionId: 'sess1' });
    expect(a[a.indexOf('--settings') + 1]).toBe('/s.json');
    expect(a[a.indexOf('--resume') + 1]).toBe('sess1');
  });
});
