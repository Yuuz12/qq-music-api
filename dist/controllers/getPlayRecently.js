"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const services_1 = __importDefault(require("../services"));
const getPlayRecently_1 = require("../services/user/getPlayRecently");
const { getPlayRecently } = services_1.default;
/**
 * getPlayRecently - 最近播放列表（云端同步接口，需登录凭据）
 * GET /getPlayRecently?type=2
 * type: 2=歌曲（默认，最近播放页用）/ 3=专辑 / 4=歌单 / 1=全部分类汇总
 * 响应 data: { updateTime, songList: [{ track, lastTime, listenCnt, lastPlayDevice }] }
 * songList 的 track 为上游新格式（mid/name/singer[]/album{}/file{}），前端用
 * normalizeRadioTrack 归一化（同歌单详情）。
 */
exports.default = async (ctx) => {
    const type = Number(ctx.query.type ?? 2);
    if (!(0, getPlayRecently_1.isPlayRecentlyType)(type)) {
        ctx.status = 400;
        ctx.body = {
            response: {
                code: -1,
                message: `invalid type "${ctx.query.type}" (expect 1|2|3|4)`,
            },
        };
        return;
    }
    const { status, body } = await getPlayRecently({ type });
    const d = body.response?.req_0?.data || {};
    const inner = d.data || {};
    ctx.status = status;
    ctx.body = {
        response: {
            code: body.response?.code ?? -1,
            data: {
                updateTime: Number(d.updateTime) || 0,
                // 内层 code:-1 = 参数无效/无云端数据（如未同步过最近播放），透出让前端判别
                innerCode: d.code ?? 0,
                songList: Array.isArray(inner.songList) ? inner.songList : [],
                albumList: Array.isArray(inner.albumList) ? inner.albumList : [],
                geDanList: Array.isArray(inner.geDanList) ? inner.geDanList : [],
            },
            // 服务层失败（上游网络错误等）时透出原因，便于排查
            message: body.response?.message || undefined,
        },
    };
};
