"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const services_1 = __importDefault(require("../services"));
const { cancelDislike } = services_1.default;
/**
 * cancelDislike - 取消不喜欢，从黑名单恢复（需登录凭据）
 * POST /cancelDislike  body: { songId }
 * 响应 data.innerCode === 0 表示成功
 */
exports.default = async (ctx) => {
    const body = ctx.request.body || {};
    const songId = Number(body.songId);
    if (!songId) {
        ctx.status = 400;
        ctx.body = { response: { code: -1, message: 'songId is required' } };
        return;
    }
    const { status, body: resp } = await cancelDislike(songId);
    const d = resp.response?.req_0?.data || {};
    const code = resp.response?.code ?? -1;
    ctx.status = status;
    ctx.body = {
        response: {
            code,
            data: {
                innerCode: d.code ?? d.ret ?? 0,
            },
            message: resp.response?.message || undefined,
        },
    };
};
