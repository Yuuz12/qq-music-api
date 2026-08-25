import axios from 'axios';
import { logger } from '../../util/logger';
import { getRequestCookie, getRequestUin } from '../../util/requestCredential';

/**
 * setAlbumFav - 收藏/取消收藏专辑
 *
 * 2026-08 新增（本播放器项目适配）：
 * 「收藏专辑」按钮真实接口为 music.musicasset.AlbumFavWrite
 * （method=FavAlbum 收藏 / CancelFavAlbum 取消收藏，param={ uin, v_albumMid:[albumMid] }，
 *  成功判据 req_1.data.result === 0），逆向自 QQ 音乐 Web 端专辑页收藏模块。
 * 与「喜欢」歌曲相同：该写接口在登录态下强制要求官方前端加密
 * （musics.fcg + zzc sign + ag-1 加密 body），纯 Node 无法复刻
 * （实测明文/普通签名均被拒，返回 code 500026/80105）。
 * 因此写操作通过「官方通道代理」完成（scripts/qq-write-proxy.mjs / electron/write-bridge.mjs，
 * 常驻 headless 浏览器或 Electron 隐藏窗口），转发到代理的 /album-fav-write 端点，
 * 由官方请求库完成 签名→加密→发送→解密。
 *
 * 多用户（2026-08）：把当前请求的凭据（cookie/uin）一并转发给代理，
 * 代理按 cookie 切换页面登录态，确保写入的是**用户自己**的收藏专辑。
 *
 * 环境变量 PROXY_URL 可覆盖代理地址（默认 http://localhost:9339）。
 */

interface SetAlbumFavParams {
  /** 专辑 mid（albumMid） */
  albumMid?: string | number;
  /** 当前是否已收藏：true 时调用 CancelFavAlbum（取消收藏），false 时调用 FavAlbum（收藏） */
  isFan?: boolean;
}

const PROXY_URL = process.env.PROXY_URL || 'http://localhost:9339';

export default async ({ albumMid = '', isFan = false }: SetAlbumFavParams = {}) => {
  const mid = String(albumMid ?? '').trim();
  if (!mid) {
    return {
      status: 400,
      body: {
        response: { code: -1, message: 'albumMid is required' },
      },
    };
  }

  try {
    const reqCookie = getRequestCookie();
    const reqUin = getRequestUin();
    const payload: Record<string, unknown> = {
      albumMid: mid,
      isFan,
    };
    // 多用户：把当前请求的凭据一并转发给代理，代理按 cookie 切换登录态
    if (reqCookie) payload.cookie = reqCookie;
    if (reqUin && reqUin !== '0') payload.uin = reqUin;
    const res = await axios.post(`${PROXY_URL}/album-fav-write`, payload, {
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
    const msg = String((error as Error)?.message || error);
    logger.error('[setAlbumFav] proxy call failed:', msg);
    const proxyHint =
      msg.includes('ECONNREFUSED') || msg.includes('fetch failed')
        ? '（代理未启动：请先运行 npm run proxy）'
        : '';
    return {
      status: 500,
      body: {
        response: {
          code: -1,
          error: `${msg}${proxyHint}`,
        },
      },
    };
  }
};
