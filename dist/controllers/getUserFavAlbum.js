"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const services_1 = __importDefault(require("../services"));
const { getUserFavAlbum } = services_1.default;
/**
 * getUserFavAlbum - 收藏专辑列表（个人主页「我喜欢」→ 专辑）
 * GET /getUserFavAlbum?sin=0&num=100
 * 整理为与 getUserFavDiss 同构的结构：albummid/title/singername/picurl/pubtime，
 * 前端个人主页「我喜欢」专辑标签可直接复用歌单卡片渲染（点击打开专辑页）。
 */
exports.default = async (ctx) => {
    const sin = Number(ctx.query.sin) || 0;
    const num = Math.min(Math.max(Number(ctx.query.num) || 100, 1), 200);
    const { status, body } = await getUserFavAlbum({ sin, num });
    const d = body.response?.data || {};
    ctx.status = status;
    ctx.body = {
        response: {
            code: body.response?.code ?? -1,
            data: {
                total: d.totalalb ?? d.total ?? d.totalalbum ?? 0,
                albumlist: (d.albumlist || d.albumList || d.cdlist || []).map((a) => ({
                    albummid: String(a.albummid ?? a.albumMid ?? a.mid ?? ''),
                    title: a.albumname || a.album_name || a.albumName || a.name || '',
                    singername: a.singername || a.singer_name || a.singerName || '',
                    picurl: a.picurl || a.album_pic || a.albumPic || a.imgurl || a.logo || '',
                    pubtime: String(a.pubtime ?? a.public_time ?? a.aDate ?? a.date ?? ''),
                })),
            },
        },
    };
};
