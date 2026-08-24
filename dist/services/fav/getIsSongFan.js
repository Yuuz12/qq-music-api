"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const requestCredential_1 = require("../../util/requestCredential");
const observability_1 = require("../../util/observability");
/** 单次请求的 mid 数上限（100 个 ≈ 查询串 2.5KB，远低于上游 URI 限制） */
const BATCH_SIZE = 100;
const UPSTREAM_URL = 'https://u.y.qq.com/cgi-bin/musicu.fcg';
exports.default = async ({ songmids = [] } = {}) => {
    const mids = songmids.map(String);
    // 切批：每批独立走一次 musicu.fcg（空列表也保留一个空批，与既有行为一致）
    const batches = [];
    for (let i = 0; i < mids.length; i += BATCH_SIZE) {
        batches.push(mids.slice(i, i + BATCH_SIZE));
    }
    if (!batches.length)
        batches.push([]);
    (0, observability_1.logServiceRequest)('getIsSongFan', UPSTREAM_URL, { count: mids.length, batches: batches.length });
    const settled = await Promise.allSettled(batches.map((batch) => {
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
                module: 'music.musicasset.SongFavRead',
                method: 'IsSongFanByMid',
                param: {
                    v_songMid: batch,
                },
            },
        };
        return axios_1.default.get(UPSTREAM_URL, {
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
    }));
    // 合并各批次结果：m_fan 取并集；code 取第一个非 0 的批次码（保留未登录 1000 等信号），全 0 则为 0
    const m_fan = {};
    let code;
    let firstError;
    let okBatches = 0;
    for (const item of settled) {
        if (item.status === 'rejected') {
            firstError ??= item.reason;
            continue;
        }
        okBatches += 1;
        const req0 = item.value.data && typeof item.value.data === 'object' ? item.value.data.req_0 : undefined;
        if (req0 && typeof req0 === 'object') {
            if (code === undefined || (code === 0 && req0.code !== 0))
                code = req0.code;
            if (req0.data && typeof req0.data === 'object' && req0.data.m_fan) {
                Object.assign(m_fan, req0.data.m_fan);
            }
        }
        else {
            // 上游 200 但响应体异常（如错误页）：按该批失败计，不影响其他批次
            code ??= -1;
        }
    }
    // 全部批次都失败：向上返回 500 并带上原因（此前被静默吞掉，排查困难）
    if (!okBatches) {
        (0, observability_1.logServiceFailure)('getIsSongFan', UPSTREAM_URL, firstError, { count: mids.length });
        return {
            status: 500,
            body: {
                response: {
                    code: -1,
                    message: String(firstError),
                },
            },
        };
    }
    // 部分批次失败：降级返回已取得的部分（缺失的红心保持空心），同时记录失败日志
    if (okBatches < batches.length) {
        (0, observability_1.logServiceFailure)('getIsSongFan', UPSTREAM_URL, firstError, {
            count: mids.length,
            okBatches,
            totalBatches: batches.length,
        });
    }
    const response = {
        code: code ?? 0,
        req_0: {
            code: code ?? 0,
            data: { m_fan },
        },
    };
    (0, observability_1.logServiceSuccess)('getIsSongFan', UPSTREAM_URL, { code: response.code, fans: Object.keys(m_fan).length });
    return {
        status: 200,
        body: { response },
    };
};
