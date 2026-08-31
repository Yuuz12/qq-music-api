"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isPlayRecentlyType = void 0;
const axios_1 = __importDefault(require("axios"));
const observability_1 = require("../../util/observability");
const requestCredential_1 = require("../../util/requestCredential");
/** type 取值合法性（0/缺省时上游返回内层 code:-1 且列表全空，属于无效参数） */
const isPlayRecentlyType = (value) => value === 1 || value === 2 || value === 3 || value === 4;
exports.isPlayRecentlyType = isPlayRecentlyType;
const UPSTREAM_URL = 'https://u.y.qq.com/cgi-bin/musicu.fcg';
exports.default = async ({ type = 2, } = {}) => {
    (0, observability_1.logServiceRequest)('getPlayRecently', UPSTREAM_URL, { type });
    try {
        // comm 用客户端实测形态（wk_v17/ct20/cv2252，抓包验证可用）
        const data = {
            comm: {
                ct: 20,
                cv: 2252,
                uin: (0, requestCredential_1.getRequestUin)(),
                loginUin: (0, requestCredential_1.getRequestUin)(),
                format: 'json',
                platform: 'wk_v17',
                inCharset: 'utf-8',
                outCharset: 'utf-8',
                notice: 0,
                needNewCode: 1,
            },
            req_0: {
                module: 'music.musicasset.PlayRecentlyRead',
                method: 'GetPlayRecentlyInfo',
                param: { type },
            },
        };
        const res = await axios_1.default.get(UPSTREAM_URL, {
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
        const req0 = res.data &&
            typeof res.data === 'object' &&
            res.data.req_0 &&
            typeof res.data.req_0 === 'object'
            ? res.data.req_0
            : undefined;
        const code = req0?.code ?? res.data?.code ?? -1;
        const songCount = req0?.data?.data?.songList?.length ?? 0;
        if (code !== 0) {
            (0, observability_1.logServiceFailure)('getPlayRecently', UPSTREAM_URL, new Error(`upstream code ${code}`), {
                type,
            });
        }
        else {
            (0, observability_1.logServiceSuccess)('getPlayRecently', UPSTREAM_URL, { type, songCount });
        }
        return {
            status: 200,
            body: {
                response: {
                    code,
                    req_0: req0 ?? { code },
                },
            },
        };
    }
    catch (error) {
        (0, observability_1.logServiceFailure)('getPlayRecently', UPSTREAM_URL, error, { type });
        return {
            status: 500,
            body: {
                response: {
                    code: -1,
                    message: String(error),
                },
            },
        };
    }
};
