"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const requestCredential_1 = require("../../util/requestCredential");
/**
 * getUserVipInfo - 当前登录账号的会员状态（绿钻 VIP / 豪华绿钻 SVIP）
 *
 * 2026-09 新增（本播放器项目适配）：
 * 逆向自 QQ 音乐 Web 端 y.qq.com 的 user.getVipInfo（portal 模块）：
 *   GET c.y.qq.com/portalcgi/fcgi-bin/music_mini_portal/fcg_getuser_infoEx.fcg
 * Web 端拿到后写入 userinfo_detail（按 uin 匹配 localStorage），登录后用它判断
 * 「是否有会员」并渲染会员角标/权益，字段含 vip、svip、start/end（会员起止）等。
 *
 * 2026-09-07 用真实登录凭据实测通过，请求要点：
 * - cookie **必须完整原样带上**（含 p_skey/uin 等 passport cookie；官方前端虽然先
 *   document.cookie 删了 p_skey/skey/uin，但实测删掉后 c.y.qq.com 收到的是同样的
 *   完整 jar 才成功——服务端按完整 cookie 透传即可，切勿裁剪）；
 * - 必须带 `g_tk` / `g_tk_new_20200303`（官方 ajax 包装器自动附加：
 *   getACSRFToken = 5381 哈希，优先 qqmusic_key，其次 p_skey/skey）；
 * - 必须带 `uin`（登录 uin）与 `format=json`（否则返回 JSONP 包裹）。
 * 实测样例：超级会员账号返回 code=0，data.vip=1、svip=1、end=会员到期时间、
 * CurrentLevel=用户等级、nowtime=服务器时间。缺 g_tk/uin 时返回 code=1000 "no login"。
 * 上游返回结构的整理在 controllers/getUserVipInfo（vip/svip 数值归一到统一结构）。
 */
/** 官方 getACSRFToken：n=5381; n += (n<<5)+c; 取 31 位 */
function getACSRFToken(key) {
    let n = 5381;
    for (let i = 0; i < key.length; i++)
        n += (n << 5) + key.charCodeAt(i);
    return n & 0x7fffffff;
}
/** 从 cookie 串取指定 name 的值 */
function cookieValue(cookie, name) {
    const m = cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
    return m ? m[1] : '';
}
exports.default = async () => {
    try {
        const cookie = (0, requestCredential_1.getRequestCookie)();
        const key = cookieValue(cookie, 'qqmusic_key') ||
            cookieValue(cookie, 'p_skey') ||
            cookieValue(cookie, 'skey');
        const tk = key ? getACSRFToken(key) : 0;
        const uin = (0, requestCredential_1.getRequestUin)() || cookieValue(cookie, 'uin') || 0;
        const res = await axios_1.default.get('https://c.y.qq.com/portalcgi/fcgi-bin/music_mini_portal/fcg_getuser_infoEx.fcg', {
            params: {
                source: 4001,
                format: 'json', // 缺省返回 JSONP（MusicJsonCallback 包裹），必须显式 json
                g_tk: tk,
                g_tk_new_20200303: tk,
                uin,
                inCharset: 'utf-8',
                outCharset: 'utf-8',
                notice: 0,
                platform: 'wk_v17',
                needNewCode: 0,
            },
            headers: {
                Referer: 'https://y.qq.com/',
                Cookie: cookie,
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
