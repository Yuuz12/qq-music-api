"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isGlobalCookieEnabled = exports.isLoopback = void 0;
exports.runWithCredential = runWithCredential;
exports.getRequestCookie = getRequestCookie;
exports.getRequestUin = getRequestUin;
const node_async_hooks_1 = require("node:async_hooks");
const config_1 = require("../config");
const credentialStore = new node_async_hooks_1.AsyncLocalStorage();
const isLoopback = (ip) => !ip || ip === '::1' || ip === '127.0.0.1' || ip.startsWith('::ffff:127.');
exports.isLoopback = isLoopback;
/**
 * 全局 cookie 回退开关（默认关闭：严格多用户，服务端不持有任何账号凭据）。
 * 显式开启（QQ_MUSIC_USE_GLOBAL_COOKIE=1）后仍仅限**本机来源**：
 * 直连 3200（本就只监听 127.0.0.1），或经 8080 代理且 X-Forwarded-For 为 loopback。
 * 局域网其他设备经 8080 访问不带凭据 → 按未登录处理，不串号。
 */
const isGlobalCookieEnabled = () => {
    if (process.env.QQ_MUSIC_USE_GLOBAL_COOKIE !== '1')
        return false;
    const forwardedFor = credentialStore.getStore()?.forwardedFor ?? '';
    return isLoopback(forwardedFor);
};
exports.isGlobalCookieEnabled = isGlobalCookieEnabled;
/** 在指定凭据上下文中执行后续中间件/服务 */
function runWithCredential(credential, fn) {
    return credentialStore.run(credential, fn);
}
/** 从 cookie 字符串提取 uin（形如 "uin=1234567890"） */
function uinFromCookie(cookie) {
    const m = cookie.match(/(?:^|;\s*)uin=(\d+)/);
    return m ? m[1] : '';
}
/** 当前请求的 cookie（请求头优先；仅显式开启回退时才使用全局配置） */
function getRequestCookie() {
    const cred = credentialStore.getStore();
    if (cred?.cookie)
        return cred.cookie;
    return (0, exports.isGlobalCookieEnabled)() ? config_1.userInfo.cookie || '' : '';
}
/** 当前请求的 uin（请求头 → cookie 内 uin → 全局配置（需显式开启）） */
function getRequestUin() {
    const cred = credentialStore.getStore();
    if (cred?.uin)
        return cred.uin;
    if (cred?.cookie) {
        const uin = uinFromCookie(cred.cookie);
        if (uin)
            return uin;
    }
    return (0, exports.isGlobalCookieEnabled)() ? config_1.userInfo.uin || '0' : '0';
}
