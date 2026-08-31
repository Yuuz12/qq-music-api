"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDislikeList = exports.cancelDislike = exports.addDislike = void 0;
const axios_1 = __importDefault(require("axios"));
const observability_1 = require("../../util/observability");
const requestCredential_1 = require("../../util/requestCredential");
const UPSTREAM_URL = 'https://u.y.qq.com/cgi-bin/musicu.fcg';
async function call(method, param, logTag) {
    (0, observability_1.logServiceRequest)(logTag, UPSTREAM_URL, { method, param });
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
                module: 'music.feedback.FeedbackBlack',
                method,
                param,
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
        if (code !== 0) {
            (0, observability_1.logServiceFailure)(logTag, UPSTREAM_URL, new Error(`upstream code ${code}`), { method });
        }
        else {
            (0, observability_1.logServiceSuccess)(logTag, UPSTREAM_URL, { method, param });
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
        (0, observability_1.logServiceFailure)(logTag, UPSTREAM_URL, error, { method });
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
 * 删除这首歌曲（不喜欢）——猜你喜欢-沉浸刷歌 / 每日30首 / 刷歌模式 /
 * 百万收藏 / 新歌推荐 的「删除这首歌曲」按钮共用接口
 * @param songId 歌曲 songid（纯数字）
 */
const addDislike = (songId) => call('AddDislike', { Songs: [{ ID: String(songId) }] }, 'addDislike');
exports.addDislike = addDislike;
/**
 * 取消不喜欢（从黑名单恢复）
 * @param songId 歌曲 songid（纯数字）
 */
const cancelDislike = (songId) => call('CancelDislike', { Songs: [{ ID: String(songId) }] }, 'cancelDislike');
exports.cancelDislike = cancelDislike;
/**
 * 读取不喜欢列表（Cmd=1 汇总）
 */
const getDislikeList = () => call('GetDislikeList', { Cmd: 1 }, 'getDislikeList');
exports.getDislikeList = getDislikeList;
