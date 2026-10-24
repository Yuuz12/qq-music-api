import axios from 'axios';
import { logServiceFailure, logServiceRequest, logServiceSuccess } from '../../util/observability';
import { getRequestCookie, getRequestUin } from '../../util/requestCredential';

/**
 * playlistBaseWrite - 歌单本身的创建 / 删除（云端写接口）
 *
 * 2026-08-31 抓包实测（qqmusic-capture/probes/probe_playlist_write.py 可逆实验：
 * 建「QQMP测试歌单」→ 校验 dirId → 立即删除，全部 code=0；见
 * qqmusic-capture/API-NOTES.md「收藏与歌单管理写接口」与 docs/QQ音乐收藏与歌单接口笔记.md）：
 * - module: music.musicasset.PlaylistBaseWrite
 * - method: AddPlaylist / DelPlaylist
 * - param（创建）: { dirName: <名称> }
 * - param（删除）: { dirId: <歌单内部序号> }  ← **不是 tid**，传 tid 上游返回 1101（param 键不对）
 * - 响应: req_1.code = 0 成功；req_1.data.result = { tid, dirId, dirName, updateTime }
 *
 * 与「加歌到歌单」（PlaylistDetailWrite）不同，这两个接口只需**基础 comm**，
 * 免签 musicu.fcg 直调即可（无需 musics.fcg + sign，也无需官方页面加密通道），
 * 因此这里直接由 Node 发请求（同 services/user/playRecentlyWrite.ts 的做法），
 * 不必走写代理隐藏窗口——建/删歌单因此是秒级返回。
 * 需要登录 cookie（多用户：随请求头下发，见 util/requestCredential.ts）。
 */

interface PlaylistBaseWriteParams {
  /** 创建：歌单名称 */
  dirName?: string;
  /** 删除：歌单内部 dirId（201=我喜欢；自建歌单见 getUserProfile.disslist[].dirId） */
  dirId?: string | number;
}

/** 上游 req_1.data.result 结构（AddPlaylist / DelPlaylist 共用） */
export interface PlaylistBaseWriteResult {
  tid?: number | string;
  dirId?: number | string;
  dirName?: string;
  updateTime?: number | string;
  [key: string]: unknown;
}

/** 统一响应结构（成功与失败共用，便于控制器/测试访问） */
export interface PlaylistBaseWriteResponse {
  /** 0 成功；上游业务码（80105 会话失效等）原样透出；服务层失败为 -1 */
  code: number;
  req_1?: {
    code: number;
    data?: {
      result?: PlaylistBaseWriteResult;
      [key: string]: unknown;
    };
  };
  message?: string;
}

const UPSTREAM_URL = 'https://u.y.qq.com/cgi-bin/musicu.fcg';

/**
 * 发一次 PlaylistBaseWrite 请求（两个方法共用）。
 * 请求键用 req_1（上游按请求键原样回显，与抓包报文一致）。
 */
async function callWrite(
  method: 'AddPlaylist' | 'DelPlaylist',
  param: Record<string, unknown>,
  logTag: string,
): Promise<{ status: number; body: { response: PlaylistBaseWriteResponse } }> {
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
      req_1: {
        module: 'music.musicasset.PlaylistBaseWrite',
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
    const upstream =
      res.data &&
      typeof res.data === 'object' &&
      res.data.req_1 &&
      typeof res.data.req_1 === 'object'
        ? res.data.req_1
        : undefined;
    const code = upstream?.code ?? res.data?.code ?? -1;
    if (code !== 0) {
      logServiceFailure(logTag, UPSTREAM_URL, new Error(`code ${code}`), { method });
    } else {
      logServiceSuccess(logTag, UPSTREAM_URL, { method, dirId: upstream?.data?.result?.dirId });
    }
    return {
      status: 200,
      body: {
        response: {
          code,
          req_1: upstream ?? { code },
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
 * 创建歌单
 * @param dirName 歌单名称（空名由控制器拦截）
 */
export const addPlaylist = ({ dirName = '' }: PlaylistBaseWriteParams = {}) =>
  callWrite('AddPlaylist', { dirName: String(dirName).trim() }, 'addPlaylist');

/**
 * 删除歌单（仅能删自己的自建歌单；「我喜欢」dirId=201 不可删）
 * @param dirId 歌单内部 dirId（数字）
 */
export const delPlaylist = ({ dirId = 0 }: PlaylistBaseWriteParams = {}) =>
  callWrite('DelPlaylist', { dirId: Number(dirId) || 0 }, 'delPlaylist');
