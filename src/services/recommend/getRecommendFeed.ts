import axios from 'axios';
import { logger } from '../../util/logger';
import qqSign from '../../util/qqSign';
import { getRequestCookie, getRequestUin } from '../../util/requestCredential';

/**
 * getRecommendFeed - 首页「为你推荐」个性化推荐流
 *
 * 上游 music.recommend.RecommendFeed / get_recommend_feed（QQ 音乐 App/PC 客户端
 * 「推荐」页同源；请求形态经 PC 客户端 Frida+CDP 抓包确认，见用户抓包笔记
 * qqmusic-capture/API-NOTES.md，2026-08 实测）。
 *
 * 客户端通道要点（实测对比得出）：
 * - 走 POST musics.fcg + zzc 签名（util/qqSign），抓包同款；
 * - comm.platform='wk_v17' 是关键：返回 4 个版块约 62 卡（含 13 张个性化歌单卡、
 *   每日30首、听歌排行、歌曲列表等）；缺省时回落为通用形态（11 卡 7 歌单）；
 * - uid/guid/g_tk 实测均可省略（服务器按 cookie 识别用户），多用户适配友好；
 * - param 需带 v_uniq: []（与 v_cache/s_num 同为客户端翻页去重参数）。
 *
 * 卡片内容随登录用户口味变化：带 cookie 个性化（含每日30首与推荐理由），
 * 不带为通用热门内容。
 *
 * 翻页（自 PC 客户端 wk_v20 recommend chunk 逆向，实测有效）：
 * - direction = page===1 ? 0 : 1；
 * - v_cache / v_uniq 恒为 []（传内容反而 500020）；
 * - s_num = **已加载的版块（v_shelf）数量**（不是卡片数）；
 * - 每页结果拼入后，load_mark===0 继续 page++，非 0 表示到底。
 * 完整 feed 含「歌单遨游指南」(shelf 205)、「听「xx」也会喜欢💗」歌曲版块 (shelf 207) 等。
 */

export interface RecommendFeedCard {
  /** 歌单 disstid / 歌曲 songid（数字字符串） */
  id: string;
  title: string;
  /** 卡片跳转类型：10014=歌单，10046=歌曲 */
  jumptype: number;
  /** 卡片子类型：510=每日30首 */
  subtype: number;
  cnt?: number;
  cover?: string;
  /** 歌曲卡经 CgiGetTrackInfo 补全的 track_info（mid/singer/album/pay/file，与搜索结果同构） */
  track?: {
    mid?: string;
    id?: number;
    name?: string;
    singer?: Array<{ mid?: string; name?: string; title?: string }>;
    album?: { mid?: string; name?: string };
    pay?: Record<string, unknown>;
    file?: { media_mid?: string };
    [key: string]: unknown;
  };
  miscellany?: {
    cnt_content?: string;
    fav_cnt_content?: string;
    rcmd_reason?: string;
    rcmdcontent?: string;
    rcmdtemplate?: string;
    [key: string]: unknown;
  };
}

export interface RecommendFeedShelf {
  id?: number | string;
  /** 版块标题模板，如「歌单遨游指南」「听「{String}」也会喜欢💗」 */
  title_template?: string;
  /** 标题参数（用户名/种子歌名等），填入模板的 {String} */
  title_content?: string;
  style?: number;
  v_niche?: Array<{ v_card?: RecommendFeedCard[] }>;
}

interface RecommendFeedUpstream {
  code?: number;
  req_1?: RecommendFeedUpstreamInner;
  req1?: RecommendFeedUpstreamInner;
}

interface RecommendFeedUpstreamInner {
  code?: number;
  data?: {
    load_mark?: number;
    v_shelf?: RecommendFeedShelf[];
  };
}

/** 翻页页数上限（客户端无上限，纯兜底防死循环） */
const MAX_PAGES = 5;

/** 单次批量解析歌曲上限（客户端一轮 9 首，这里放宽） */
const TRACK_BATCH = 30;

export default async () => {
  const cookie = getRequestCookie();
  const uin = getRequestUin();
  const comm = {
    format: 'json',
    ct: 20,
    cv: 2252,
    // wk_v17：PC 客户端内嵌页平台标识，决定返回客户端形态（版块更全、歌单卡更多）
    platform: 'wk_v17',
    inCharset: 'utf-8',
    outCharset: 'utf-8',
    notice: 0,
    needNewCode: 1,
    uin: Number(uin) || 0,
  };

  try {
    const shelves: RecommendFeedShelf[] = [];
    let page = 1;
    let loadedShelves = 0;
    let loadMark = 0;
    let code: number | undefined = -1;

    // 客户端翻页循环：load_mark===0 继续拉，非 0 到底
    do {
      const body = {
        comm,
        req_1: {
          module: 'music.recommend.RecommendFeed',
          method: 'get_recommend_feed',
          param: {
            direction: page === 1 ? 0 : 1,
            page,
            v_cache: [],
            v_uniq: [],
            s_num: loadedShelves,
          },
        },
      };
      const sign = qqSign(body);
      const res = await axios.post(
        `https://u6.y.qq.com/cgi-bin/musics.fcg?_=${Date.now()}&sign=${sign}`,
        body,
        {
          headers: {
            'Content-Type': 'application/json',
            ...(cookie ? { Cookie: cookie } : {}),
            Referer: 'https://y.qq.com/',
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
          },
          timeout: 10000,
        },
      );
      const up = (res.data || {}) as RecommendFeedUpstream;
      const inner = up.req_1 || up.req1;
      code = inner?.code ?? -1;
      const pageShelves = inner?.data?.v_shelf || [];
      shelves.push(...pageShelves);
      loadedShelves += pageShelves.length;
      loadMark = inner?.data?.load_mark ?? 0;
      page++;
      if (pageShelves.length) await new Promise((r) => setTimeout(r, 150)); // 轻微间隔，避免连发
    } while (loadMark === 0 && page <= MAX_PAGES);

    // 歌曲卡（jumptype 10046）仅含 songid/title/cover：按客户端同款
    // CgiGetTrackInfo(types=200) 批量补全 track_info（mid/singer/album/pay），供前端直接点播
    const songCards = shelves
      .flatMap((s) => (s.v_niche || []).flatMap((n) => n.v_card || []))
      .filter((c) => c.jumptype === 10046 && /^\d+$/.test(String(c.id || '')));
    for (let i = 0; i < songCards.length; i += TRACK_BATCH) {
      const batch = songCards.slice(i, i + TRACK_BATCH);
      const ids = batch.map((c) => Number(c.id));
      try {
        const infoBody = {
          comm,
          req_1: {
            module: 'music.trackInfo.UniformRuleCtrl',
            method: 'CgiGetTrackInfo',
            param: { ids, types: ids.map(() => 200), source: 'AiNoFree' },
          },
        };
        const infoSign = qqSign(infoBody);
        const infoRes = await axios.post(
          `https://u6.y.qq.com/cgi-bin/musics.fcg?_=${Date.now()}&sign=${infoSign}`,
          infoBody,
          {
            headers: {
              'Content-Type': 'application/json',
              ...(cookie ? { Cookie: cookie } : {}),
              Referer: 'https://y.qq.com/',
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
            },
            timeout: 10000,
          },
        );
        const infoUp = (infoRes.data || {}) as RecommendFeedUpstream;
        const infoInner = infoUp.req_1 || infoUp.req1;
        const infoData = (infoInner?.data || {}) as {
          tracks?: RecommendFeedCard['track'][];
          [key: string]: unknown;
        };
        // 响应 data.tracks：与 ids 顺序一一对应的 track_info 数组
        const tracks = Array.isArray(infoData.tracks) ? infoData.tracks : [];
        for (let k = 0; k < batch.length; k++) {
          const track = tracks[k];
          if (track) batch[k].track = track;
        }
      } catch (error) {
        // 补全失败不影响版块返回：歌曲卡仍可展示（前端无法点播）
        logger.warn('getRecommendFeed: 歌曲信息补全失败', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return {
      status: 200,
      body: {
        response: {
          code,
          data: {
            v_shelf: shelves,
            // 是否个性化：带登录凭据时上游按口味返回（含每日30首与推荐理由）
            personalized: !!cookie,
          },
        },
      },
    };
  } catch (error) {
    logger.error('getRecommendFeed: 请求异常', {
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      status: 500,
      body: {
        response: {
          code: -1,
          data: { v_shelf: [], personalized: !!cookie },
        },
      },
    };
  }
};
