"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const logger_1 = require("../../util/logger");
const qqSign_1 = __importDefault(require("../../util/qqSign"));
const requestCredential_1 = require("../../util/requestCredential");
/**
 * refreshCredential - 刷新登录（延长 QQ 登录有效期）
 *
 * 移植自 jsososo/QQMusicApi 的 /user/refresh（routes/user.js '/refresh'）：
 * 调用上游 QQConnectLogin.LoginServer / QQLogin，用当前 musickey 换发新 musickey，
 * 刷新 cookie 中的 qm_keyst / qqmusic_key，仅限 QQ 登录。
 *
 * 2026-08 实测适配：
 * - 上游接口仍存活，但 2021 年的旧参数形态（仅数值 musicid）会被拒（req1.code=10006），
 *   现官方客户端形态需附带 strMusicid（字符串 uin）才能进入鉴权判定；
 * - zzc 签名（__sign_hash_20200305，见 util/qqSign.ts）上游仍接受；
 * - req1.code=1000 表示 musickey 已失效/过期，只能重新扫码登录。
 *
 * 与原版差异：原版把新 key 写进服务端 Set-Cookie；本项目为多用户模式，
 * 服务端不持有凭据，新 key 随响应返回，由前端更新自己 localStorage 里的 cookie。
 */
/** 当前请求的凭据缺失时返回 301（与原版语义一致：未登陆） */
const notLoggedIn = () => ({
    status: 200,
    body: {
        response: {
            code: 301,
            message: '未登陆',
        },
    },
});
/** 解析 cookie 字符串中的某个键值 */
function cookieValue(cookie, name) {
    const m = cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
    return m ? m[1] : '';
}
exports.default = async () => {
    const cookie = (0, requestCredential_1.getRequestCookie)();
    const uin = (0, requestCredential_1.getRequestUin)();
    const musickey = cookieValue(cookie, 'qm_keyst') || cookieValue(cookie, 'qqmusic_key');
    if (!cookie || !uin || uin === '0' || !musickey) {
        return notLoggedIn();
    }
    // 现官方客户端参数形态（strMusicid 必带）；旧形态仅作 10006 时的回退
    const buildParam = (legacy) => legacy
        ? { expired_in: 7776000, musicid: uin, musickey }
        : { expired_in: 7776000, musicid: Number(uin) || uin, strMusicid: String(uin), musickey };
    const callUpstream = async (legacy) => {
        const data = {
            req1: {
                module: 'QQConnectLogin.LoginServer',
                method: 'QQLogin',
                param: buildParam(legacy),
            },
        };
        const sign = (0, qqSign_1.default)(data);
        const url = `https://u6.y.qq.com/cgi-bin/musics.fcg?sign=${sign}&format=json&inCharset=utf8&outCharset=utf-8&data=${encodeURIComponent(JSON.stringify(data))}`;
        const res = await axios_1.default.get(url, {
            headers: {
                Cookie: cookie,
                Referer: 'https://y.qq.com/',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
            },
            timeout: 10000,
        });
        return res.data;
    };
    try {
        let upstream = await callUpstream(false);
        // 参数形态被拒：回退 2021 旧形态再试一次（上游若再次收紧 strMusicid 形态时兜底）
        if (upstream?.req1?.code === 10006) {
            logger_1.logger.warn('refreshCredential: strMusicid 形态被拒（10006），回退旧参数形态重试');
            upstream = await callUpstream(true);
        }
        const req1Code = upstream?.req1?.code;
        const newKey = upstream?.req1?.data?.musickey;
        if (newKey) {
            logger_1.logger.info('refreshCredential: 刷新登录成功', { uin });
            return {
                status: 200,
                body: {
                    response: {
                        code: 0,
                        data: { musickey: newKey },
                    },
                },
            };
        }
        if (req1Code === 1000) {
            // musickey 已失效：只能重新扫码登录
            return {
                status: 200,
                body: {
                    response: {
                        code: 1000,
                        message: '登录已失效，请重新扫码登录',
                    },
                },
            };
        }
        logger_1.logger.warn('refreshCredential: 刷新失败', { req1Code, topCode: upstream?.code });
        return {
            status: 200,
            body: {
                response: {
                    code: req1Code ?? -1,
                    message: '刷新失败，建议重新设置 cookie',
                },
            },
        };
    }
    catch (error) {
        logger_1.logger.error('refreshCredential: 请求异常', {
            error: error instanceof Error ? error.message : String(error),
        });
        return {
            status: 500,
            body: {
                response: {
                    code: -1,
                    message: '刷新登录请求失败',
                },
            },
        };
    }
};
