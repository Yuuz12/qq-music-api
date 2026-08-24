"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const services_1 = __importDefault(require("../services"));
const { getIsSongFan } = services_1.default;
/**
 * getIsSongFan - 批量查询歌曲喜欢状态（红心）
 * 用法：POST /getIsSongFan
 * body: { songmids: ['003rJSwm3TechU', ...] }
 * 响应 data: { m_fan: { [songmid]: 1 | 0 } }
 */
exports.default = async (ctx) => {
    const body = ctx.request.body || {};
    const songmids = Array.isArray(body.songmids) ? body.songmids : [];
    if (!songmids.length) {
        ctx.status = 400;
        ctx.body = { response: { code: -1, message: 'songmids is required' } };
        return;
    }
    const { status, body: result } = await getIsSongFan({ songmids });
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
