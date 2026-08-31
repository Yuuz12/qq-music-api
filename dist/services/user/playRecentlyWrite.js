"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deletePlayRecently = exports.reportPlayRecently = void 0;
const axios_1 = __importDefault(require("axios"));
const observability_1 = require("../../util/observability");
const requestCredential_1 = require("../../util/requestCredential");
const UPSTREAM_URL = 'https://u.y.qq.com/cgi-bin/musicu.fcg';
async function write(action, items, logTag) {
    (0, observability_1.logServiceRequest)(logTag, UPSTREAM_URL, { action, count: items.length });
    try {
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
                module: 'music.musicasset.PlayRecentlyWrite',
                method: action,
                param: { data: items },
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
        const innerCode = req0?.data?.timeList?.[0]?.code;
        if (code !== 0 || innerCode !== 0) {
            (0, observability_1.logServiceFailure)(logTag, UPSTREAM_URL, new Error(`code ${code} inner ${innerCode}`), {
                action,
            });
        }
        else {
            (0, observability_1.logServiceSuccess)(logTag, UPSTREAM_URL, { action, count: items.length });
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
        (0, observability_1.logServiceFailure)(logTag, UPSTREAM_URL, error, { action });
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
}
/**
 * 上报最近播放（客户端每播一首歌调用一次；listenCnt 为增量，固定发 1）
 * @param songId 歌曲 songid（纯数字）
 */
const reportPlayRecently = (songId) => write('ReportPlayRecentlyInfo', [{ id: String(songId), lastTime: Math.floor(Date.now() / 1000), listenCnt: 1, type: 2 }], 'reportPlayRecently');
exports.reportPlayRecently = reportPlayRecently;
/**
 * 从最近播放删除（type 2=歌曲）
 * @param songId 歌曲 songid（纯数字）
 */
const deletePlayRecently = (songId) => write('DeletePlayRecentlyInfo', [{ id: String(songId), type: 2 }], 'deletePlayRecently');
exports.deletePlayRecently = deletePlayRecently;
