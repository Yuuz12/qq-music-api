"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const logger_1 = require("../../util/logger");
const qqSign_1 = __importDefault(require("../../util/qqSign"));
const requestCredential_1 = require("../../util/requestCredential");
/** 翻页页数上限（客户端无上限，纯兜底防死循环） */
const MAX_PAGES = 5;
/** 单次批量解析歌曲上限（客户端一轮 9 首，这里放宽） */
const TRACK_BATCH = 30;
exports.default = async () => {
    const cookie = (0, requestCredential_1.getRequestCookie)();
    const uin = (0, requestCredential_1.getRequestUin)();
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
        const shelves = [];
        let page = 1;
        let loadedShelves = 0;
        let loadMark = 0;
        let code = -1;
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
            const sign = (0, qqSign_1.default)(body);
            const res = await axios_1.default.post(`https://u6.y.qq.com/cgi-bin/musics.fcg?_=${Date.now()}&sign=${sign}`, body, {
                headers: {
                    'Content-Type': 'application/json',
                    ...(cookie ? { Cookie: cookie } : {}),
                    Referer: 'https://y.qq.com/',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
                },
                timeout: 10000,
            });
            const up = (res.data || {});
            const inner = up.req_1 || up.req1;
            code = inner?.code ?? -1;
            const pageShelves = inner?.data?.v_shelf || [];
            shelves.push(...pageShelves);
            loadedShelves += pageShelves.length;
            loadMark = inner?.data?.load_mark ?? 0;
            page++;
            if (pageShelves.length)
                await new Promise((r) => setTimeout(r, 150)); // 轻微间隔，避免连发
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
                const infoSign = (0, qqSign_1.default)(infoBody);
                const infoRes = await axios_1.default.post(`https://u6.y.qq.com/cgi-bin/musics.fcg?_=${Date.now()}&sign=${infoSign}`, infoBody, {
                    headers: {
                        'Content-Type': 'application/json',
                        ...(cookie ? { Cookie: cookie } : {}),
                        Referer: 'https://y.qq.com/',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
                    },
                    timeout: 10000,
                });
                const infoUp = (infoRes.data || {});
                const infoInner = infoUp.req_1 || infoUp.req1;
                const infoData = (infoInner?.data || {});
                // 响应 data.tracks：与 ids 顺序一一对应的 track_info 数组
                const tracks = Array.isArray(infoData.tracks) ? infoData.tracks : [];
                for (let k = 0; k < batch.length; k++) {
                    const track = tracks[k];
                    if (track)
                        batch[k].track = track;
                }
            }
            catch (error) {
                // 补全失败不影响版块返回：歌曲卡仍可展示（前端无法点播）
                logger_1.logger.warn('getRecommendFeed: 歌曲信息补全失败', {
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
    }
    catch (error) {
        logger_1.logger.error('getRecommendFeed: 请求异常', {
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
