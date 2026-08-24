"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const services_1 = __importDefault(require("../services"));
const { setFav } = services_1.default;
/**
 * setFav - 添加/取消喜欢（猜你喜欢页「喜欢」按钮）
 * 用法：POST /setFav
 * body: { dirId?: 201, songs: [{ songId, songType? }], isFan?: false }
 * isFan=false → AddSonglist（添加到「我喜欢」）；isFan=true → DelSonglist（取消喜欢）
 */
exports.default = async (ctx) => {
    const body = ctx.request.body || {};
    const songs = Array.isArray(body.songs) ? body.songs : [];
    if (!songs.length) {
        ctx.status = 400;
        ctx.body = { response: { code: -1, message: 'songs is required' } };
        return;
    }
    const { status, body: result } = await setFav({
        dirId: body.dirId,
        songs,
        isFan: Boolean(body.isFan),
    });
    // 统一响应：把 musicu.fcg 的 req_0 数据提升到 response.data
    const resp = result.response;
    const upstream = resp?.req_0 || resp?.[0] || null;
    ctx.status = status;
    ctx.body = {
        response: {
            code: upstream ? upstream.code : (resp?.code ?? -1),
            data: upstream ? upstream.data : null,
            message: upstream?.message || resp?.error || resp?.message || undefined,
        },
    };
};
