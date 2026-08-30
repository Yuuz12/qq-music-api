import axios from 'axios';
import { logServiceFailure, logServiceRequest, logServiceSuccess } from '../../util/observability';
import { getRequestCookie, getRequestUin } from '../../util/requestCredential';

/**
 * getPlayRecently - 最近播放列表（云端同步接口）
 *
 * 2026-08-30 新增（本播放器项目适配）：
 * QQ 音乐 PC 客户端「最近播放」页为原生 C++ 界面（QQMusic.dll PlayHistoryView），
 * 流量不走内嵌浏览器，无法直接抓包。协议模块名取自 QQMusic_Protocol.dll 字符串表
 * （同族还有 PlayRecentlyWrite.ReportPlayRecentlyInfo / DeletePlayRecentlyInfo），
 * 经 Frida+CDP 在已登录页面上下文实测验证（2026-08-30，样本 play_recently_response.json）：
 * - module: music.musicasset.PlayRecentlyRead
 * - method: GetPlayRecentlyInfo
 * - param:  { type } — 2=歌曲（songList，上限 500）/ 3=专辑 / 4=歌单 / 1=全部分类汇总
 * - 响应:   data.data.songList[] = { track(新格式), lastTime, listenCnt, lastPlayDevice }
 *           data.updateTime = 云端最近更新时间戳
 * 需要登录 cookie（多用户：随请求头下发，见 util/requestCredential.ts）。
 */

/** 最近播放分类（param.type） */
export type PlayRecentlyType = 1 | 2 | 3 | 4;

/** type 取值合法性（0/缺省时上游返回内层 code:-1 且列表全空，属于无效参数） */
export const isPlayRecentlyType = (value: number): value is PlayRecentlyType =>
  value === 1 || value === 2 || value === 3 || value === 4;

interface GetPlayRecentlyParams {
  /** 分类：2=歌曲 / 3=专辑 / 4=歌单 / 1=全部汇总（前端最近播放页用 2） */
  type?: PlayRecentlyType;
}

interface UpstreamTrack {
  id?: number;
  mid?: string;
  name?: string;
  title?: string;
  singer?: unknown[];
  album?: { mid?: string; name?: string; [key: string]: unknown };
  interval?: number;
  pay?: { payplay?: number; payalbum?: number; pay_play?: number };
  [key: string]: unknown;
}

export interface PlayRecentlyItem {
  track?: UpstreamTrack;
  /** 最近一次播放的 unix 秒级时间戳 */
  lastTime?: number | string;
  /** 累计播放次数 */
  listenCnt?: number | string;
  /** 播放设备类型 */
  lastPlayDevice?: number | string;
  [key: string]: unknown;
}

/** 统一响应结构（成功与失败共用，便于控制器/测试访问） */
export interface GetPlayRecentlyResponse {
  /** 0 成功；上游业务码（如未登录）原样透出；服务层失败为 -1 */
  code: number;
  req_0?: {
    code: number;
    data?: {
      /** 云端最近更新时间戳（秒） */
      updateTime?: number;
      /** 内层业务码（-1 多为参数无效/无数据） */
      code?: number;
      data?: {
        songList?: PlayRecentlyItem[];
        albumList?: PlayRecentlyItem[];
        geDanList?: PlayRecentlyItem[];
        allItems?: Record<string, unknown>;
        [key: string]: unknown;
      };
    };
  };
  /** 失败原因（仅服务层失败时存在） */
  message?: string;
}

const UPSTREAM_URL = 'https://u.y.qq.com/cgi-bin/musicu.fcg';

export default async ({
  type = 2,
}: GetPlayRecentlyParams = {}): Promise<{
  status: number;
  body: { response: GetPlayRecentlyResponse };
}> => {
  logServiceRequest('getPlayRecently', UPSTREAM_URL, { type });
  try {
    // comm 用客户端实测形态（wk_v17/ct20/cv2252，抓包验证可用）
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
        module: 'music.musicasset.PlayRecentlyRead',
        method: 'GetPlayRecentlyInfo',
        param: { type },
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
    const songCount = req0?.data?.data?.songList?.length ?? 0;
    if (code !== 0) {
      logServiceFailure('getPlayRecently', UPSTREAM_URL, new Error(`upstream code ${code}`), {
        type,
      });
    } else {
      logServiceSuccess('getPlayRecently', UPSTREAM_URL, { type, songCount });
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
    logServiceFailure('getPlayRecently', UPSTREAM_URL, error, { type });
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
