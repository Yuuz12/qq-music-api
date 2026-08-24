/**
 * API 开发启动器（跨平台）：ts-node-dev 热重载 + 自动打开 Explorer。
 * npm run dev 在 Windows cmd/PowerShell 下不解析 "VAR=value 命令" 前缀，
 * 这里用 Node 进程显式设置环境变量再拉起 ts-node-dev。
 */
process.env.AUTO_OPEN_EXPLORER = 'true';
const { spawn } = require('node:child_process');
const path = require('node:path');

const bin = path.join(__dirname, '..', 'node_modules', 'ts-node-dev', 'lib', 'bin.js');
const child = spawn(process.execPath, [bin, '--respawn', '--transpile-only', 'src/app.ts'], {
  cwd: path.join(__dirname, '..'),
  stdio: 'inherit',
});

child.on('exit', (code) => process.exit(code ?? 0));
process.on('SIGINT', () => child.kill());
process.on('SIGTERM', () => child.kill());