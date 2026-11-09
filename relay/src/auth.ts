/** 校验一次 WS 握手是否带对 token。expected 为空=不鉴权(本地USB模式)放行。 */
export function checkToken(reqUrl: string | undefined, expected?: string): boolean {
  if (!expected) return true;
  if (!reqUrl) return false;
  try {
    const u = new URL(reqUrl, 'http://localhost');
    return u.searchParams.get('token') === expected;
  } catch {
    return false;
  }
}
