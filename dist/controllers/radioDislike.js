"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const services_1 = __importDefault(require("../services"));
const { radioDislike } = services_1.default;
/**
 * radioDislike - 电台「删除」按钮（暂时不再播放）的接口还原
 * 用法：POST /radioDislike
 * body: { radioId?: 99, songId, songType?: 0 }
 *
 * 网页端「删除」按钮实际只发送一条统计上报（fcg_val_report.fcg），
 * 真正把歌曲从播放队列剔除是在浏览器本地完成的（提示「该歌曲将暂时不再播放」）。
 * 因此本接口只复刻统计上报，调用方仍需在前端本地移除歌曲并切到下一首。
 */
exports.default = async (ctx) => {
    const body = ctx.request.body || {};
    const songId = body.songId;
    if (songId === undefined || songId === null || songId === '') {
        ctx.status = 400;
        ctx.body = { response: { code: -1, message: 'songId is required' } };
        return;
    }
    const { status, body: result } = await radioDislike({
        radioId: body.radioId,
        songId: songId,
        songType: body.songType,
    });
    ctx.status = status;
    ctx.body = {
        response: result.response || { code: -1 },
    };
};
