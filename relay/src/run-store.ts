import { mkdirSync, readFileSync, writeFileSync, appendFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { EventEmitter } from 'node:events';
import type { AgentEvent } from './events';

export type RunStatus = 'running' | 'done' | 'error' | 'interrupted';
export interface StoredEvent { seq: number; event: AgentEvent; }
export interface RunSummary { id: string; status: RunStatus; prompt: string; sessionId?: string; }
interface Run extends RunSummary { events: StoredEvent[]; }
export interface CurrentState { sessionId?: string; currentRun?: RunSummary; }

/** 持久会话权威:落盘事件日志 + 内存缓冲 + 广播。单会话。 */
export class RunStore extends EventEmitter {
  private runsDir: string;
  private indexPath: string;
  private sessionId?: string;
  private runs = new Map<string, Run>();
  private order: string[] = [];

  constructor(stateDir: string) {
    super();
    this.runsDir = join(stateDir, 'runs');
    this.indexPath = join(stateDir, 'index.json');
    mkdirSync(this.runsDir, { recursive: true });
    this.load();
  }

  private load(): void {
    if (!existsSync(this.indexPath)) return;
    let idx: { sessionId?: string; runs?: RunSummary[] };
    try { idx = JSON.parse(readFileSync(this.indexPath, 'utf8')); } catch { return; }
    // 不恢复旧 sessionId:relay 重启后若 --resume 一个 claude 里已不存在的旧会话,
    // claude 仍会跑但**不加载 --settings 的权限 hook**(=危险操作不弹确认的安全漏洞)。
    // 故每个进程从全新会话开始(首轮无 --resume,hook 必生效),只 resume 本进程内创建的会话。
    for (const meta of idx.runs ?? []) {
      const status: RunStatus = meta.status === 'running' ? 'interrupted' : meta.status;
      this.runs.set(meta.id, { ...meta, status, events: this.loadEvents(meta.id) });
      this.order.push(meta.id);
    }
    this.persistIndex();
  }

  private loadEvents(id: string): StoredEvent[] {
    const p = join(this.runsDir, `${id}.jsonl`);
    if (!existsSync(p)) return [];
    const out: StoredEvent[] = [];
    for (const line of readFileSync(p, 'utf8').split('\n')) {
      const t = line.trim();
      if (!t) continue;
      try { out.push(JSON.parse(t)); } catch { /* skip corrupt line */ }
    }
    return out;
  }

  private persistIndex(): void {
    const runs: RunSummary[] = this.order.map((id) => {
      const r = this.runs.get(id)!;
      return { id: r.id, status: r.status, prompt: r.prompt, sessionId: r.sessionId };
    });
    try {
      writeFileSync(this.indexPath, JSON.stringify({ sessionId: this.sessionId, runs }, null, 2));
    } catch (e) { process.stderr.write(`[run-store] index write failed: ${e}\n`); }
  }

  get currentSessionId(): string | undefined { return this.sessionId; }

  startRun(prompt: string): RunSummary {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const run: Run = { id, status: 'running', prompt, sessionId: this.sessionId, events: [] };
    this.runs.set(id, run);
    this.order.push(id);
    this.persistIndex();
    return { id: run.id, status: run.status, prompt: run.prompt, sessionId: run.sessionId };
  }

  appendEvent(runId: string, event: AgentEvent): number {
    const run = this.runs.get(runId);
    if (!run) throw new Error(`unknown run ${runId}`);
    const seq = run.events.length + 1;
    const stored: StoredEvent = { seq, event };
    run.events.push(stored);
    if ((event.type === 'system' || event.type === 'done') && event.sessionId) {
      run.sessionId = event.sessionId;
      this.sessionId = event.sessionId;
    }
    try { appendFileSync(join(this.runsDir, `${runId}.jsonl`), JSON.stringify(stored) + '\n'); }
    catch (e) { process.stderr.write(`[run-store] event append failed: ${e}\n`); }
    this.emit('event', { runId, seq, event });
    return seq;
  }

  finishRun(runId: string, status: RunStatus): void {
    const run = this.runs.get(runId);
    if (!run) return;
    run.status = status;
    this.persistIndex();
    this.emit('runEnd', { runId, status });
  }

  newSession(): void { this.sessionId = undefined; this.persistIndex(); }

  getCurrent(): CurrentState {
    const id = this.order.at(-1);
    const run = id ? this.runs.get(id) : undefined;
    return {
      sessionId: this.sessionId,
      currentRun: run ? { id: run.id, status: run.status, prompt: run.prompt, sessionId: run.sessionId } : undefined,
    };
  }

  eventsSince(runId: string, sinceSeq: number): StoredEvent[] {
    const run = this.runs.get(runId);
    if (!run) return [];
    return run.events.filter((e) => e.seq > sinceSeq);
  }
}
