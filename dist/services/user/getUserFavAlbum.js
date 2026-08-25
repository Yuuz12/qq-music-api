"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const requestCredential_1 = require("../../util/requestCredential");
exports.default = async ({ sin = 0, num = 100 } = {}) => {
    try {
        const res = await axios_1.default.get('https://c.y.qq.com/fav/fcgi-bin/fcg_get_profile_order_asset.fcg', {
            params: {
                ct: 20,
                cid: 205360956,
                userid: (0, requestCredential_1.getRequestUin)(),
                reqtype: 2,
                sin,
                ein: sin + num - 1,
                format: 'json',
                outCharset: 'utf-8',
            },
            headers: {
                Referer: 'https://y.qq.com/',
                Cookie: (0, requestCredential_1.getRequestCookie)(),
            },
            timeout: 10000,
        });
        return {
            status: 200,
            body: {
                response: res.data || {},
            },
        };
    }
    catch (error) {
        return {
            status: 500,
            body: {
                response: {
                    code: -1,
                    error: String(error),
                },
            },
        };
    }
};
