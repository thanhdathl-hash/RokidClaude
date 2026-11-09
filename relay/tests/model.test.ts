import { describe, it, expect } from 'vitest';
import { parseModelCommand, modelArg, type ModelAlias } from '../src/model';

describe('parseModelCommand', () => {
  it('「切换模型」类(含模型+切换动词)→ pick', () => {
    expect(parseModelCommand('切换模型')).toEqual({ kind: 'pick' });
    expect(parseModelCommand('换个模型')).toEqual({ kind: 'pick' });
    expect(parseModelCommand('选择模型')).toEqual({ kind: 'pick' });
    expect(parseModelCommand('选模型')).toEqual({ kind: 'pick' });
    expect(parseModelCommand('模型切换')).toEqual({ kind: 'pick' });
    expect(parseModelCommand('换一下模型')).toEqual({ kind: 'pick' });
  });
  it('繁体「切換」也触发(whisper 常输出繁体)', () => {
    expect(parseModelCommand('切換模型')).toEqual({ kind: 'pick' });
    expect(parseModelCommand('換個模型')).toEqual({ kind: 'pick' });
  });
  it('含「模型」但无切换动词(提问)→ null,照常发 claude', () => {
    expect(parseModelCommand('你现在是什么模型?')).toBeNull();
    expect(parseModelCommand('这个模型怎么样')).toBeNull();
  });
  it('普通 prompt(不含模型)→ null,不劫持', () => {
    expect(parseModelCommand('用 opus 帮我写一篇作文')).toBeNull();
    expect(parseModelCommand('切换到 main 分支')).toBeNull();
    expect(parseModelCommand('跑测试')).toBeNull();
  });
});

describe('parseModelCommand en', () => {
  it('英文切模型意图 → pick', () => {
    expect(parseModelCommand('switch model', 'en')).toEqual({ kind: 'pick' });
    expect(parseModelCommand('change the model', 'en')).toEqual({ kind: 'pick' });
    expect(parseModelCommand('select model', 'en')).toEqual({ kind: 'pick' });
  });
  it('含 model 但无切换动词 → null', () => {
    expect(parseModelCommand('what model is this', 'en')).toBeNull();
    expect(parseModelCommand('use opus to write an essay', 'en')).toBeNull();
  });
  it('普通英文 prompt → null', () => {
    expect(parseModelCommand('run the tests', 'en')).toBeNull();
  });
});

describe('modelArg', () => {
  it('opus/sonnet/haiku 都用别名', () => {
    expect(modelArg('opus' as ModelAlias)).toBe('opus');
    expect(modelArg('sonnet' as ModelAlias)).toBe('sonnet');
    expect(modelArg('haiku' as ModelAlias)).toBe('haiku');
  });
});
