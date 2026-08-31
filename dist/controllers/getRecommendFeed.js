"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const services_1 = __importDefault(require("../services"));
const { getRecommendFeed } = services_1.default;
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
exports.default = async (ctx) => {
    const { status, body } = await getRecommendFeed();
    const d = body.response?.data || {};
    const shelves = (d.v_shelf || []);
    const cardsOf = (s) => (s.v_niche || []).flatMap((n) => n.v_card || []);
    const renderTitle = (s) => {
        const tpl = String(s.title_template || '');
        const arg = String(s.title_content || '');
        if (!tpl)
            return arg;
        return tpl.includes('{String}') && arg ? tpl.replace('{String}', arg) : arg || tpl;
    };
    const toPlaylist = (c) => {
        const reasonTpl = c.miscellany?.rcmdtemplate || '';
        const reasonArg = c.miscellany?.rcmdcontent || '';
        return {
            disstid: String(c.id),
            title: c.title || '',
            cover: String(c.cover || '').replace(/^http:\/\//i, 'https://'),
            playcnt: c.cnt || 0,
            playcntText: c.miscellany?.cnt_content || '',
            reason: reasonTpl && reasonArg
                ? reasonTpl.replace('{String}', reasonArg)
                : c.miscellany?.rcmd_reason || '',
            type: c.subtype === 510 ? 'daily' : 'playlist',
        };
    };
    const toSong = (c) => {
        // 封面升级：feed 卡片自带 150x150 预览图，当歌单卡封面太糊——
        // 优先用补全 track 里的专辑 mid 拼标准 300x300 封面，否则原样替换 URL 尺寸段
        const albumMid = c.track?.album?.mid;
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
            // 只保留歌单卡：jumptype 10014 + 纯数字 disstid + 有标题；排除每日30首无标题续卡(511)
            .filter((c) => c.jumptype === 10014 &&
            /^\d+$/.test(String(c.id || '')) &&
            !!c.title &&
            c.subtype !== 511)
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
