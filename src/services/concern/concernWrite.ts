import axios from 'axios';
import { logServiceFailure, logServiceRequest, logServiceSuccess } from '../../util/observability';
import { getRequestCookie, getRequestUin } from '../../util/requestCredential';

/**
 * concernWrite - 关注 / 取关的公共写通道（歌手与用户共用）
 *
 * 2026-10 抓取（qqmusic-capture 逆向 y.qq.com 调用 + 可逆实验实测 code=0）：
 * - module: Concern.ConcernSystemServer
 * - method: cgi_concern_user_v2
 * - param:  { opertype: 0(关注) | 1(取关), source: 0,
 *             userinfo: { usertype, userid }, encrypt_singerid?: 1 }
 *   · usertype=1 歌手：userid 传歌手 mid，**必须**带 encrypt_singerid:1
 *   · usertype=0 用户：userid 传加密 uin（EncUin，getRelationList 的 encuin），**不带** encrypt_singerid
 * - 响应:   req_0.code = 0 成功；req_0.data.code = 0 才是真正落库成功
 *           （失败时 data.code 带业务码，外层 code 仍可能是 0）
 *
 * 关键约束（实测，与「收藏歌单」等写接口一致）：
 * - **必须完整 comm**：基础 comm（无 uin / g_tk）返回 500026 反篡改拒绝；
 *   带上 uin + g_tk 后免签 musicu.fcg 直调即 code=0，无需官方页面加密通道。
 * - g_tk 由 cookie 里的 qm_keyst（或 qqmusic_key）按 bkn 算法（hash 5381）算出，
 *   与登录态绑定，不同账号必须各自计算。
 * - opertype 语义与常见直觉相反：0 = 关注，1 = 取消关注（与网页端 `opertype: isFollow ? 1 : 0` 一致）。
 *
 * 需要登录 cookie（多用户：随请求头下发，见 util/requestCredential.ts）。
 */

/** 关注对象类型：1=歌手（userid 为 singerMid），0=普通用户（userid 为 EncUin） */
export type ConcernUserType = 0 | 1;

/** 统一响应结构（成功与失败共用，便于控制器/测试访问） */
export interface ConcernWriteResponse {
  /** 0 成功；上游业务码（500026 反篡改 / 1000 登录失效 / 80105 会话失效）原样透出；服务层失败为 -1 */
  code: number;
  req_0?: {
    code: number;
    data?: {
      code?: number;
      [key: string]: unknown;
    };
  };
  message?: string;
}

interface ConcernWriteParams {
  /** 1=歌手，0=用户 */
  usertype: ConcernUserType;
  /** 歌手 mid 或用户加密 uin（EncUin） */
  userid: string;
  /** 当前是否已关注：true → 取关（opertype=1），false → 关注（opertype=0） */
  isFollow?: boolean;
  /** 歌手维度需要 encrypt_singerid:1（用户维度不带） */
  encryptSingerid?: boolean;
  /** 日志标签（区分 setSingerConcern / setUserConcern） */
  logTag: string;
}

const UPSTREAM_URL = 'https://u.y.qq.com/cgi-bin/musicu.fcg';

/**
 * 从登录 cookie 取音乐 Key（qm_keyst 与 qqmusic_key 是同一值的两个键名，
 * 客户端/网页各写一个，谁在就用谁）
 */
export function musicKeyFromCookie(cookieStr: string): string {
  const m = String(cookieStr || '').match(/(?:^|;\s*)(?:qm_keyst|qqmusic_key)=([^;]+)/);
  return m ? m[1] : '';
}

/**
 * 腾讯 bkn（getACSRFToken，hash 5381）：由音乐 Key 算出写接口要的 g_tk。
 * ⚠️ 空 Key 也会算出 5381（非 0），所以「有没有 Key」必须单独判断，
 * 不能靠 g_tk 是否为 0 来判断（否则会给上游发一个必然 500026 的请求）。
 */
export function gtkFromMusicKey(keyst: string): number {
  let hash = 5381;
  for (let i = 0; i < keyst.length; i++) hash += (hash << 5) + keyst.charCodeAt(i);
  return hash & 0x7fffffff;
}

/** 上游业务码 → 可读提示（前端直接展示 response.message） */
function hintForCode(action: string, code: number): string {
  if (code === 500026)
    return `${action}失败：登录凭据校验不通过（g_tk 与 Cookie 不匹配），请重新配置登录凭据`;
  if (code === 1000) return `${action}失败：登录状态已失效，请重新配置登录凭据`;
  if (code === 80105) return `${action}失败：登录会话已过期，请重新登录`;
  // 104604：短时间连续关注/取关触发的上游限流（实测约 2 分钟后自动解除）
  if (code === 104604) return `${action}失败：操作太频繁，请稍后再试`;
  return `${action}失败（code=${code}）`;
}

export default async function writeConcern({
  usertype,
  userid,
  isFollow = false,
  encryptSingerid = false,
  logTag,
}: ConcernWriteParams): Promise<{ status: number; body: { response: ConcernWriteResponse } }> {
  const id = String(userid || '').trim();
  if (!id) {
    return { status: 400, body: { response: { code: -1, message: 'userid is required' } } };
  }

  const cookie = getRequestCookie();
  if (!cookie) {
    return {
      status: 200,
      body: {
        response: {
          code: -4,
          message: '未登录：请到 个人主页 → 登录凭据 配置 QQ 音乐 Cookie',
        },
      },
    };
  }
  const musicKey = musicKeyFromCookie(cookie);
  if (!musicKey) {
    return {
      status: 200,
      body: {
        response: {
          code: -4,
          message: '登录凭据缺少音乐 Key（qm_keyst / qqmusic_key），请重新配置 Cookie',
        },
      },
    };
  }
  const gtk = gtkFromMusicKey(musicKey);
  const uin = getRequestUin();
  const action = isFollow ? '取关' : '关注';

  logServiceRequest(logTag, UPSTREAM_URL, { usertype, userid: id, isFollow });
  try {
    const data = {
      comm: {
        ct: 24,
        cv: 0,
        uin,
        loginUin: uin,
        format: 'json',
        platform: 'yqq.json',
        g_tk: gtk,
        g_tk_new_20200303: gtk,
      },
      req_0: {
        module: 'Concern.ConcernSystemServer',
        method: 'cgi_concern_user_v2',
        param: {
          // 0 = 关注，1 = 取消关注（上游语义，见文件头注释）
          opertype: isFollow ? 1 : 0,
          source: 0,
          userinfo: { usertype, userid: id },
          ...(encryptSingerid ? { encrypt_singerid: 1 } : {}),
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
        Cookie: cookie,
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
    const outerCode = req0?.code ?? res.data?.code ?? -1;
    const innerCode = req0?.data?.code;
    // 外层 0 且内层 0/缺省才算成功：部分失败 case 外层仍回 0、真实业务码在内层
    const ok = outerCode === 0 && (innerCode === 0 || innerCode === undefined);
    const code = ok ? 0 : innerCode && innerCode !== 0 ? innerCode : outerCode;

    if (ok) {
      logServiceSuccess(logTag, UPSTREAM_URL, { usertype, userid: id, isFollow });
    } else {
      logServiceFailure(logTag, UPSTREAM_URL, new Error(`upstream code ${code}`), {
        usertype,
        userid: id,
        isFollow,
      });
    }
    return {
      status: 200,
      body: {
        response: {
          code,
          req_0: req0 ?? { code },
          message: ok ? undefined : hintForCode(action, code),
        },
      },
    };
  } catch (error) {
    logServiceFailure(logTag, UPSTREAM_URL, error, { usertype, userid: id, isFollow });
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
}
