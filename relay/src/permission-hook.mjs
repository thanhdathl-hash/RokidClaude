#!/usr/bin/env node
// PreToolUse hook:把工具放行决定外包给中继(中继再问眼镜)。任何异常=拒绝(安全默认)。
let raw = '';
for await (const chunk of process.stdin) raw += chunk;
let allow = false;
try {
  const { tool_name, tool_input } = JSON.parse(raw || '{}');
  // argv form is used on Windows (see main.ts); env form on macOS/Linux.
  const bridge = process.argv[3] || process.env.ROKID_PERM_BRIDGE || 'http://127.0.0.1:8787/permission';
  const token = process.argv[2] || process.env.ROKID_PERM_TOKEN || '';
  const r = await fetch(bridge, {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-rokid-permission-token': token },
    body: JSON.stringify({ tool: tool_name, input: tool_input ?? {} }),
  });
  allow = (await r.json()).allow === true;
} catch { allow = false; }
process.stdout.write(JSON.stringify({
  hookSpecificOutput: {
    hookEventName: 'PreToolUse',
    permissionDecision: allow ? 'allow' : 'deny',
    permissionDecisionReason: allow ? 'User allowed on glasses' : 'Denied or timed out on glasses',
  },
}));
