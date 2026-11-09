import { describe, it, expect } from 'vitest';
import { translateEvent } from '../src/events';

describe('translateEvent', () => {
  it('system.init → system event with sessionId/cwd/model', () => {
    const raw = { type: 'system', subtype: 'init', session_id: 's1', cwd: '/x', model: 'claude-y' };
    expect(translateEvent(raw)).toEqual([{ type: 'system', sessionId: 's1', cwd: '/x', model: 'claude-y' }]);
  });

  it('assistant text block → text event', () => {
    const raw = { type: 'assistant', message: { content: [{ type: 'text', text: 'hello' }] } };
    expect(translateEvent(raw)).toEqual([{ type: 'text', delta: 'hello' }]);
  });

  it('assistant thinking block → thinking event', () => {
    const raw = { type: 'assistant', message: { content: [{ type: 'thinking', thinking: 'hmm' }] } };
    expect(translateEvent(raw)).toEqual([{ type: 'thinking', delta: 'hmm' }]);
  });

  it('assistant tool_use block → tool_use event', () => {
    const raw = { type: 'assistant', message: { content: [{ type: 'tool_use', id: 't1', name: 'Write', input: { file_path: 'a.txt' } }] } };
    expect(translateEvent(raw)).toEqual([{ type: 'tool_use', id: 't1', name: 'Write', input: { file_path: 'a.txt' } }]);
  });

  it('user tool_result (string content) → tool_result event', () => {
    const raw = { type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: 't1', content: 'ok', is_error: false }] } };
    expect(translateEvent(raw)).toEqual([{ type: 'tool_result', id: 't1', output: 'ok', isError: false }]);
  });

  it('user tool_result (non-string content) → JSON-stringified output, isError true', () => {
    const raw = { type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: 't2', content: [{ a: 1 }], is_error: true }] } };
    expect(translateEvent(raw)).toEqual([{ type: 'tool_result', id: 't2', output: '[{"a":1}]', isError: true }]);
  });

  it('result → done event with sessionId', () => {
    const raw = { type: 'result', subtype: 'success', session_id: 's1' };
    expect(translateEvent(raw)).toEqual([{ type: 'done', sessionId: 's1' }]);
  });

  it('result with is_error → error event(含失败文案)', () => {
    const raw = { type: 'result', subtype: 'success', is_error: true, result: 'Not logged in', session_id: 's1' };
    expect(translateEvent(raw)).toEqual([{ type: 'error', message: 'Not logged in' }]);
  });

  it('multiple content blocks → multiple events in order', () => {
    const raw = { type: 'assistant', message: { content: [
      { type: 'text', text: 'a' },
      { type: 'tool_use', id: 't1', name: 'Read', input: {} },
    ] } };
    expect(translateEvent(raw)).toEqual([
      { type: 'text', delta: 'a' },
      { type: 'tool_use', id: 't1', name: 'Read', input: {} },
    ]);
  });

  it('garbage / unknown → empty array', () => {
    expect(translateEvent(null)).toEqual([]);
    expect(translateEvent('nope')).toEqual([]);
    expect(translateEvent({ type: 'whatever' })).toEqual([]);
  });
});

describe('result 事件提取用量', () => {
  it('成功 result → done 带 costUsd / tokensIn / tokensOut', () => {
    const out = translateEvent({
      type: 'result',
      subtype: 'success',
      session_id: 's1',
      total_cost_usd: 0.0123,
      usage: { input_tokens: 1500, output_tokens: 800 },
    });
    expect(out).toEqual([
      { type: 'done', sessionId: 's1', costUsd: 0.0123, tokensIn: 1500, tokensOut: 800 },
    ]);
  });

  it('缺用量字段 → done 不带这些键(向后兼容)', () => {
    const out = translateEvent({ type: 'result', session_id: 's1' });
    expect(out).toEqual([{ type: 'done', sessionId: 's1' }]);
  });

  it('错误 result 仍为 error 事件', () => {
    const out = translateEvent({ type: 'result', is_error: true, result: 'boom' });
    expect(out).toEqual([{ type: 'error', message: 'boom' }]);
  });
});
