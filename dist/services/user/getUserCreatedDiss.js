"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const requestCredential_1 = require("../../util/requestCredential");
exports.default = async ({ uin, sin = 0, num = 100 }) => {
    try {
        const res = await axios_1.default.get('https://c.y.qq.com/rsc/fcgi-bin/fcg_user_created_diss', {
            params: {
                cid: 205360838,
                ct: 24,
                hostuin: 0,
                hostmid: uin,
                sin,
                n: num,
                loginUin: (0, requestCredential_1.getRequestUin)(),
                needNewCode: 0,
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
            body: { response: res.data || {} },
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
