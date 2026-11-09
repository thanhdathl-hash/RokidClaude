import { spawn } from 'node:child_process';
import { tr, type Lang } from './i18n';

/** 清洗 whisper-cli 输出:去方括号行(如 [BLANK_AUDIO])、trim、压缩空白。纯函数。 */
export function cleanWhisperOutput(raw: string): string {
  return raw
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !/^\[.*\]$/.test(l))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** 按语言拼 whisper-cli 参数。en 用 -l en 且不加引导词;zh 用 -l zh + 简体引导词
 * (whisper-small 默认忽繁忽简,简体 initial prompt 稳定偏向简体,避免指令词表繁体漏匹配)。 */
export function whisperArgs(wavPath: string, modelPath: string, lang: Lang): string[] {
  const t = tr(lang);
  const args = ['-m', modelPath, '-f', wavPath, '-l', t.whisperLang, '-nt'];
  // Windows: whisper-cli reads argv in the ANSI code page, so a non-ASCII prompt (Vietnamese,
  // Chinese) would arrive garbled and hurt recognition -> skip the prompt there.
  const nonAscii = t.whisperPrompt ? /[^\x00-\x7F]/.test(t.whisperPrompt) : false;
  if (t.whisperPrompt && !(process.platform === 'win32' && nonAscii)) args.push('--prompt', t.whisperPrompt);
  return args;
}

/** 调 whisper-cli 转写 WAV → 文本;失败/空 → ''。 */
export function transcribe(wavPath: string, modelPath: string, lang: Lang = 'zh', binary = process.env.WHISPER_BINARY || 'whisper-cli'): Promise<string> {
  return new Promise((resolve) => {
    const child = spawn(binary, whisperArgs(wavPath, modelPath, lang), {
      stdio: ['ignore', 'pipe', 'ignore'],
      windowsHide: true,
    });
    let out = '';
    child.stdout.setEncoding('utf8'); // keep multi-byte Vietnamese chars intact across chunks
    child.stdout.on('data', (d: string) => { out += d; });
    child.on('error', () => resolve(''));
    child.on('close', () => resolve(cleanWhisperOutput(out)));
  });
}
