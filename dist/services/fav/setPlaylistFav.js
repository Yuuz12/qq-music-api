"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const logger_1 = require("../../util/logger");
const proxyError_1 = require("../../util/proxyError");
const requestCredential_1 = require("../../util/requestCredential");
const PROXY_URL = process.env.PROXY_URL || 'http://localhost:9339';
exports.default = async ({ disstid = '', isFan = false } = {}) => {
    const tid = String(disstid ?? '').trim();
    if (!tid) {
        return {
            status: 400,
            body: {
                response: { code: -1, message: 'disstid is required' },
            },
        };
    }
    try {
        const reqCookie = (0, requestCredential_1.getRequestCookie)();
        const reqUin = (0, requestCredential_1.getRequestUin)();
        const payload = {
            disstid: tid,
            isFan,
        };
        // 多用户：把当前请求的凭据一并转发给代理，代理按 cookie 切换登录态
        if (reqCookie)
            payload.cookie = reqCookie;
        if (reqUin && reqUin !== '0')
            payload.uin = reqUin;
        const res = await axios_1.default.post(`${PROXY_URL}/playlist-fav-write`, payload, {
            timeout: 45000, // 前端 30s 兜底；这里 45s 保证官方页面初始化不被打断
            headers: { 'Content-Type': 'application/json' },
        });
        const proxy = res.data || {};
        // 代理返回 { ok, code, msg, error, raw }；code 为上游 req_1.code（0 成功）
        return {
            status: 200,
            body: {
                response: {
                    code: proxy.code ?? -1,
                    message: proxy.msg || proxy.error,
                    data: proxy.raw ? { raw: proxy.raw } : undefined,
                },
            },
        };
    }
    catch (error) {
        const msg = (0, proxyError_1.proxyFailureText)(error);
        logger_1.logger.error('[setPlaylistFav] proxy call failed:', error instanceof Error ? error.message : error);
        return {
            status: 500,
            body: {
                response: {
                    code: -1,
                    error: msg,
                },
            },
        };
    }
};
