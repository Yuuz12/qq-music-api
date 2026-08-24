"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const requestCredential_1 = require("../../util/requestCredential");
exports.default = async ({ id = 99, num = 10, firstplay = 0 } = {}) => {
    const radioId = Number(id) || 99;
    const isGuessLike = radioId === 99;
    const count = Math.max(1, Number(num) || 10);
    const data = {
        comm: {
            ct: 24,
            cv: 0,
            uin: (0, requestCredential_1.getRequestUin)(),
            loginUin: (0, requestCredential_1.getRequestUin)(),
            format: 'json',
            platform: 'yqq.json',
        },
        req_0: isGuessLike
            ? {
                module: 'music.radioProxy.MbTrackRadioSvr',
                method: 'get_radio_track',
                param: { id: radioId, firstplay: firstplay ? 1 : 0, num: count },
            }
            : {
                module: 'pf.radiosvr',
                method: 'GetRadiosonglist',
                param: { id: radioId, firstplay: firstplay ? 1 : 0, num: count },
            },
    };
    try {
        const res = await axios_1.default.get('https://u.y.qq.com/cgi-bin/musicu.fcg', {
            params: {
                format: 'json',
                data: JSON.stringify(data),
            },
            headers: {
                Referer: 'https://y.qq.com/',
                Cookie: (0, requestCredential_1.getRequestCookie)(),
            },
            timeout: 10000,
        });
        const response = res.data || {};
        return {
            status: 200,
            body: { response },
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
