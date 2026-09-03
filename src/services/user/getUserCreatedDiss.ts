import axios from 'axios';
import { getRequestCookie, getRequestUin } from '../../util/requestCredential';

/**
 * getUserCreatedDiss - 指定用户创建的公开歌单（他人主页兜底通道）
 *
 * 2026-09 新增（本播放器项目适配）：
 * 接口 c.y.qq.com/rsc/fcgi-bin/fcg_user_created_diss
 * 参数：hostmid=目标用户加密 uin（hostuin 传数字 uin，未知传 0）、sin 偏移、n 条数。
 * 返回 data.lst[]（每项含 dissid/title/picurl/intro/song_count 以及创建者
 * nick/avatar/encrypt_uin）+ data.total。
 *
 * 用途：getUserProfile（主页聚合接口）取不到目标用户时（隐私限制、未登录、
 * 上游不识别 hostUin）退化为「只展示 TA 创建的歌单 + 昵称头像」，
 * 由 controllers/getUserProfile 统一整形为同一响应结构，前端无感。
 */

interface GetUserCreatedDissParams {
  /** 目标用户加密 uin（必填） */
  uin: string;
  /** 起始偏移（从 0 开始） */
  sin?: number;
  /** 拉取条数 */
  num?: number;
}

export default async ({ uin, sin = 0, num = 100 }: GetUserCreatedDissParams) => {
  try {
    const res = await axios.get('https://c.y.qq.com/rsc/fcgi-bin/fcg_user_created_diss', {
      params: {
        cid: 205360838,
        ct: 24,
        hostuin: 0,
        hostmid: uin,
        sin,
        n: num,
        loginUin: getRequestUin(),
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
