import axios from 'axios';
import { getRequestCookie, getRequestUin } from '../../util/requestCredential';

/**
 * getUserFavAlbum - 收藏专辑列表（个人主页「我喜欢」→ 专辑）
 *
 * 2026-08 新增（本播放器项目适配）：
 * 与 getUserFavDiss 同一上游接口
 * c.y.qq.com/fav/fcgi-bin/fcg_get_profile_order_asset.fcg
 * （cid=205360956；reqtype=3 为歌单 / 2 为专辑；sin~ein 为偏移区间分页）
 * 返回：data.albumlist[]（收藏的专辑对象）+ data.totalalb（总数）
 * 需要登录 cookie（多用户：随请求头下发，见 util/requestCredential.ts）。
 */

interface GetUserFavAlbumParams {
  /** 起始偏移（从 0 开始） */
  sin?: number;
  /** 拉取条数 */
  num?: number;
}

export default async ({ sin = 0, num = 100 }: GetUserFavAlbumParams = {}) => {
  try {
    const res = await axios.get('https://c.y.qq.com/fav/fcgi-bin/fcg_get_profile_order_asset.fcg', {
      params: {
        ct: 20,
        cid: 205360956,
        userid: getRequestUin(),
        reqtype: 2,
        sin,
        ein: sin + num - 1,
        format: 'json',
        outCharset: 'utf-8',
      },
      headers: {
        Referer: 'https://y.qq.com/',
        Cookie: getRequestCookie(),
      },
      timeout: 10000,
    });
    return {
      status: 200,
      body: {
        response: res.data || {},
      },
    };
  } catch (error) {
    return {
      status: 500,
      body: {
        response: {
          code: -1,
          error: String(error),
        },
      },
    };
  }
};
