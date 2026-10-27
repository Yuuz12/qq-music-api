import { createHash } from 'node:crypto';
import axios from 'axios';
import { logger } from '../../util/logger';
import { getRequestCookie, getRequestUin } from '../../util/requestCredential';
import { musicKeyFromCookie } from '../concern/concernWrite';

/**
 * 客户端式收藏写通道（2026-10 实测）。
 *
 * 背景：网页扫码登录的原始 Cookie 可以直接免签调用 musicu.fcg；但一旦用
 * /user/refresh（QQConnectLogin.QQLogin）换发新 musickey，继续带网页字段
 * （p_skey/pt4_token 等）+ 网页 comm 会被上游判 80105。
 *
 * 实测可用的刷新后形态：
 *   - Cookie 收窄成「客户端式最小集」：qm_keyst/qqmusic_key + uin/p_uin/pt2gguin
 *     + psrf_qqaccess_token/openid/unionid + tmeLoginType + login_type
 *     + music_ignore_pskey（存在则带上）
 *   - comm 用客户端式：authst=musickey、tmeAppID=qqmusic、tmeLoginType、
 *     psrf_qqaccess_token/openid、uin、guid，不再带 g_tk/网页字段
 * 歌曲 Add/DelSonglist、歌单 Fav/CancelFavPlaylist、专辑 Fav/CancelFavAlbum
 * 均已用真实账号做过可逆验证，刷新前后都返回 code=0。
 */

const UPSTREAM_URL = 'https://u.y.qq.com/cgi-bin/musicu.fcg';

/** 客户端式写请求需要的最小 Cookie 字段（顺序无关；存在才保留） */
const CLIENT_COOKIE_NAMES = new Set([
  'qm_keyst',
  'qqmusic_key',
  'qqmusic_guid',
  'qqmusic_uin',
  'uin',
  'p_uin',
  'pt2gguin',
  'psrf_qqaccess_token',
  'psrf_qqopenid',
  'psrf_qqunionid',
  'tmeLoginType',
  'music_ignore_pskey',
  'login_type',
]);

export interface ClientWriteResult {
  /** 上游 req_1.code；0 成功；-4 无可用凭据；-1 网络/请求异常 */
  code: number;
  /** 上游 req_1.data（歌单/专辑收藏的成功判据在 data.result） */
  data?: Record<string, unknown>;
  raw?: string;
  message?: string;
}

/** 短时写频率限制：稍等重试即可恢复（实测快速 Add→Del 会偶发 80106，等 15s 后成功） */
export const TRANSIENT_WRITE_CODES = new Set([80106, 104604]);

function cookieValue(cookie: string, name: string): string {
  const m = String(cookie || '').match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return m ? m[1] : '';
}

/** 由完整网页 Cookie 构造客户端式最小 Cookie（音乐 key 一定用当前值） */
export function buildClientCookie(cookie: string): string {
  const key = musicKeyFromCookie(cookie);
  const out: string[] = [];
  for (const kv of String(cookie || '').split(/;\s*/)) {
    const i = kv.indexOf('=');
    if (i === -1) continue;
    const name = kv.slice(0, i);
    if (!CLIENT_COOKIE_NAMES.has(name)) continue;
    out.push(name === 'qm_keyst' || name === 'qqmusic_key' ? `${name}=${key}` : kv);
  }
  return out.join('; ');
}

/** 客户端式 comm（实测刷新后仍被写网关接受） */
export function buildClientComm(
  cookie: string,
  uin: string,
  musicKey: string,
): Record<string, unknown> {
  const cookieGuid = cookieValue(cookie, 'qqmusic_guid');
  const guid = /^[0-9a-f]{32}$/i.test(cookieGuid)
    ? cookieGuid.toUpperCase()
    : createHash('md5').update(String(uin)).digest('hex').toUpperCase();
  const loginType =
    Number(cookieValue(cookie, 'tmeLoginType')) || Number(cookieValue(cookie, 'login_type')) || 2;
  return {
    _channelid: '20',
    _os_version: '6.2.9200-2',
    authst: musicKey,
    ct: '19',
    cv: '2252',
    guid,
    patch: '118',
    psrf_qqaccess_token: cookieValue(cookie, 'psrf_qqaccess_token'),
    psrf_qqopenid: cookieValue(cookie, 'psrf_qqopenid'),
    tmeAppID: 'qqmusic',
    tmeLoginType: loginType,
    uin: String(uin),
    wid: '',
  };
}

/** 上游 code → 可直接展示给用户的中文提示 */
export function clientWriteMessage(code: number, message?: string): string {
  if (code === -4) return message || '未配置登录凭据，请重新登录';
  if (code === 1000 || code === 80105) return '登录会话已过期，请重新登录';
  if (TRANSIENT_WRITE_CODES.has(code)) return '操作太频繁，请稍后再试';
  if (code === -1) return message || '收藏请求失败，请检查网络后重试';
  return message || `收藏失败（code=${code}）`;
}

/**
 * 发一次客户端式写请求（当前唯一的收藏写通道）。
 * 缺 cookie/key/uin → code=-4；网络异常 → code=-1；上游非 0 原样返回 code。
 */
export async function clientWrite({
  module,
  method,
  param,
  logTag = 'clientWrite',
}: {
  module: string;
  method: string;
  param: Record<string, unknown>;
  logTag?: string;
}): Promise<ClientWriteResult> {
  const cookie = getRequestCookie();
  const uin = getRequestUin();
  const musicKey = musicKeyFromCookie(cookie);
  if (!cookie || !uin || uin === '0' || !musicKey) {
    return { code: -4, message: '未配置登录凭据（Cookie 缺少 uin / qm_keyst），请重新登录' };
  }

  const data = {
    comm: buildClientComm(cookie, uin, musicKey),
    req_1: { module, method, param },
  };
  try {
    for (let attempt = 0; attempt < 2; attempt++) {
      if (attempt > 0) await new Promise((r) => setTimeout(r, 1500));
      const res = await axios.get(UPSTREAM_URL, {
        params: { format: 'json', data: JSON.stringify(data) },
        headers: {
          Cookie: buildClientCookie(cookie),
          Referer: 'https://y.qq.com/',
        },
        timeout: 10000,
      });
      const upstream =
        res.data && typeof res.data === 'object' && res.data.req_1
          ? (res.data.req_1 as { code?: number; data?: Record<string, unknown> })
          : undefined;
      const code = Number(upstream?.code ?? res.data?.code ?? -1);
      if (code !== 0 && TRANSIENT_WRITE_CODES.has(code) && attempt === 0) {
        logger.warn(`[${logTag}] 客户端式写触发频率限制，稍后重试`, { module, method, code });
        continue;
      }
      if (code !== 0) logger.warn(`[${logTag}] 客户端式写被拒`, { module, method, code });
      return { code, data: upstream?.data, raw: JSON.stringify(res.data).slice(0, 2000) };
    }
    return { code: -1, message: '收藏请求失败，请稍后重试' };
  } catch (error) {
    logger.warn(`[${logTag}] 客户端式写异常:`, error instanceof Error ? error.message : error);
    return { code: -1, message: '收藏请求失败，请检查网络后重试' };
  }
}

/** 歌单/专辑收藏的 data.result 成功判据（result=0 且没有失败清单） */
export function isFavDataOk(data: Record<string, unknown> | undefined, failedKey: string): boolean {
  if (!data) return true; // 部分账号成功响应不带 data.result
  if (data.result !== undefined && Number(data.result) !== 0) return false;
  const failed = data[failedKey];
  return !Array.isArray(failed) || failed.length === 0;
}
