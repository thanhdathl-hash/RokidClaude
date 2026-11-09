import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import type { Readable } from 'node:stream';
import { translateEvent, type AgentEvent } from './events';

/** 把子进程 stdout 按行解析为 AgentEvent 流。可独立测试。 */
export async function* parseEventStream(stdout: Readable): AsyncGenerator<AgentEvent> {
  const rl = createInterface({ input: stdout, crlfDelay: Infinity });
  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      continue;
    }
    for (const e of translateEvent(parsed)) yield e;
  }
}

export interface RunOptions {
  prompt: string;
  cwd: string;
  sessionId?: string;
  binary?: string;
  settingsPath?: string;
  model?: string;
}

export interface RunHandle {
  events: AsyncIterable<AgentEvent>;
  stop: () => void;
}

export function buildArgs(opts: RunOptions): string[] {
  const args = [
    '-p', opts.prompt,
    '--output-format', 'stream-json',
    '--verbose',
    '--permission-mode', 'default',
  ];
  if (opts.model) args.push('--model', opts.model);
  if (opts.settingsPath) args.push('--settings', opts.settingsPath);
  if (opts.sessionId) args.push('--resume', opts.sessionId);
  const extra = process.env.ROKID_SYSTEM_PROMPT;
  if (extra) args.push('--append-system-prompt', extra);
  return args;
}

/** 拉起 Claude Code(headless stream-json),返回事件流 + 打断句柄。 */
export function runClaude(opts: RunOptions): RunHandle {
  const args = buildArgs(opts);
  // Windows: npm-installed Claude Code is a .cmd shim that spawn() cannot run without a
  // shell (and a shell would let spoken text inject commands). The start script instead
  // passes `node` as CLAUDE_BINARY and the cli.js path in CLAUDE_PREFIX_ARGS (JSON array).
  let prefix: string[] = [];
  try { prefix = JSON.parse(process.env.CLAUDE_PREFIX_ARGS || '[]'); } catch { prefix = []; }

  const child = spawn(opts.binary ?? 'claude', [...prefix, ...args], {
    cwd: opts.cwd,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
  child.stderr.on('data', (d: Buffer) => process.stderr.write(`[claude stderr] ${d}`));

  return {
    events: parseEventStream(child.stdout),
    stop() {
      if (child.exitCode === null && child.signalCode === null) {
        child.kill('SIGTERM');
        setTimeout(() => {
          if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
        }, 5000);
      }
    },
  };
}
