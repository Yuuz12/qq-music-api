import axios from 'axios';
import { getRequestCookie, getRequestUin } from '../../util/requestCredential';

/**
 * getUserFavDiss - 收藏歌单列表
 *
 * 2026-08 新增（本播放器项目适配）：
 * 逆向自 QQ 音乐 Web 端个人页（y.qq.com/n/ryqq/profile）「收藏歌单」标签：
 * 接口 c.y.qq.com/fav/fcgi-bin/fcg_get_profile_order_asset.fcg
 * （cid=205360956；reqtype=3 为歌单 / 2 为专辑；sin~ein 为偏移区间分页）
 * 返回：data.cdlist[]（收藏的歌单对象）+ data.totaldiss（总数）
 * 需要登录 cookie（多用户：随请求头下发，见 util/requestCredential.ts）。
 */

interface GetUserFavDissParams {
  /** 起始偏移（从 0 开始） */
  sin?: number;
  /** 拉取条数 */
  num?: number;
}

export default async ({ sin = 0, num = 100 }: GetUserFavDissParams = {}) => {
  try {
    const res = await axios.get('https://c.y.qq.com/fav/fcgi-bin/fcg_get_profile_order_asset.fcg', {
      params: {
        ct: 20,
        cid: 205360956,
        userid: getRequestUin(),
        reqtype: 3,
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
