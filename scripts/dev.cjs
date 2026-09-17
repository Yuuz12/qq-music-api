/**
 * API 开发启动器（跨平台）：esbuild 预编译 + node 直跑编译产物。
 *
 * 为什么不再用 ts-node-dev：它和 ts-node 一样会把整个 TypeScript 编译器载入内存，
 * 实测让 api 进程的 RSS 从 74.7MB（跑 dist）涨到 193.6MB（ts-node 直跑源码）。
 * esbuild 编译 140 个文件只需约 0.2 秒，编译完即退出、不常驻，所以这里改成
 * 「编译一次 → 跑 dist」；开发期与生产形态一致，改完代码重启该脚本即可。
 *
 * 需要「改完自动重编译」时，另开一个终端跑：
 *   node ../scripts/build-api.mjs --watch
 *
 * npm run dev 在 Windows cmd/PowerShell 下不解析 "VAR=value 命令" 前缀，
 * 这里用 Node 进程显式设置环境变量再拉起服务。
 */
process.env.AUTO_OPEN_EXPLORER = 'true';
const { spawn, spawnSync } = require('node:child_process');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const API_DIR = path.join(__dirname, '..');

const build = spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'build-api.mjs')], {
  cwd: ROOT,
  stdio: 'inherit',
});
if (build.status !== 0) {
  console.error('[api] esbuild 编译失败');
  process.exit(build.status ?? 1);
}

const child = spawn(process.execPath, ['dist/app.js'], {
  cwd: API_DIR,
  stdio: 'inherit',
});

child.on('exit', (code) => process.exit(code ?? 0));
process.on('SIGINT', () => child.kill());
process.on('SIGTERM', () => child.kill());
