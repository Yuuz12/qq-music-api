"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const requestCredential_1 = require("../../util/requestCredential");
/**
 * getUserProfile - 用户主页聚合信息
 *
 * 2026-08 新增（本播放器项目适配）：
 * 逆向自 QQ 音乐 Web 端个人页（y.qq.com/n/ryqq/profile）：
 * 接口 c.y.qq.com/rsc/fcgi-bin/fcg_get_profile_homepage.fcg
 * 返回：昵称/头像/粉丝数/关注数/我喜欢（歌曲/专辑/歌单计数）/我创建的歌单列表
 * 需要登录 cookie（多用户：随请求头下发，见 util/requestCredential.ts）。
 */
exports.default = async () => {
    const uin = (0, requestCredential_1.getRequestUin)();
    try {
        const res = await axios_1.default.get('https://c.y.qq.com/rsc/fcgi-bin/fcg_get_profile_homepage.fcg', {
            params: {
                cid: 205360838,
                ct: 24,
                userid: 0,
                reqfrom: 1,
                reqtype: 0,
                hostUin: 0,
                loginUin: uin,
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
