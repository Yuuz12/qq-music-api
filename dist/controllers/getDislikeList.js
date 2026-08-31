"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const services_1 = __importDefault(require("../services"));
const { getDislikeList } = services_1.default;
/**
 * getDislikeList - 不喜欢（黑名单）列表（需登录凭据）
 * GET /getDislikeList
 */
exports.default = async (ctx) => {
    const { status, body: resp } = await getDislikeList();
    const d = resp.response?.req_0?.data || {};
    const code = resp.response?.code ?? -1;
    ctx.status = status;
    ctx.body = {
        response: {
            code,
            data: d,
            message: resp.response?.message || undefined,
        },
    };
};
