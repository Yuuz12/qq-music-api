"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const observability_1 = require("../../util/observability");
const requestCredential_1 = require("../../util/requestCredential");
/** musicu 单页歌曲上限（实测 >50 整页返回空） */
const MAX_PAGE = 50;
/** musicu「详情格式」歌曲项 → 老 client_search_cp「扁平搜索格式」项 */
function mapSong(s) {
    const album = s.album || {};
    const pay = s.pay || {};
    const file = s.file || {};
    return {
        songmid: s.mid || '',
        songid: s.id || 0,
        songname: s.name || s.title || '',
        // 老搜索格式 singer 为 [{mid,name}] 数组，musicu 同款，直接归一化字段名
        singer: (Array.isArray(s.singer) ? s.singer : []).map((x) => ({
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
function lyricContent(s) {
    const raw = s.lyric_hilight || s.lyric || '';
    if (!raw || typeof raw !== 'string')
        return [];
    return raw
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);
}
/** musicu 歌手直达（body.zhida.list）→ 老信封 data.zhida.zhida_singer（singerMid 只读 singerMID） */
function mapZhida(body) {
    const list = Array.isArray(body.zhida?.list) ? body.zhida.list : [];
    const hit = list.find((z) => (z.custom_info?.from || z.from) === 'singer') ||
        (list[0]?.custom_info ? list[0] : null);
    if (!hit)
        return null;
    const ci = hit.custom_info || {};
    const mid = ci.mid || hit.mid || '';
    if (!mid)
        return null;
    return {
        zhida_singer: {
            singerMID: mid,
            singerID: Number(ci.parent_ids || hit.id) || 0,
            singerName: String(hit.title || ci.one_line_desc || '').replace(/^歌手[:：]\s*/, ''),
        },
    };
}
exports.default = async ({ params = {} }) => {
    const key = params.w;
    const st = Number(params.t) || 0; // 0 歌曲 / 7 歌词
    const numPerPage = Math.min(MAX_PAGE, Math.max(1, Number(params.n) || 20));
    const pageNum = Math.max(1, Number(params.p) || 1);
    const data = {
        comm: { ct: 19, cv: 1859, uin: (0, requestCredential_1.getRequestUin)(), format: 'json' },
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
    (0, observability_1.logServiceRequest)('getSearchByKey', '/cgi-bin/musicu.fcg', { search_type: st, query: key });
    // 把 musicu 响应规整成老的 client_search_cp 信封，供前端 extractTypeList/normalizeSong 直接消费
    const toEnvelope = (body) => {
        const items = Array.isArray(body.song?.list) ? body.song.list : [];
        const total = Number(body.song?.sum ?? body.song?.totalnum) || items.length;
        const songList = items.map(mapSong);
        const payload = { code: 0, data: { cur_page: pageNum } };
        if (st === 7) {
            payload.data.lyric = {
                list: items.map((s) => ({ ...mapSong(s), content: lyricContent(s) })),
                totalnum: total,
                cur_page: pageNum,
            };
        }
        else {
            payload.data.song = { list: songList, totalnum: total, cur_page: pageNum };
        }
        const zhida = mapZhida(body);
        if (zhida)
            payload.data.zhida = zhida;
        return payload;
    };
    for (let attempt = 0; attempt < 3; attempt++) {
        if (attempt > 0)
            await new Promise((r) => setTimeout(r, 300));
        try {
            // 必须 POST JSON（GET + data 会被风控拦成 code 2001 / 空列表）
            const res = await axios_1.default.post('https://u.y.qq.com/cgi-bin/musicu.fcg', data, {
                headers: {
                    'Content-Type': 'application/json',
                    Referer: 'https://y.qq.com/',
                    Cookie: (0, requestCredential_1.getRequestCookie)(),
                },
                timeout: 10000,
            });
            const rs = res.data?.req_search || {};
            if (rs.code === 2001)
                continue; // 风控拦截：稍后重试
            const body = rs.data?.body || {};
            const response = toEnvelope(body);
            (0, observability_1.logServiceSuccess)('getSearchByKey', '/cgi-bin/musicu.fcg', response, {
                keyword: typeof key === 'string' ? key : undefined,
            });
            return { status: 200, body: { response } };
        }
        catch (error) {
            (0, observability_1.logServiceFailure)('getSearchByKey', '/cgi-bin/musicu.fcg', error, { keyword: key });
            return { status: 500, body: { error } };
        }
    }
    // 三次仍被风控：返回空的合法信封（前端显示「没有找到相关」而非报错）
    (0, observability_1.logServiceFailure)('getSearchByKey', '/cgi-bin/musicu.fcg', new Error('risk control 2001 after 3 attempts'), { keyword: key });
    return { status: 200, body: { response: toEnvelope({}) } };
};
