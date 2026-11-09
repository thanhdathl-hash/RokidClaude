import { describe, it, expect } from 'vitest';
import { normalizeLang, tr } from '../src/i18n';

describe('normalizeLang', () => {
  it('en→en,其余→zh(向后兼容)', () => {
    expect(normalizeLang('en')).toBe('en');
    expect(normalizeLang('zh')).toBe('zh');
    expect(normalizeLang(undefined)).toBe('zh');
    expect(normalizeLang('fr')).toBe('zh');
  });
});

describe('tr', () => {
  it('zh:中文选项 + 简体引导 + 中文动词', () => {
    const t = tr('zh');
    expect(t.whisperLang).toBe('zh');
    expect(t.whisperPrompt).toContain('简体');
    expect([t.permOnce, t.permKind, t.permDeny]).toEqual(['允许一次', '这类都允许', '拒绝']);
    expect(t.modelCancel).toBe('取消');
    expect(t.verb('Bash')).toBe('运行');
    expect(t.verb('Write')).toBe('写');
  });
  it('en:英文选项 + 无引导 + 英文动词', () => {
    const t = tr('en');
    expect(t.whisperLang).toBe('en');
    expect(t.whisperPrompt).toBeNull();
    expect([t.permOnce, t.permKind, t.permDeny]).toEqual(['Allow once', 'Allow this kind', 'Deny']);
    expect(t.modelCancel).toBe('Cancel');
    expect(t.verb('Bash')).toBe('Run');
    expect(t.verb('Write')).toBe('Write');
  });
});
