import { Context } from 'koa';
import services from '../services';

const { getRecommendFeed } = services;

/**
 * getRecommendFeed - 首页「为你推荐」个性化推荐流（分版块）
 * GET /getRecommendFeed
 *
 * 上游 music.recommend.RecommendFeed/get_recommend_feed（App 推荐页同源，含翻页）。
 * 按 v_shelf 归一化为 sections，title 由 title_template 渲染（{String} ← title_content）：
 * - type=playlist：歌单版块（「你的歌单宝藏库」「歌单遨游指南」等）
 * - type=song：歌曲版块（「『xx』，这是你的今日好歌📬」「听「xx」也会喜欢💗」），
 *   卡片仅含 songid/title/cover，前端可用 getSongInfo?songid= 解析后播放
 * - type=entry：功能入口版块（每日30首/猜你喜欢等，type=daily 的为每日30首）
 * - type=other：有声书/播客等非音乐版块（前端可跳过）
 * 另输出扁平 list（全部歌单卡）兼容旧前端。
 */
export default async (ctx: Context) => {
  const { status, body } = await getRecommendFeed();
  const d = body.response?.data || {};

  interface RawCard {
    id?: string | number;
    title?: string;
    jumptype?: number;
    subtype?: number;
    cnt?: number;
    cover?: string;
    subtitle?: string;
    miscellany?: {
      cnt_content?: string;
      fav_cnt_content?: string;
      rcmd_reason?: string;
      rcmdcontent?: string;
      rcmdtemplate?: string;
    };
  }
  interface RawShelf {
    id?: number | string;
    title_template?: string;
    title_content?: string;
    style?: number;
    v_niche?: Array<{ v_card?: RawCard[] }>;
  }

  const shelves = (d.v_shelf || []) as RawShelf[];
  const cardsOf = (s: RawShelf) => (s.v_niche || []).flatMap((n) => n.v_card || []);

  const renderTitle = (s: RawShelf) => {
    const tpl = String(s.title_template || '');
    const arg = String(s.title_content || '');
    if (!tpl) return arg;
    return tpl.includes('{String}') && arg ? tpl.replace('{String}', arg) : arg || tpl;
  };

  const toPlaylist = (c: RawCard) => {
    const reasonTpl = c.miscellany?.rcmdtemplate || '';
    const reasonArg = c.miscellany?.rcmdcontent || '';
    return {
      disstid: String(c.id),
      title: c.title || '',
      cover: String(c.cover || '').replace(/^http:\/\//i, 'https://'),
      playcnt: c.cnt || 0,
      playcntText: c.miscellany?.cnt_content || '',
      reason:
        reasonTpl && reasonArg
          ? reasonTpl.replace('{String}', reasonArg)
          : c.miscellany?.rcmd_reason || '',
      // 官方入口卡（百万收藏/新歌推荐）的副标题=当日第一首歌（客户端同款展示）
      subtitle: String(c.subtitle || ''),
      subtype: c.subtype || 0,
      type: c.subtype === 510 ? 'daily' : 'playlist',
    };
  };

  const toSong = (c: RawCard & { track?: Record<string, unknown> }) => {
    // 封面升级：feed 卡片自带 150x150 预览图，当歌单卡封面太糊——
    // 优先用补全 track 里的专辑 mid 拼标准 300x300 封面，否则原样替换 URL 尺寸段
    const albumMid = (c.track?.album as { mid?: string } | undefined)?.mid;
    const rawCover = String(c.cover || '').replace(/^http:\/\//i, 'https://');
    const cover = albumMid
      ? `https://y.gtimg.cn/music/photo_new/T002R300x300M000${albumMid}.jpg`
      : rawCover.replace('150x150', '300x300');
    return {
      songid: String(c.id),
      title: c.title || '',
      cover,
      // CgiGetTrackInfo 补全的完整歌曲信息（mid/singer/album/pay/file），前端 normalizeRadioTrack 后可直接播放
      track: c.track || null,
    };
  };

  const sections = shelves.map((s) => {
    const cards = cardsOf(s);
    const playlists = cards
      // 歌单卡：jumptype 10014（普通/每日30首歌单）+ 纯数字 disstid + 有标题（排除每日30首无标题续卡 511）；
      // 官方入口卡：jumptype 3003 + subtype 513（百万收藏 disstid=211111 / 新歌推荐 disstid=211207，
      // 客户端 scheme 直接跳 ui/gedan 歌单页，见抓包样本 resp_023 与 recommend chunk 逆向）
      .filter(
        (c) =>
          ((c.jumptype === 10014 && c.subtype !== 511) ||
            (c.jumptype === 3003 && c.subtype === 513)) &&
          /^\d+$/.test(String(c.id || '')) &&
          !!c.title,
      )
      .map(toPlaylist);
    const songs = cards
      .filter((c) => c.jumptype === 10046 && /^\d+$/.test(String(c.id || '')) && !!c.title)
      .map(toSong);
    const type = songs.length ? 'song' : playlists.length ? 'playlist' : 'other';
    return {
      id: s.id,
      title: renderTitle(s),
      type,
      list: type === 'playlist' ? playlists : [],
      songs: type === 'song' ? songs : [],
    };
  });

  // 扁平歌单列表（兼容旧前端）：全部歌单版块的歌单卡按序合并
  const list = sections.flatMap((s) => s.list);

  // 头部版块兜底：官方 AI 歌单「百万收藏」「新歌推荐」仅登录态由上游返回，
  // 未登录形态缺失（实测 shelf 301 只有每日30首）——按客户端固定 disstid 补齐，
  // 封面取官方运营配置图（CDN 静态资源）；登录态下上游已带则去重跳过
  const headerSection = sections.find((s) => s.type === 'playlist');
  if (headerSection) {
    const officialEntries = [
      {
        disstid: '211111',
        title: '百万收藏',
        cover: 'https://y.gtimg.cn/music/photo_new/T002R300x300M000003odwjd2FrEZn.jpg',
        subtitle: '官方歌单 · 每日更新',
      },
      {
        disstid: '211207',
        title: '新歌推荐',
        cover: 'https://y.gtimg.cn/music/photo_new/T002R300x300M000001a538Y3iiJXf.jpg',
        subtitle: '官方歌单 · 每日更新',
      },
    ];
    for (const e of officialEntries) {
      if (!headerSection.list.some((p) => p.disstid === e.disstid)) {
        headerSection.list.push({
          disstid: e.disstid,
          title: e.title,
          cover: e.cover,
          playcnt: 0,
          playcntText: '',
          reason: '',
          subtitle: e.subtitle,
          subtype: 513,
          type: 'playlist',
        });
      }
    }
  }

  ctx.status = status;
  ctx.body = {
    response: {
      code: body.response?.code ?? -1,
      data: {
        list,
        sections,
        personalized: !!d.personalized,
      },
    },
  };
};
