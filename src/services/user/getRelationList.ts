import axios from 'axios';
import { logServiceFailure, logServiceRequest, logServiceSuccess } from '../../util/observability';
import { getRequestCookie, getRequestUin } from '../../util/requestCredential';

/**
 * getRelationList - 用户关系链列表（关注歌手 / 关注用户 / 粉丝）
 *
 * 2026-08 新增（本播放器项目适配）：
 * 逆向自 QQ 音乐 Web 端个人页（y.qq.com/n/ryqq_v2/profile/focus/singer 与 /profile/fans，
 * 协议调用位于 common.chunk）：
 * - module: music.concern.RelationList
 * - method: GetFollowSingerList（关注的歌手）/ GetFollowUserList（关注的用户）/ GetFansList（粉丝）
 * - param:  { From: 起始偏移, Size: 条数, HostUin: 目标用户加密 uin（查自己传空串，按登录态返回） }
 * - 响应:   data.List[] + data.HasMore
 * 需要登录 cookie（多用户：随请求头下发，见 util/requestCredential.ts）。
 */

export type RelationListType = 'follow_singer' | 'follow_user' | 'fans';

/** 友好类型 → 上游 musicu.fcg 方法名 */
export const RELATION_METHODS: Record<RelationListType, string> = {
  follow_singer: 'GetFollowSingerList',
  follow_user: 'GetFollowUserList',
  fans: 'GetFansList',
};

export const isRelationListType = (value: string): value is RelationListType =>
  Object.hasOwn(RELATION_METHODS, value);

interface GetRelationListParams {
  /** 列表类型：关注歌手 / 关注用户 / 粉丝 */
  type?: RelationListType;
  /** 起始偏移（从 0 开始） */
  from?: number;
  /** 拉取条数 */
  size?: number;
  /** 目标用户加密 uin；空串 = 当前登录用户自己 */
  hostUin?: string;
}

interface UpstreamRelationItem {
  MID?: string;
  EncUin?: string;
  Name?: string;
  Desc?: string;
  AvatarUrl?: string;
  FanNum?: number;
  IsFollow?: boolean | number;
  [key: string]: unknown;
}

/** 统一响应结构（成功与失败共用，便于控制器/测试访问） */
export interface GetRelationListResponse {
  /** 0 成功；上游业务码（如未登录）原样透出；服务层失败为 -1 */
  code: number;
  req_0?: {
    code: number;
    data?: {
      List?: UpstreamRelationItem[];
      HasMore?: boolean;
      [key: string]: unknown;
    };
  };
  /** 失败原因（仅服务层失败时存在） */
  message?: string;
}

const UPSTREAM_URL = 'https://u.y.qq.com/cgi-bin/musicu.fcg';

export default async ({
  type = 'fans',
  from = 0,
  size = 30,
  hostUin = '',
}: GetRelationListParams = {}): Promise<{
  status: number;
  body: { response: GetRelationListResponse };
}> => {
  logServiceRequest('getRelationList', UPSTREAM_URL, { type, from, size, hostUin });
  try {
    const data = {
      comm: {
        ct: 24,
        cv: 0,
        uin: getRequestUin(),
        loginUin: getRequestUin(),
        format: 'json',
        platform: 'yqq.json',
      },
      req_0: {
        module: 'music.concern.RelationList',
        method: RELATION_METHODS[type],
        param: {
          From: from,
          Size: size,
          HostUin: hostUin || '',
        },
      },
    };
    const res = await axios.get(UPSTREAM_URL, {
      params: {
        format: 'json',
        data: JSON.stringify(data),
      },
      headers: {
        Referer: 'https://y.qq.com/',
        Cookie: getRequestCookie(),
      },
      timeout: 10000,
    });
    const req0 =
      res.data &&
      typeof res.data === 'object' &&
      res.data.req_0 &&
      typeof res.data.req_0 === 'object'
        ? res.data.req_0
        : undefined;
    const code = req0?.code ?? res.data?.code ?? -1;
    if (code !== 0) {
      // 上游业务码透出（如未登录），不算服务层异常
      logServiceFailure('getRelationList', UPSTREAM_URL, new Error(`upstream code ${code}`), {
        type,
        from,
        size,
      });
    } else {
      logServiceSuccess('getRelationList', UPSTREAM_URL, {
        type,
        from,
        count: req0?.data?.List?.length ?? 0,
        hasMore: !!req0?.data?.HasMore,
      });
    }
    return {
      status: 200,
      body: {
        response: {
          code,
          req_0: req0 ?? { code },
        },
      },
    };
  } catch (error) {
    logServiceFailure('getRelationList', UPSTREAM_URL, error, { type, from, size });
    return {
      status: 500,
      body: {
        response: {
          code: -1,
          message: String(error),
        },
      },
    };
  }
};
