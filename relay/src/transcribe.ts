import { spawn } from 'node:child_process';
import { readFileSync, openSync, readSync, closeSync } from 'node:fs';
import { availableParallelism, cpus } from 'node:os';
import { basename } from 'node:path';
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
  // Vocabulary hint (project / supplier names) so whisper spells them right. WHISPER_HINT
  // should be ASCII so it also survives Windows argv; it replaces a non-ASCII prompt there.
  const hint = (process.env.WHISPER_HINT ?? '').trim();
  if (t.whisperPrompt && !(process.platform === 'win32' && nonAscii)) {
    args.push('--prompt', hint ? `${t.whisperPrompt} ${hint}` : t.whisperPrompt);
  } else if (hint && !/[^\x00-\x7F]/.test(hint)) {
    args.push('--prompt', hint);
  }
  return args;
}

/** Duration in seconds of a PCM WAV file, read from its header; null if unknown. */
export function wavDurationSec(wavPath: string): number | null {
  try {
    const fd = openSync(wavPath, 'r');
    const buf = Buffer.alloc(4096);
    const n = readSync(fd, buf, 0, buf.length, 0);
    closeSync(fd);
    if (n < 44 || buf.toString('ascii', 0, 4) !== 'RIFF') return null;
    let off = 12, byteRate = 0;
    while (off + 8 <= n) {
      const id = buf.toString('ascii', off, off + 4);
      const size = buf.readUInt32LE(off + 4);
      if (id === 'fmt ') byteRate = buf.readUInt32LE(off + 16);
      if (id === 'data') return byteRate > 0 ? size / byteRate : null;
      off += 8 + size + (size % 2);
    }
    return null;
  } catch { return null; }
}

/** Speed-up flags for whisper-cli (Windows/VI port):
 * - use all CPU cores (whisper-cli defaults to 4 threads);
 * - shrink the encoder window to the clip length (whisper always encodes 30 s otherwise —
 *   the main cost on CPU for a 3-5 s command). Disable with WHISPER_FAST=0. */
export function whisperSpeedArgs(durationSec: number | null, env = process.env): string[] {
  if (env.WHISPER_FAST === '0') return [];
  const cores = (() => { try { return availableParallelism(); } catch { return cpus().length; } })();
  const threads = Number(env.WHISPER_THREADS) || Math.min(Math.max(cores, 1), 16);
  const args = ['-t', String(threads)];
  if (durationSec && durationSec > 0 && durationSec < 28) {
    // 1500 ctx = 30 s -> 50 per second; keep 2 s headroom and a floor for very short clips.
    const ac = Math.min(1500, Math.max(384, Math.ceil((durationSec + 2) * 50)));
    args.push('-ac', String(ac));
  }
  return args;
}

/** Optional cloud transcription via Groq (OpenAI-compatible Whisper API), used when
 * GROQ_API_KEY is set: ~1 s instead of 10-30 s on a laptop CPU. Audio leaves the PC.
 * Returns null on any failure so the caller falls back to local whisper. */
export async function transcribeGroq(wavPath: string, lang: Lang, env = process.env): Promise<string | null> {
  const key = env.GROQ_API_KEY;
  if (!key) return null;
  try {
    const form = new FormData();
    form.append('file', new Blob([readFileSync(wavPath)], { type: 'audio/wav' }), basename(wavPath));
    form.append('model', env.GROQ_MODEL || 'whisper-large-v3-turbo');
    form.append('language', tr(lang).whisperLang);
    const prompt = [tr(lang).whisperPrompt, env.WHISPER_HINT].filter(Boolean).join(' ').trim();
    if (prompt) form.append('prompt', prompt.slice(0, 800));
    form.append('response_format', 'json');
    const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}` },
      body: form,
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) { console.warn(`Groq STT ${res.status}, dùng whisper trên máy`); return null; }
    const j = (await res.json()) as { text?: string };
    return cleanWhisperOutput(j.text ?? '');
  } catch (e) {
    console.warn(`Groq STT lỗi (${(e as Error).message}), dùng whisper trên máy`);
    return null;
  }
}

/** 调 whisper-cli 转写 WAV → 文本;失败/空 → ''。 */
export async function transcribe(wavPath: string, modelPath: string, lang: Lang = 'zh', binary = process.env.WHISPER_BINARY || 'whisper-cli'): Promise<string> {
  const cloud = await transcribeGroq(wavPath, lang);
  if (cloud !== null) return cloud;
  const args = [...whisperArgs(wavPath, modelPath, lang), ...whisperSpeedArgs(wavDurationSec(wavPath))];
  return new Promise((resolve) => {
    const child = spawn(binary, args, {
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
