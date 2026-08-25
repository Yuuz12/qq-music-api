"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const services_1 = __importDefault(require("../services"));
const { getIsPlaylistFan } = services_1.default;
/**
 * getIsPlaylistFan - 批量查询歌单收藏状态（歌单详情页「收藏」按钮高亮）
 * 用法：POST /getIsPlaylistFan
 * body: { disstids: ['7011264340', ...] }
 * 响应 data: { m_fan: { [disstid]: 1 | 0 } }
 */
exports.default = async (ctx) => {
    const body = ctx.request.body || {};
    const disstids = Array.isArray(body.disstids)
        ? body.disstids
        : [];
    if (!disstids.length) {
        ctx.status = 400;
        ctx.body = { response: { code: -1, message: 'disstids is required' } };
        return;
    }
    const { status, body: result } = await getIsPlaylistFan({ disstids });
    // 统一响应：把 musicu.fcg 的 req_0 数据提升到 response.data
    const upstream = result.response.req_0 || null;
    ctx.status = status;
    ctx.body = {
        response: {
            code: upstream ? upstream.code : result.response.code,
            data: upstream?.data ?? null,
            // 服务层失败（如上游网络错误/414）时透出原因，便于前端与 Explorer 排查
            message: result.response.message || undefined,
        },
    };
};
