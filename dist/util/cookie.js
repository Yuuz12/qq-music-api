"use strict";
/*
 * @Author: Rainy [https://github.com/rain120]
 * @Date: 2021-01-23 16:19:21
 * @LastEditors: Rainy
 * @LastEditTime: 2021-06-19 22:20:01
 */
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("../config");
const requestCredential_1 = require("./requestCredential");
/** 多用户凭据请求头（前端 localStorage 随请求下发，见 util/requestCredential.ts） */
const HEADER_COOKIE = 'x-qq-music-cookie';
const HEADER_UIN = 'x-qq-music-uin';
exports.default = () => async (ctx, next) => {
    const request = ctx.request;
    const headerCookie = String(ctx.get(HEADER_COOKIE) || '').trim();
    const headerUin = String(ctx.get(HEADER_UIN) || '').trim();
    const forwardedFor = ctx.get('x-forwarded-for');
    if (headerCookie) {
        // 多用户模式：使用调用方（前端 localStorage）下发的凭据，仅对本次请求生效；
        // 不再向调用方回写 Set-Cookie（凭据归属用户自己的浏览器）。
        request.cookie = headerCookie;
        return (0, requestCredential_1.runWithCredential)({ cookie: headerCookie, uin: headerUin, forwardedFor }, () => next());
    }
    // 严格多用户（默认）：服务端不使用全局 cookie，未带请求头按未登录处理。
    // 仅当 api/.env 显式设置 QQ_MUSIC_USE_GLOBAL_COOKIE=1 且来源为本机时才回退
    // （本机 Explorer/curl 调试用；局域网设备不受影响）。
    const useGlobalFallback = process.env.QQ_MUSIC_USE_GLOBAL_COOKIE === '1' && (0, requestCredential_1.isLoopback)(forwardedFor);
    if (useGlobalFallback) {
        if (config_1.userInfo.cookie) {
            request.cookie = config_1.userInfo.cookie;
        }
        const cookieHeader = ctx.request.headers;
        if (cookieHeader && config_1.userInfo.cookieList) {
            config_1.userInfo.cookieList.forEach((cookie) => {
                const [key, value = ''] = cookie.split('=');
                if (value) {
                    ctx.cookies.set(key, value.trim(), {
                        maxAge: 24 * 60 * 60 * 1000,
                        // overwirte: true,
                    });
                }
            });
        }
    }
    return (0, requestCredential_1.runWithCredential)({ forwardedFor }, () => next());
};
