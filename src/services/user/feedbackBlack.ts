import axios from 'axios';
import { logServiceFailure, logServiceRequest, logServiceSuccess } from '../../util/observability';
import { getRequestCookie, getRequestUin } from '../../util/requestCredential';

/**
 * feedbackBlack - 不喜欢（黑名单）写/读接口
 *
 * 2026-08-31 实测打通（本播放器项目适配）：
 * 通过 Frida hook 客户端 jsoncpp 的 FastWriter::write（qqmusic-capture 指南第十一章），
 * 抓到 PC 客户端「猜你喜欢-沉浸刷歌 / 每日30首 / 刷歌模式 / 百万收藏 / 新歌推荐」
 * 各页面「删除这首歌曲（不喜欢）」按钮的真实请求，全部共用同一接口：
 * - module: music.feedback.FeedbackBlack
 * - method: AddDislike 写（删除这首歌曲，加入黑名单）
 *           CancelDislike 写（取消不喜欢，从黑名单恢复）
 *           GetDislikeList 读（不喜欢列表）
 * - param（AddDislike）: { Songs: [{ ID: "<songid>" }] }（实测仅 ID，无需 type）
 * - param（CancelDislike）: { Songs: [{ ID: "<songid>" }] }（推断，脚本内回放可逆验证）
 * - param（GetDislikeList）: { Cmd: 1 }（1=汇总；ref 项目注释 2=歌手 / 3=歌曲 / 4=风格）
 * 免签 HTTPS musicu.fcg 即可调用（Cookie 登录态鉴权，多用户随请求头下发）。
 * 注：SPA 网页层无此接口（仅 RefreshBlackList 事件通知），原生客户端直发，
 * 传输层加密，常规抓包不可见，故实际请求体由 jsoncpp hook 截获（见 qqmusic-capture）。
 */

/** 不喜欢分类：1=汇总 / 3=歌曲 / 2=歌手 / 4=风格（GetDislikeList 用） */
export type DislikeCmd = 1 | 2 | 3 | 4;

/** 统一响应结构 */
export interface FeedbackBlackResponse {
  /** 0 成功；上游业务码原样透出；服务层失败为 -1 */
  code: number;
  req_0?: {
    code: number;
    data?: {
      [key: string]: unknown;
    };
  };
  message?: string;
}

const UPSTREAM_URL = 'https://u.y.qq.com/cgi-bin/musicu.fcg';

async function call(
  method: 'AddDislike' | 'CancelDislike' | 'GetDislikeList',
  param: Record<string, unknown>,
  logTag: string,
): Promise<{
  status: number;
  body: { response: FeedbackBlackResponse };
}> {
  logServiceRequest(logTag, UPSTREAM_URL, { method, param });
  try {
    const data = {
      comm: {
        ct: 20,
        cv: 2252,
        uin: getRequestUin(),
        loginUin: getRequestUin(),
        format: 'json',
        platform: 'wk_v17',
        inCharset: 'utf-8',
        outCharset: 'utf-8',
        notice: 0,
        needNewCode: 1,
      },
      req_0: {
        module: 'music.feedback.FeedbackBlack',
        method,
        param,
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
      logServiceFailure(logTag, UPSTREAM_URL, new Error(`upstream code ${code}`), { method });
    } else {
      logServiceSuccess(logTag, UPSTREAM_URL, { method, param });
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
    logServiceFailure(logTag, UPSTREAM_URL, error, { method });
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

/**
 * 删除这首歌曲（不喜欢）——猜你喜欢-沉浸刷歌 / 每日30首 / 刷歌模式 /
 * 百万收藏 / 新歌推荐 的「删除这首歌曲」按钮共用接口
 * @param songId 歌曲 songid（纯数字）
 */
export const addDislike = (songId: string | number) =>
  call('AddDislike', { Songs: [{ ID: String(songId) }] }, 'addDislike');

/**
 * 取消不喜欢（从黑名单恢复）
 * @param songId 歌曲 songid（纯数字）
 */
export const cancelDislike = (songId: string | number) =>
  call('CancelDislike', { Songs: [{ ID: String(songId) }] }, 'cancelDislike');

/**
 * 读取不喜欢列表（Cmd=1 汇总）
 */
export const getDislikeList = () => call('GetDislikeList', { Cmd: 1 }, 'getDislikeList');
