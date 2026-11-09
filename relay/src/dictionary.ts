import { readFileSync } from 'node:fs';

/** trim + 去首尾中英标点/空格,与客户端 newSession 判定同风格。 */
function normalize(s: string): string {
  return s.trim().replace(/^[。,，!！.\s]+|[。,，!！.\s]+$/g, '').trim();
}

/** 文本精确命中词典口令→返回展开值,否则原文。 */
export function expandPrompt(text: string, dict: Record<string, string>): string {
  const key = normalize(text);
  return dict[key] ?? dict[key.toLowerCase()] ?? text;
}

/** 读词典文件(每次读=改了即时生效);缺失/损坏→空词典。 */
export function loadDictionary(path: string): Record<string, string> {
  try {
    const obj = JSON.parse(readFileSync(path, 'utf8'));
    return obj && typeof obj === 'object' ? obj : {};
  } catch {
    return {};
  }
}
