/*
 * @Author: Rainy [https://github.com/rain120]
 * @Date: 2021-01-23 16:19:21
 * @LastEditors: Rainy
 * @LastEditTime: 2021-06-19 22:20:01
 */

import { Context, Next } from 'koa';
import { userInfo } from '../config';
import { isLoopback, runWithCredential } from './requestCredential';

/** 多用户凭据请求头（前端 localStorage 随请求下发，见 util/requestCredential.ts） */
const HEADER_COOKIE = 'x-qq-music-cookie';
const HEADER_UIN = 'x-qq-music-uin';

export default () => async (ctx: Context, next: Next) => {
  const request = ctx.request as unknown as { cookie: string };
  const headerCookie = String(ctx.get(HEADER_COOKIE) || '').trim();
  const headerUin = String(ctx.get(HEADER_UIN) || '').trim();
  const forwardedFor = ctx.get('x-forwarded-for');

  if (headerCookie) {
    // 多用户模式：使用调用方（前端 localStorage）下发的凭据，仅对本次请求生效；
    // 不再向调用方回写 Set-Cookie（凭据归属用户自己的浏览器）。
    request.cookie = headerCookie;
    return runWithCredential({ cookie: headerCookie, uin: headerUin, forwardedFor }, () => next());
  }

  // 严格多用户（默认）：服务端不使用全局 cookie，未带请求头按未登录处理。
  // 仅当 api/.env 显式设置 QQ_MUSIC_USE_GLOBAL_COOKIE=1 且来源为本机时才回退
  // （本机 Explorer/curl 调试用；局域网设备不受影响）。
  const useGlobalFallback =
    process.env.QQ_MUSIC_USE_GLOBAL_COOKIE === '1' && isLoopback(forwardedFor);

  if (useGlobalFallback) {
    if (userInfo.cookie) {
      request.cookie = userInfo.cookie;
    }

    const cookieHeader = ctx.request.headers;

    if (cookieHeader && userInfo.cookieList) {
      userInfo.cookieList.forEach((cookie: string) => {
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

  return runWithCredential({ forwardedFor }, () => next());
};
