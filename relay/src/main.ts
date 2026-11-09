import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { randomBytes } from 'node:crypto';
import { createRelayServer } from './server';
import { runClaude } from './claude-runner';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const PORT = Number(process.env.ROKID_PORT ?? 8787);
const token = process.env.ROKID_TOKEN;
const claudeBinary = process.env.CLAUDE_BINARY;
const permissionToken = randomBytes(32).toString('hex');
const shellQuote = (value: string) => `'${value.replace(/'/g, `'\\''`)}'`;
const bridgeUrl = `http://127.0.0.1:${PORT}/permission`;

// 写一份含 PreToolUse hook 的 settings:写文件/Bash 类工具放行决定外包给中继(中继再问眼镜)。
const hookScript = join(__dirname, 'permission-hook.mjs');
const settingsPath = join(tmpdir(), 'rokid-perm-settings.json');
// Windows: no POSIX `VAR=x cmd` prefix and no single quotes; pass token + bridge as args
// and use forward slashes (accepted by node on Windows, safe in Git Bash and cmd).
const hookCommand = process.platform === 'win32'
  ? `node "${hookScript.replace(/\\/g, '/')}" ${permissionToken} ${bridgeUrl}`
  : `ROKID_PERM_TOKEN=${permissionToken} ROKID_PERM_BRIDGE=${bridgeUrl} node ${shellQuote(hookScript)}`;
writeFileSync(settingsPath, JSON.stringify({
  // 只读类联网工具静默放行(改不了 Mac,headless 下也不该卡确认)。
  permissions: { allow: ['WebSearch', 'WebFetch'] },
  hooks: {
    PreToolUse: [{
      matcher: 'Bash|Write|Edit|MultiEdit|NotebookEdit',
      hooks: [{ type: 'command', command: hookCommand }],
    }],
  },
}));

const sandboxDir = process.env.ROKID_WORKDIR || join(root, 'sandbox');
const stateDir = join(root, 'state');
mkdirSync(sandboxDir, { recursive: true });
mkdirSync(stateDir, { recursive: true });

const { http } = createRelayServer({
  sandboxDir,
  webDir: join(root, 'web'),
  stateDir,
  modelPath: process.env.WHISPER_MODEL || join(root, 'models', 'ggml-small.bin'),
  token,
  permissionToken,
  dictionaryDir: root,
  runner: (o) => runClaude({ ...o, binary: claudeBinary, settingsPath }),
});

http.listen(PORT, () => {
  console.log(`Rokid relay 已启动 / relay started: http://localhost:${PORT}`);
  console.log(`鉴权: ${token ? '已开启 (ROKID_TOKEN)' : '未开启 (本地直连)'}`);
  console.log(`sandbox: ${sandboxDir} | state: ${stateDir}`);
});
