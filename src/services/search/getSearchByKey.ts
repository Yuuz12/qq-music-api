import axios from 'axios';
import { logServiceFailure, logServiceRequest, logServiceSuccess } from '../../util/observability';
import { getRequestCookie, getRequestUin } from '../../util/requestCredential';

/**
 * getSearchByKey - 关键字搜索（歌曲 t=0 / 歌词 t=7）
 *
 * 2026-09 迁移（本播放器项目适配）：
 * 老上游 `c.y.qq.com/soso/fcgi-bin/client_search_cp` 已被 QQ 音乐下线，稳定返回
 * HTTP 500（本机 curl 复现，与登录态无关），导致前端「歌曲 / 歌词」搜索整链 500。
 * 改走 Web 端 `u.y.qq.com/cgi-bin/musicu.fcg` 的
 * music.search.SearchCgiService / DoSearchForQQMusicDesktop（与 getSearchByType 同通道）。
 *
 * 为让前端零改动，这里把 musicu 的「详情格式」响应规整回老的 client_search_cp 信封：
 *   { code:0, data:{ song:{list,totalnum,cur_page} | lyric:{list,...}, zhida:{zhida_singer} } }
 * 即 api.normalizeSong / extractTypeList(res,'song'|'lyric') / singerMid() 读取的老形态。
 *
 * musicu search_type 与老接口 t 对齐：0 歌曲 / 7 歌词（其余类型由 getSearchByType 承担）。
 * 注：musicu 匿名请求易被风控（req_search.code=2001），带登录 cookie 基本稳定；
 * 2001 时最多重试 2 次（间隔 300ms）。num_per_page 实测 >50 会返回空，钳制到 50。
 * 参考逆向来源：jsososo/QQMusicApi issue #160、Rain120/qq-music-api issue #82。
 */

interface GetSearchByKeyParams {
  method?: string;
  params?: Record<string, unknown>;
  option?: object;
}

/** musicu 单页歌曲上限（实测 >50 整页返回空） */
const MAX_PAGE = 50;

/** musicu「详情格式」歌曲项 → 老 client_search_cp「扁平搜索格式」项 */
function mapSong(s: any) {
  const album = s.album || {};
  const pay = s.pay || {};
  const file = s.file || {};
  return {
    songmid: s.mid || '',
    songid: s.id || 0,
    songname: s.name || s.title || '',
    // 老搜索格式 singer 为 [{mid,name}] 数组，musicu 同款，直接归一化字段名
    singer: (Array.isArray(s.singer) ? s.singer : []).map((x: any) => ({
      mid: x.mid || '',
      name: x.name || x.title || '',
    })),
    albummid: album.mid || '',
    albumname: album.name || album.title || '',
    interval: s.interval || 0,
    language: s.language,
    genre: s.genre,
    // 老搜索用 pay.payplay/payalbum，musicu 用 pay.play/pay.album（下划线）
    pay: { payplay: pay.pay_play || 0, payalbum: pay.pay_album || 0 },
    // 音质大小/媒体 mid 透传 file（extractSizes 与 mediaId 均按 file.* 兜底）
    strMediaMid: file.media_mid || s.strMediaMid || '',
    file,
  };
}

/** 歌词命中片段：优先带 <em> 高亮的 lyric_hilight，回落 lyric；按行拆成数组（normalizeLyricItem 会去标签拼接） */
function lyricContent(s: any): string[] {
  const raw = s.lyric_hilight || s.lyric || '';
  if (!raw || typeof raw !== 'string') return [];
  return raw
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
}

/** musicu 歌手直达（body.zhida.list）→ 老信封 data.zhida.zhida_singer（singerMid 只读 singerMID） */
function mapZhida(body: any) {
  const list = Array.isArray(body.zhida?.list) ? body.zhida.list : [];
  const hit =
    list.find((z: any) => (z.custom_info?.from || z.from) === 'singer') ||
    (list[0]?.custom_info ? list[0] : null);
  if (!hit) return null;
  const ci = hit.custom_info || {};
  const mid = ci.mid || hit.mid || '';
  if (!mid) return null;
  return {
    zhida_singer: {
      singerMID: mid,
      singerID: Number(ci.parent_ids || hit.id) || 0,
      singerName: String(hit.title || ci.one_line_desc || '').replace(/^歌手[:：]\s*/, ''),
    },
  };
}

export default async ({ params = {} }: GetSearchByKeyParams) => {
  const key = params.w as string;
  const st = Number(params.t) || 0; // 0 歌曲 / 7 歌词
  const numPerPage = Math.min(MAX_PAGE, Math.max(1, Number(params.n) || 20));
  const pageNum = Math.max(1, Number(params.p) || 1);

  const data = {
    comm: { ct: 19, cv: 1859, uin: getRequestUin(), format: 'json' },
    req_search: {
      module: 'music.search.SearchCgiService',
      method: 'DoSearchForQQMusicDesktop',
      param: {
        search_type: st,
        query: key,
        page_num: pageNum,
        num_per_page: numPerPage,
        highlight: 1,
      },
    },
  };

  logServiceRequest('getSearchByKey', '/cgi-bin/musicu.fcg', { search_type: st, query: key });

  // 把 musicu 响应规整成老的 client_search_cp 信封，供前端 extractTypeList/normalizeSong 直接消费
  const toEnvelope = (body: any) => {
    const items = Array.isArray(body.song?.list) ? body.song.list : [];
    const total = Number(body.song?.sum ?? body.song?.totalnum) || items.length;
    const songList = items.map(mapSong);
    const payload: any = { code: 0, data: { cur_page: pageNum } };
    if (st === 7) {
      payload.data.lyric = {
        list: items.map((s: any) => ({ ...mapSong(s), content: lyricContent(s) })),
        totalnum: total,
        cur_page: pageNum,
      };
    } else {
      payload.data.song = { list: songList, totalnum: total, cur_page: pageNum };
    }
    const zhida = mapZhida(body);
    if (zhida) payload.data.zhida = zhida;
    return payload;
  };

  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 300));
    try {
      // 必须 POST JSON（GET + data 会被风控拦成 code 2001 / 空列表）
      const res = await axios.post('https://u.y.qq.com/cgi-bin/musicu.fcg', data, {
        headers: {
          'Content-Type': 'application/json',
          Referer: 'https://y.qq.com/',
          Cookie: getRequestCookie(),
        },
        timeout: 10000,
      });
      const rs = res.data?.req_search || {};
      if (rs.code === 2001) continue; // 风控拦截：稍后重试
      const body = rs.data?.body || {};
      const response = toEnvelope(body);
      logServiceSuccess('getSearchByKey', '/cgi-bin/musicu.fcg', response, {
        keyword: typeof key === 'string' ? key : undefined,
      });
      return { status: 200, body: { response } };
    } catch (error) {
      logServiceFailure('getSearchByKey', '/cgi-bin/musicu.fcg', error, { keyword: key });
      return { status: 500, body: { error } };
    }
  }

  // 三次仍被风控：返回空的合法信封（前端显示「没有找到相关」而非报错）
  logServiceFailure(
    'getSearchByKey',
    '/cgi-bin/musicu.fcg',
    new Error('risk control 2001 after 3 attempts'),
    { keyword: key },
  );
  return { status: 200, body: { response: toEnvelope({}) } };
};
