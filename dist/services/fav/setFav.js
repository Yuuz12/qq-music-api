"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_FAV_DIR_ID = void 0;
const axios_1 = __importDefault(require("axios"));
const logger_1 = require("../../util/logger");
const requestCredential_1 = require("../../util/requestCredential");
const proxyError_1 = require("../../util/proxyError");
exports.DEFAULT_FAV_DIR_ID = 201;
const PROXY_URL = process.env.PROXY_URL || 'http://localhost:9339';
exports.default = async ({ dirId = exports.DEFAULT_FAV_DIR_ID, songs = [], isFan = false, } = {}) => {
    const v_songInfo = songs.map(({ songId, songType = 0 }) => ({
        songId,
        songType: Number(songType) || 0,
    }));
    const method = isFan ? 'DelSonglist' : 'AddSonglist';
    try {
        const reqCookie = (0, requestCredential_1.getRequestCookie)();
        const reqUin = (0, requestCredential_1.getRequestUin)();
        const payload = {
            dirId: Number(dirId) || exports.DEFAULT_FAV_DIR_ID,
            method,
            songs: v_songInfo,
        };
        // 多用户：把当前请求的凭据一并转发给代理，代理按 cookie 切换登录态
        if (reqCookie)
            payload.cookie = reqCookie;
        if (reqUin && reqUin !== '0')
            payload.uin = reqUin;
        const res = await axios_1.default.post(`${PROXY_URL}/playlist-write`, payload, {
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
        logger_1.logger.error('[setFav] proxy call failed:', error instanceof Error ? error.message : error);
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
