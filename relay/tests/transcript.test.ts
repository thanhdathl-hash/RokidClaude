import { describe, it, expect } from 'vitest';
import { cleanTranscript } from '../web/transcript.js';

describe('cleanTranscript', () => {
  it('压缩内部空白为单空格并 trim', () => {
    expect(cleanTranscript('  在 sandbox   里  建个   文件 ')).toBe('在 sandbox 里 建个 文件');
  });
  it('换行/制表符也压缩成空格', () => {
    expect(cleanTranscript('a\n\tb')).toBe('a b');
  });
  it('空串 / 全空白 → 空串', () => {
    expect(cleanTranscript('')).toBe('');
    expect(cleanTranscript('   ')).toBe('');
  });
  it('非字符串 → 空串', () => {
    expect(cleanTranscript(null)).toBe('');
    expect(cleanTranscript(undefined)).toBe('');
  });
});
