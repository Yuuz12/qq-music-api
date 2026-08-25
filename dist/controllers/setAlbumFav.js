"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const services_1 = __importDefault(require("../services"));
const { setAlbumFav } = services_1.default;
/**
 * setAlbumFav - 收藏/取消收藏专辑
 * 用法：POST /setAlbumFav
 * body: { albumMid: '0016l2F430zMux', isFan?: false }
 * isFan=false → FavAlbum（收藏）；isFan=true → CancelFavAlbum（取消收藏）
 */
exports.default = async (ctx) => {
    const body = ctx.request.body || {};
    const albumMid = String(body.albumMid ?? '').trim();
    if (!albumMid) {
        ctx.status = 400;
        ctx.body = { response: { code: -1, message: 'albumMid is required' } };
        return;
    }
    const { status, body: result } = await setAlbumFav({
        albumMid,
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
