import { describe, it, expect } from 'vitest';
import { expandPrompt } from '../src/dictionary';

const dict = { '审查代码': '审查我的改动', '用量': '/cost' };

describe('expandPrompt', () => {
  it('精确命中→展开', () => {
    expect(expandPrompt('审查代码', dict)).toBe('审查我的改动');
    expect(expandPrompt('用量', dict)).toBe('/cost');
  });
  it('normalize:去首尾空格与标点后匹配', () => {
    expect(expandPrompt('  审查代码。', dict)).toBe('审查我的改动');
    expect(expandPrompt('用量!', dict)).toBe('/cost');
  });
  it('未命中→原样', () => {
    expect(expandPrompt('帮我查 IP', dict)).toBe('帮我查 IP');
  });
  it('空词典→原样', () => {
    expect(expandPrompt('审查代码', {})).toBe('审查代码');
  });
});
