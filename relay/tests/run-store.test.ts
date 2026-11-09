import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { RunStore } from '../src/run-store';
import type { AgentEvent } from '../src/events';

let dir: string;
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'rs-')); });
afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

const ev = (e: AgentEvent) => e;

describe('RunStore', () => {
  it('startRun + appendEvent 生成递增 seq', () => {
    const s = new RunStore(dir);
    const run = s.startRun('hi');
    expect(s.appendEvent(run.id, ev({ type: 'text', delta: 'a' }))).toBe(1);
    expect(s.appendEvent(run.id, ev({ type: 'text', delta: 'b' }))).toBe(2);
  });

  it('eventsSince 返回 seq 之后的事件', () => {
    const s = new RunStore(dir);
    const run = s.startRun('hi');
    s.appendEvent(run.id, ev({ type: 'text', delta: 'a' }));
    s.appendEvent(run.id, ev({ type: 'text', delta: 'b' }));
    s.appendEvent(run.id, ev({ type: 'text', delta: 'c' }));
    expect(s.eventsSince(run.id, 1).map((e) => e.seq)).toEqual([2, 3]);
    expect(s.eventsSince(run.id, 0).length).toBe(3);
  });

  it('从 system/done 事件抓取 sessionId 并作为当前会话', () => {
    const s = new RunStore(dir);
    const run = s.startRun('hi');
    s.appendEvent(run.id, ev({ type: 'system', sessionId: 'sess-1' }));
    expect(s.currentSessionId).toBe('sess-1');
  });

  it('emit event 与 runEnd', () => {
    const s = new RunStore(dir);
    const got: string[] = [];
    s.on('event', (m) => got.push(`event:${m.seq}`));
    s.on('runEnd', (m) => got.push(`end:${m.status}`));
    const run = s.startRun('hi');
    s.appendEvent(run.id, ev({ type: 'text', delta: 'a' }));
    s.finishRun(run.id, 'done');
    expect(got).toEqual(['event:1', 'end:done']);
  });

  it('落盘后新实例 load 能读回事件;running 改 interrupted', () => {
    const s1 = new RunStore(dir);
    const run = s1.startRun('hi');
    s1.appendEvent(run.id, ev({ type: 'text', delta: 'a' }));
    // 不 finishRun → 残留 running
    const s2 = new RunStore(dir);
    const cur = s2.getCurrent();
    expect(cur.currentRun?.id).toBe(run.id);
    expect(cur.currentRun?.status).toBe('interrupted');
    expect(s2.eventsSince(run.id, 0).map((e) => (e.event as any).delta)).toEqual(['a']);
  });

  it('newSession 清空当前 sessionId', () => {
    const s = new RunStore(dir);
    const run = s.startRun('hi');
    s.appendEvent(run.id, ev({ type: 'system', sessionId: 'sess-1' }));
    s.newSession();
    expect(s.currentSessionId).toBeUndefined();
  });
});
