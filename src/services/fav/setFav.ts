import axios from 'axios';
import { logger } from '../../util/logger';
import { proxyFailureText } from '../../util/proxyError';
import { getRequestCookie, getRequestUin } from '../../util/requestCredential';

/**
 * setFav - 添加/取消喜欢（写入「我喜欢」等收藏歌单）
 *
 * 2026-08 新增（本播放器项目适配）：
 * 「喜欢」按钮真实接口为 music.musicasset.PlaylistDetailWrite
 * （AddSonglist 添加 / DelSonglist 取消，dirId=201 为「我喜欢」）。
 * 但该写接口在登录态下强制要求官方前端加密（musics.fcg + zzc sign + ag-1 加密 body），
 * 纯 Node 无法复刻（实测明文/普通签名均被拒，返回 code 500026/80105）。
 * 因此写操作通过「官方通道代理」完成（scripts/qq-write-proxy.mjs，常驻 headless Edge）：
 * 代理在官方页面内 hook 请求明文，由官方请求库完成 签名→加密→发送→解密。
 *
 * 多用户（2026-08）：把当前请求的凭据（cookie/uin）一并转发给代理，
 * 代理按 cookie 切换页面登录态，确保写入的是**用户自己**的「我喜欢」列表。
 *
 * 环境变量 PROXY_URL 可覆盖代理地址（默认 http://localhost:9339）。
 */

export interface FavSongItem {
  /** 歌曲数字 id（songid） */
  songId: string | number;
  /** 歌曲类型（songtype），默认 0 */
  songType?: string | number;
}

interface SetFavParams {
  /** 目标收藏列表 dirId，默认 201 = 我喜欢 */
  dirId?: string | number;
  songs?: FavSongItem[];
  /** 当前是否已喜欢：true 时调用 DelSonglist（取消喜欢），false 时调用 AddSonglist（添加喜欢） */
  isFan?: boolean;
}

export const DEFAULT_FAV_DIR_ID = 201;

const PROXY_URL = process.env.PROXY_URL || 'http://localhost:9339';

export default async ({
  dirId = DEFAULT_FAV_DIR_ID,
  songs = [],
  isFan = false,
}: SetFavParams = {}) => {
  const v_songInfo = songs.map(({ songId, songType = 0 }) => ({
    songId,
    songType: Number(songType) || 0,
  }));
  const method = isFan ? 'DelSonglist' : 'AddSonglist';

  try {
    const reqCookie = getRequestCookie();
    const reqUin = getRequestUin();
    const payload: Record<string, unknown> = {
      dirId: Number(dirId) || DEFAULT_FAV_DIR_ID,
      method,
      songs: v_songInfo,
    };
    // 多用户：把当前请求的凭据一并转发给代理，代理按 cookie 切换登录态
    if (reqCookie) payload.cookie = reqCookie;
    if (reqUin && reqUin !== '0') payload.uin = reqUin;
    const res = await axios.post(`${PROXY_URL}/playlist-write`, payload, {
      timeout: 45000, // 前端 30s 兜底；这里 45s 保证官方页面初始化不被打断
      headers: { 'Content-Type': 'application/json' },
    });
    const proxy = res.data || {};
    // 代理返回 { ok, code, msg, error, raw }；code 为上游 req_1.code（0 成功）
    return {
      status: 200,
      body: {
        response: {
          code: proxy.code ?? -1,
          message: proxy.msg || proxy.error,
          data: proxy.raw ? { raw: proxy.raw } : undefined,
        },
      },
    };
  } catch (error) {
    const msg = proxyFailureText(error);
    logger.error('[setFav] proxy call failed:', error instanceof Error ? error.message : error);
    return {
      status: 500,
      body: {
        response: {
          code: -1,
          error: msg,
        },
      },
    };
  }
};
