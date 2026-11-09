import { describe, it, expect, afterEach } from 'vitest';
import { tr, dictKey, mapViGlassesCommand } from '../src/i18n';
import { parseModelCommand } from '../src/model';
import { whisperArgs } from '../src/transcribe';
import { buildArgs } from '../src/claude-runner';

describe('Vietnamese speech mode (ROKID_SPEECH_LANG=vi)', () => {
  afterEach(() => { delete process.env.ROKID_SPEECH_LANG; delete process.env.ROKID_SYSTEM_PROMPT; });

  it('is off by default: en stays English', () => {
    expect(tr('en').whisperLang).toBe('en');
    expect(dictKey('en')).toBe('en');
    expect(parseModelCommand('đổi model', 'en')).toBeNull();
  });

  it('transcribes Vietnamese and uses Vietnamese labels + dictionary', () => {
    process.env.ROKID_SPEECH_LANG = 'vi';
    expect(tr('en').whisperLang).toBe('vi');
    expect(tr('en').permDeny).toBe('Từ chối');
    expect(dictKey('en')).toBe('vi');
    expect(whisperArgs('a.wav', 'm.bin', 'en')).toEqual(expect.arrayContaining(['-l', 'vi']));
    expect(tr('zh').whisperLang).toBe('zh'); // zh untouched
  });

  it('recognises Vietnamese model-switch phrases only with a switch verb', () => {
    process.env.ROKID_SPEECH_LANG = 'vi';
    expect(parseModelCommand('Đổi model', 'en')).toEqual({ kind: 'pick' });
    expect(parseModelCommand('chuyển mô hình.', 'en')).toEqual({ kind: 'pick' });
    expect(parseModelCommand('bạn là model gì', 'en')).toBeNull();
  });

  it('maps spoken Vietnamese glasses commands to the app English phrases', () => {
    expect(mapViGlassesCommand('Phiên mới.')).toBe('new session');
    expect(mapViGlassesCommand('thoát')).toBe('exit');
    expect(mapViGlassesCommand('tóm tắt báo cáo kho')).toBe('tóm tắt báo cáo kho');
  });

  it('appends the system prompt when ROKID_SYSTEM_PROMPT is set', () => {
    process.env.ROKID_SYSTEM_PROMPT = 'Trả lời tiếng Việt';
    const a = buildArgs({ prompt: 'x', cwd: '.' });
    expect(a.slice(-2)).toEqual(['--append-system-prompt', 'Trả lời tiếng Việt']);
  });
});

import { summarize, memoryKey } from '../src/permission';
describe('connector (MCP) permission summary', () => {
  it('shows app + action and remembers per tool', () => {
    const r = summarize('mcp__claude_ai_Gmail__search_threads', { query: 'x' }, 'en');
    expect(r.summary).toBe('Gmail: search_threads');
    expect(memoryKey('mcp__claude_ai_Gmail__search_threads', r.command)).toBe('mcp__claude_ai_Gmail__search_threads');
  });
});
