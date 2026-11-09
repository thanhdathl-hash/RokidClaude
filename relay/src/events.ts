export type AgentEvent =
  | { type: 'system'; sessionId?: string; cwd?: string; model?: string }
  | { type: 'text'; delta: string }
  | { type: 'thinking'; delta: string }
  | { type: 'tool_use'; id: string; name: string; input: unknown }
  | { type: 'tool_result'; id: string; output: string; isError: boolean }
  | { type: 'done'; sessionId?: string; costUsd?: number; tokensIn?: number; tokensOut?: number }
  | { type: 'error'; message: string };

interface ContentBlock {
  type: string;
  text?: string;
  thinking?: string;
  id?: string;
  name?: string;
  input?: unknown;
  tool_use_id?: string;
  content?: unknown;
  is_error?: boolean;
}

interface RawEvent {
  type?: string;
  subtype?: string;
  session_id?: string;
  cwd?: string;
  model?: string;
  message?: { content?: ContentBlock[] };
  is_error?: boolean;
  result?: string;
  total_cost_usd?: number;
  usage?: { input_tokens?: number; output_tokens?: number };
}

/** 把 Claude Code stream-json 的一行(已 JSON.parse)翻成 0..n 个 AgentEvent。纯函数。 */
export function translateEvent(raw: unknown): AgentEvent[] {
  if (!raw || typeof raw !== 'object') return [];
  const evt = raw as RawEvent;
  const out: AgentEvent[] = [];

  if (evt.type === 'system' && evt.subtype === 'init') {
    out.push({ type: 'system', sessionId: evt.session_id, cwd: evt.cwd, model: evt.model });
    return out;
  }

  if (evt.type === 'assistant' && evt.message?.content) {
    for (const b of evt.message.content) {
      if (b.type === 'text' && typeof b.text === 'string' && b.text) {
        out.push({ type: 'text', delta: b.text });
      } else if (b.type === 'thinking' && typeof b.thinking === 'string' && b.thinking) {
        out.push({ type: 'thinking', delta: b.thinking });
      } else if (b.type === 'tool_use' && b.id && b.name) {
        out.push({ type: 'tool_use', id: b.id, name: b.name, input: b.input });
      }
    }
    return out;
  }

  if (evt.type === 'user' && evt.message?.content) {
    for (const b of evt.message.content) {
      if (b.type === 'tool_result' && b.tool_use_id) {
        const output = typeof b.content === 'string' ? b.content : JSON.stringify(b.content);
        out.push({ type: 'tool_result', id: b.tool_use_id, output, isError: b.is_error === true });
      }
    }
    return out;
  }

  if (evt.type === 'result') {
    if (evt.is_error) {
      out.push({ type: 'error', message: typeof evt.result === 'string' ? evt.result : 'run failed' });
    } else {
      const done: AgentEvent = { type: 'done', sessionId: evt.session_id };
      if (typeof evt.total_cost_usd === 'number') done.costUsd = evt.total_cost_usd;
      if (typeof evt.usage?.input_tokens === 'number') done.tokensIn = evt.usage.input_tokens;
      if (typeof evt.usage?.output_tokens === 'number') done.tokensOut = evt.usage.output_tokens;
      out.push(done);
    }
    return out;
  }

  return out;
}
