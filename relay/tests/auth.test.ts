import { describe, it, expect } from 'vitest';
import { checkToken } from '../src/auth';

describe('checkToken', () => {
  it('未设 expected(本地USB模式)时放行任何请求', () => {
    expect(checkToken('/', undefined)).toBe(true);
    expect(checkToken('/?token=whatever', '')).toBe(true);
  });
  it('设了 expected 时,token 匹配才放行', () => {
    expect(checkToken('/?token=secret', 'secret')).toBe(true);
  });
  it('设了 expected 时,token 错误或缺失则拒绝', () => {
    expect(checkToken('/?token=wrong', 'secret')).toBe(false);
    expect(checkToken('/', 'secret')).toBe(false);
    expect(checkToken(undefined, 'secret')).toBe(false);
  });
  it('reqUrl 非法时安全拒绝', () => {
    expect(checkToken('::::', 'secret')).toBe(false);
  });
});
