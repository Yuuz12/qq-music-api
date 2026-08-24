"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isRelationListType = exports.RELATION_METHODS = void 0;
const axios_1 = __importDefault(require("axios"));
const requestCredential_1 = require("../../util/requestCredential");
const observability_1 = require("../../util/observability");
/** 友好类型 → 上游 musicu.fcg 方法名 */
exports.RELATION_METHODS = {
    follow_singer: 'GetFollowSingerList',
    follow_user: 'GetFollowUserList',
    fans: 'GetFansList',
};
const isRelationListType = (value) => Object.prototype.hasOwnProperty.call(exports.RELATION_METHODS, value);
exports.isRelationListType = isRelationListType;
const UPSTREAM_URL = 'https://u.y.qq.com/cgi-bin/musicu.fcg';
exports.default = async ({ type = 'fans', from = 0, size = 30, hostUin = '', } = {}) => {
    (0, observability_1.logServiceRequest)('getRelationList', UPSTREAM_URL, { type, from, size, hostUin });
    try {
        const data = {
            comm: {
                ct: 24,
                cv: 0,
                uin: (0, requestCredential_1.getRequestUin)(),
                loginUin: (0, requestCredential_1.getRequestUin)(),
                format: 'json',
                platform: 'yqq.json',
            },
            req_0: {
                module: 'music.concern.RelationList',
                method: exports.RELATION_METHODS[type],
                param: {
                    From: from,
                    Size: size,
                    HostUin: hostUin || '',
                },
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
        const req0 = res.data && typeof res.data === 'object' && res.data.req_0 && typeof res.data.req_0 === 'object'
            ? res.data.req_0
            : undefined;
        const code = req0?.code ?? res.data?.code ?? -1;
        if (code !== 0) {
            // 上游业务码透出（如未登录），不算服务层异常
            (0, observability_1.logServiceFailure)('getRelationList', UPSTREAM_URL, new Error(`upstream code ${code}`), {
                type,
                from,
                size,
            });
        }
        else {
            (0, observability_1.logServiceSuccess)('getRelationList', UPSTREAM_URL, {
                type,
                from,
                count: req0?.data?.List?.length ?? 0,
                hasMore: !!req0?.data?.HasMore,
            });
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
        (0, observability_1.logServiceFailure)('getRelationList', UPSTREAM_URL, error, { type, from, size });
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
