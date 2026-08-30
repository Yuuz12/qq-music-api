import axios from 'axios';
import { logServiceFailure, logServiceRequest, logServiceSuccess } from '../../util/observability';
import { getRequestCookie, getRequestUin } from '../../util/requestCredential';

/**
 * getSearchByType - 分类搜索（专辑/歌单/歌手/用户）
 *
 * 2026-08 新增（本播放器项目适配）：
 * 老接口 client_search_cp 对这四类已不再返回数据（code=0 但 list 恒为空），
 * 改走 Web 端 musicu.fcg 的 music.search.SearchCgiService/DoSearchForQQMusicDesktop。
 * 注意 musicu 的 search_type 映射与老接口的 t 不同：
 *   musicu：0 歌曲 / 1 歌手 / 2 专辑 / 3 歌单 / 7 歌词 / 8 用户
 *   老接口 t：0 歌曲 / 2 用户 / 3 歌单 / 7 歌词 / 8 专辑 / 9 歌手
 * 歌曲与歌词仍走老的 getSearchByKey（老接口匿名可用、歌词带命中片段）。
 * 参考逆向来源：jsososo/QQMusicApi issue #160、Rain120/qq-music-api issue #82。
 */

interface GetSearchByTypeParams {
  key?: string;
  limit?: string | number;
  page?: string | number;
  /** musicu search_type：1 歌手 / 2 专辑 / 3 歌单 / 8 用户 */
  t?: string | number;
}

/** 允许走 musicu 的类型（歌曲/歌词由老的 getSearchByKey 承担） */
const ALLOWED_TYPES = new Set([1, 2, 3, 8]);

export default async ({ key, limit = 20, page = 1, t }: GetSearchByTypeParams) => {
  const searchType = Number(t);
  if (!ALLOWED_TYPES.has(searchType)) {
    return {
      status: 400,
      body: {
        response: {
          code: -1,
          error: `invalid search type t=${t} (allowed: 1 singer / 2 album / 3 playlist / 8 user)`,
        },
      },
    };
  }
  // 每页数量钳制到 30：实测 musicu 对歌手(1)/专辑(2)类型 num_per_page=50 会整页返回空（sum=0），
  // 30 以内全部正常（歌手总数上限 8 左右、专辑 50 上下，30/页足够覆盖）。
  const numPerPage = Math.min(30, Math.max(1, Number(limit) || 20));
  const data = {
    comm: {
      ct: 19,
      cv: 1859,
      uin: getRequestUin(),
      format: 'json',
    },
    req_search: {
      module: 'music.search.SearchCgiService',
      method: 'DoSearchForQQMusicDesktop',
      param: {
        search_type: searchType,
        query: key,
        page_num: Math.max(1, Number(page) || 1),
        num_per_page: numPerPage,
        highlight: 1,
      },
    },
  };
  logServiceRequest('getSearchByType', '/cgi-bin/musicu.fcg', {
    search_type: searchType,
    query: key,
  });
  // 匿名请求会被上游随机风控（req_search.code=2001，约 2/3 概率），带登录 cookie 基本稳定；
  // 2001 时最多重试 2 次（间隔 300ms），显著提升匿名成功率
  let lastResponse = {};
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 300));
    try {
      // 必须用 POST JSON（GET + data 参数会被风控拦成 code 2001，部分类型直接空列表）
      const res = await axios.post('https://u.y.qq.com/cgi-bin/musicu.fcg', data, {
        headers: {
          'Content-Type': 'application/json',
          Referer: 'https://y.qq.com/',
          Cookie: getRequestCookie(),
        },
        timeout: 10000,
      });
      const response = res.data || {};
      const reqCode = response?.req_search?.code;
      if (reqCode === 2001) {
        lastResponse = response; // 风控拦截：稍后重试
        continue;
      }
      logServiceSuccess('getSearchByType', '/cgi-bin/musicu.fcg', response, { keyword: key });
      return {
        status: 200,
        body: { response },
      };
    } catch (error) {
      logServiceFailure('getSearchByType', '/cgi-bin/musicu.fcg', error, { keyword: key });
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
  }
  logServiceFailure(
    'getSearchByType',
    '/cgi-bin/musicu.fcg',
    new Error('risk control 2001 after 3 attempts'),
    { keyword: key },
  );
  return {
    status: 200,
    body: { response: lastResponse },
  };
};
