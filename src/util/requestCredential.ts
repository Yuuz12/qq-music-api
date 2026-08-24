import { AsyncLocalStorage } from 'node:async_hooks';
import { userInfo } from '../config';

/**
 * 每请求凭据（本播放器项目适配 2026-08，多用户支持）：
 *
 * 多用户模式下，各用户把**自己的** QQ 音乐 cookie/uin 保存在浏览器
 * （前端 localStorage），随每个请求通过请求头发送：
 *   X-QQ-Music-Cookie: <完整 cookie 字符串>
 *   X-QQ-Music-Uin:    <数字 uin>
 * 服务层经本模块读取当前请求的凭据。
 *
 * 严格多用户（默认）：**服务端不使用任何全局 cookie**——未携带请求头时按未登录处理，
 * 每台设备都必须配置自己的凭据，账号互不串号。
 * 如需本机调试回退（API Explorer / curl），可在 api/.env 显式开启：
 *   QQ_MUSIC_USE_GLOBAL_COOKIE=1   （同时填回 QQ_MUSIC_COOKIE / QQ_MUSIC_UIN）
 *
 * 实现：AsyncLocalStorage 在请求中间件处写入、服务层读取，
 * 无需把 ctx 逐层透传给 service。
 */

interface RequestCredential {
  cookie?: string;
  uin?: string;
  /** 经 8080 反向代理透传的真实来源 IP（X-Forwarded-For），用于「仅本机」判断 */
  forwardedFor?: string;
}

const credentialStore = new AsyncLocalStorage<RequestCredential>();

const isLoopback = (ip: string): boolean =>
  !ip || ip === '::1' || ip === '127.0.0.1' || ip.startsWith('::ffff:127.');

/** IP 是否为本机回环地址（空视为本机直连） */
export { isLoopback };

/**
 * 全局 cookie 回退开关（默认关闭：严格多用户，服务端不持有任何账号凭据）。
 * 显式开启（QQ_MUSIC_USE_GLOBAL_COOKIE=1）后仍仅限**本机来源**：
 * 直连 3200（本就只监听 127.0.0.1），或经 8080 代理且 X-Forwarded-For 为 loopback。
 * 局域网其他设备经 8080 访问不带凭据 → 按未登录处理，不串号。
 */
export const isGlobalCookieEnabled = (): boolean => {
  if (process.env.QQ_MUSIC_USE_GLOBAL_COOKIE !== '1') return false;
  const forwardedFor = credentialStore.getStore()?.forwardedFor ?? '';
  return isLoopback(forwardedFor);
};

/** 在指定凭据上下文中执行后续中间件/服务 */
export function runWithCredential<T>(credential: RequestCredential, fn: () => T): T {
  return credentialStore.run(credential, fn);
}

/** 从 cookie 字符串提取 uin（形如 "uin=1234567890"） */
function uinFromCookie(cookie: string): string {
  const m = cookie.match(/(?:^|;\s*)uin=(\d+)/);
  return m ? m[1] : '';
}

/** 当前请求的 cookie（请求头优先；仅显式开启回退时才使用全局配置） */
export function getRequestCookie(): string {
  const cred = credentialStore.getStore();
  if (cred?.cookie) return cred.cookie;
  return isGlobalCookieEnabled() ? userInfo.cookie || '' : '';
}

/** 当前请求的 uin（请求头 → cookie 内 uin → 全局配置（需显式开启）） */
export function getRequestUin(): string {
  const cred = credentialStore.getStore();
  if (cred?.uin) return cred.uin;
  if (cred?.cookie) {
    const uin = uinFromCookie(cred.cookie);
    if (uin) return uin;
  }
  return isGlobalCookieEnabled() ? userInfo.uin || '0' : '0';
}
