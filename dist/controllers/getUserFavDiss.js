"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const services_1 = __importDefault(require("../services"));
const { getUserFavDiss } = services_1.default;
/**
 * getUserFavDiss - 收藏歌单列表
 * GET /getUserFavDiss?sin=0&num=100
 * 整理为与 getUserProfile.disslist 同构的结构（dissid/title/picurl/subtitle），
 * 前端个人主页「收藏歌单」标签可直接复用同一套歌单卡片渲染。
 */
exports.default = async (ctx) => {
    const sin = Number(ctx.query.sin) || 0;
    const num = Math.min(Math.max(Number(ctx.query.num) || 100, 1), 200);
    const { status, body } = await getUserFavDiss({ sin, num });
    const d = body.response?.data || {};
    ctx.status = status;
    ctx.body = {
        response: {
            code: body.response?.code ?? -1,
            data: {
                total: d.totaldiss ?? 0,
                disslist: (d.cdlist || []).map((s) => ({
                    // 打开歌单详情用 disstid：兼容多种字段命名（tid/dirid 为系统列表兜底）
                    dissid: String(s.disstid ?? s.dissid ?? s.tid ?? s.dirid ?? ''),
                    title: s.dissname || s.diss_name || '',
                    picurl: s.picurl || s.imgurl || s.diss_cover || s.logo || '',
                    subtitle: s.nickname ? `by ${s.nickname}` : '',
                })),
            },
        },
    };
};
