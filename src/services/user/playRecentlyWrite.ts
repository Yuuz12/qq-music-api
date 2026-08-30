import axios from 'axios';
import { logServiceFailure, logServiceRequest, logServiceSuccess } from '../../util/observability';
import { getRequestCookie, getRequestUin } from '../../util/requestCredential';

/**
 * playRecentlyWrite - 最近播放的上报 / 删除（云端写接口）
 *
 * 2026-08-30 实测打通（本播放器项目适配）：
 * 通过 Frida hook 客户端 QQMusic_Protocol.dll 内嵌 jsoncpp 的 FastWriter::write，
 * 抓到官方客户端切歌时的真实上报报文（见 qqmusic-capture/API-NOTES.md）：
 * - module: music.musicasset.PlayRecentlyWrite
 * - method: ReportPlayRecentlyInfo / DeletePlayRecentlyInfo
 * - param（上报）: { data: [{ id: <songid>, lastTime: <unix秒>, listenCnt: <增量>, type: 2 }] }
 *   （listenCnt 为增量：官方客户端每次播一首固定发 1，服务端累加）
 * - param（删除）: { data: [{ id: <songid>, type: 2 }] }
 * - 响应: { ret, timeList: [{ type, updateTime, lastUpdateTime, code }] }，code=0 成功
 * 免签 HTTPS musicu.fcg 即可调用（Cookie 登录态鉴权），多用户随请求头下发。
 */

interface WriteItem {
  /** 歌曲 songid（纯数字） */
  id: string | number;
  /** 上报专用：unix 秒 */
  lastTime?: number;
  /** 上报专用：次数增量（官方客户端每首歌固定发 1） */
  listenCnt?: number;
  /** 分类：2=歌曲 */
  type: number;
}

/** 统一响应结构 */
export interface PlayRecentlyWriteResponse {
  /** 0 成功；上游业务码原样透出；服务层失败为 -1 */
  code: number;
  req_0?: {
    code: number;
    data?: {
      ret?: number;
      timeList?: Array<{
        type?: number;
        updateTime?: number;
        lastUpdateTime?: number;
        code?: number;
      }>;
      [key: string]: unknown;
    };
  };
  message?: string;
}

const UPSTREAM_URL = 'https://u.y.qq.com/cgi-bin/musicu.fcg';

async function write(
  action: 'ReportPlayRecentlyInfo' | 'DeletePlayRecentlyInfo',
  items: WriteItem[],
  logTag: string,
): Promise<{
  status: number;
  body: { response: PlayRecentlyWriteResponse };
}> {
  logServiceRequest(logTag, UPSTREAM_URL, { action, count: items.length });
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
        module: 'music.musicasset.PlayRecentlyWrite',
        method: action,
        param: { data: items },
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
    const innerCode = req0?.data?.timeList?.[0]?.code;
    if (code !== 0 || innerCode !== 0) {
      logServiceFailure(logTag, UPSTREAM_URL, new Error(`code ${code} inner ${innerCode}`), {
        action,
      });
    } else {
      logServiceSuccess(logTag, UPSTREAM_URL, { action, count: items.length });
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
    logServiceFailure(logTag, UPSTREAM_URL, error, { action });
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
 * 上报最近播放（客户端每播一首歌调用一次；listenCnt 为增量，固定发 1）
 * @param songId 歌曲 songid（纯数字）
 */
export const reportPlayRecently = (songId: string | number) =>
  write(
    'ReportPlayRecentlyInfo',
    [{ id: String(songId), lastTime: Math.floor(Date.now() / 1000), listenCnt: 1, type: 2 }],
    'reportPlayRecently',
  );

/**
 * 从最近播放删除（type 2=歌曲）
 * @param songId 歌曲 songid（纯数字）
 */
export const deletePlayRecently = (songId: string | number) =>
  write('DeletePlayRecentlyInfo', [{ id: String(songId), type: 2 }], 'deletePlayRecently');
