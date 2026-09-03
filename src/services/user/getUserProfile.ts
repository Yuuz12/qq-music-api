import axios from 'axios';
import { getRequestCookie, getRequestUin } from '../../util/requestCredential';

/**
 * getUserProfile - 用户主页聚合信息（自己或他人）
 *
 * 2026-08 新增（本播放器项目适配）：
 * 逆向自 QQ 音乐 Web 端个人页（y.qq.com/n/ryqq/profile）：
 * 接口 c.y.qq.com/rsc/fcgi-bin/fcg_get_profile_homepage.fcg
 * 返回：昵称/头像/粉丝数/关注数/我喜欢（歌曲/专辑/歌单计数）/我创建的歌单列表
 * 需要登录 cookie（多用户：随请求头下发，见 util/requestCredential.ts）。
 *
 * 2026-09 扩展：查看他人主页。传 `uin`（目标用户的**加密 uin**，即 EncUin，
 * 来自 getRelationList 的 encuin / 用户搜索结果）时，同一接口的 `userid` 与
 * `hostUin` 均改为该值（查自己时两者为 0，按登录态返回）。
 * 上游在取不到目标用户时可能回落成登录用户自己的资料，因此响应里的
 * `creator.encrypt_uin` 是否等于请求 uin 由控制器负责校验（见 controllers/getUserProfile）。
 */

interface GetUserProfileParams {
  /** 目标用户加密 uin；空串 = 当前登录用户自己 */
  uin?: string;
}

export default async ({ uin = '' }: GetUserProfileParams = {}) => {
  const selfUin = getRequestUin();
  const hostUin = uin || 0;
  try {
    const res = await axios.get('https://c.y.qq.com/rsc/fcgi-bin/fcg_get_profile_homepage.fcg', {
      params: {
        cid: 205360838,
        ct: 24,
        userid: hostUin,
        reqfrom: 1,
        reqtype: 0,
        hostUin,
        loginUin: selfUin,
        needNewCode: 0,
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
      body: { response: res.data || {} },
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
