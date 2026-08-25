"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const services_1 = __importDefault(require("../services"));
const { setPlaylistFav } = services_1.default;
/**
 * setPlaylistFav - 收藏/取消收藏歌单
 * 用法：POST /setPlaylistFav
 * body: { disstid: '7011264340', isFan?: false }
 * isFan=false → FavPlaylist（收藏）；isFan=true → CancelFavPlaylist（取消收藏）
 */
exports.default = async (ctx) => {
    const body = ctx.request.body || {};
    const disstid = String(body.disstid ?? '').trim();
    if (!disstid) {
        ctx.status = 400;
        ctx.body = { response: { code: -1, message: 'disstid is required' } };
        return;
    }
    const { status, body: result } = await setPlaylistFav({
        disstid,
        isFan: Boolean(body.isFan),
    });
    // 统一响应：把代理返回的 code/message/data 透出
    const resp = result.response;
    ctx.status = status;
    ctx.body = {
        response: {
            code: resp?.code ?? -1,
            data: resp?.data ?? null,
            message: resp?.message || resp?.error || undefined,
        },
    };
};
