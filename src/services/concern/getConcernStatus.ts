import axios from 'axios';
import { logServiceFailure, logServiceRequest, logServiceSuccess } from '../../util/observability';
import { getRequestCookie } from '../../util/requestCredential';

/**
 * getConcernStatus - 批量查询关注状态（歌手页「关注」按钮 / 他人主页「关注」按钮高亮）
 *
 * 2026-10 抓取（qqmusic-capture 逆向 y.qq.com 歌手页 chunk 的
 * Concern.ConcernSystemServer 调用，tmp/follow/concern-probe.mjs 实测 code=0）：
 * - module: Concern.ConcernSystemServer
 * - method: cgi_qry_concern_status
 * - param:  { vec_userinfo: [{ usertype, userid }], opertype: 5, encrypt_singerid: 1 }
 *   usertype=1 歌手（userid 传歌手 mid）、usertype=0 用户（userid 传 EncUin，见 getRelationList.encuin）；
 *   encrypt_singerid=1 只影响歌手维度，对用户维度无副作用（2026-10-21 混合查询实测两者都能回）。
 * - 响应:   data.map_singer_status = { [singerMid]: 0 | 1 }（1=已关注），
 *           data.map_user_status   = { [encuin]: 0 | 1 }
 * 与「关注/取关」写接口同一模块；本读接口只需基础 comm，免签 musicu.fcg 直调。
 * 需要登录 cookie（多用户：随请求头下发，见 util/requestCredential.ts）。
 *
 * ⚠️ 上游对关注状态有数秒缓存：刚关注/取关后立即复查可能仍返回旧值，
 * 前端切换按钮时以写接口返回码为准，不要用复查结果回滚 UI。
 */

/** 上游 map_singer_status 结构：singerMid → 1(已关注) / 0(未关注) */
export type ConcernStatusMap = Record<string, number>;

/** 统一响应结构（成功与失败共用，便于控制器/测试访问） */
export interface GetConcernStatusResponse {
  /** 0 成功；上游业务码（如未登录）原样透出；服务层失败为 -1 */
  code: number;
  req_0?: {
    code: number;
    data?: {
      map_singer_status?: ConcernStatusMap;
      map_user_status?: Record<string, number>;
      [key: string]: unknown;
    };
  };
  message?: string;
}

interface GetConcernStatusParams {
  /** 歌手 mid 列表（歌手页一次只查一个，保留批量能力给列表/多页场景） */
  mids?: string[];
  /** 用户加密 uin 列表（他人主页查「我有没有关注 TA」；EncUin 来自 getRelationList.encuin） */
  encuins?: string[];
}

const UPSTREAM_URL = 'https://u.y.qq.com/cgi-bin/musicu.fcg';

/** 单次批量上限：vec_userinfo 过长会顶到上游 URL 长度限制（GET 免签通道） */
const MAX_BATCH = 20;

export default async ({
  mids = [],
  encuins = [],
}: GetConcernStatusParams = {}): Promise<{
  status: number;
  body: { response: GetConcernStatusResponse };
}> => {
  const singers = [...new Set(mids.map((m) => String(m || '').trim()).filter(Boolean))].slice(
    0,
    MAX_BATCH,
  );
  const users = [...new Set(encuins.map((u) => String(u || '').trim()).filter(Boolean))].slice(
    0,
    MAX_BATCH,
  );
  if (!singers.length && !users.length) {
    return {
      status: 400,
      body: { response: { code: -1, message: 'mids or encuins is required' } },
    };
  }

  logServiceRequest('getConcernStatus', UPSTREAM_URL, {
    singers: singers.length,
    users: users.length,
  });
  try {
    const data = {
      comm: {
        ct: 24,
        cv: 0,
        format: 'json',
        platform: 'yqq.json',
      },
      req_0: {
        module: 'Concern.ConcernSystemServer',
        method: 'cgi_qry_concern_status',
        param: {
          vec_userinfo: [
            ...singers.map((mid) => ({ usertype: 1, userid: mid })),
            ...users.map((encuin) => ({ usertype: 0, userid: encuin })),
          ],
          opertype: 5,
          encrypt_singerid: 1,
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
      logServiceFailure('getConcernStatus', UPSTREAM_URL, new Error(`upstream code ${code}`), {
        singers: singers.length,
        users: users.length,
      });
    } else {
      logServiceSuccess('getConcernStatus', UPSTREAM_URL, {
        singers: singers.length,
        users: users.length,
        followed:
          Object.values(req0?.data?.map_singer_status || {}).filter((v) => v === 1).length +
          Object.values(req0?.data?.map_user_status || {}).filter((v) => v === 1).length,
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
    logServiceFailure('getConcernStatus', UPSTREAM_URL, error, {
      singers: singers.length,
      users: users.length,
    });
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
