"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const logger_1 = require("../../util/logger");
const qqSign_1 = __importDefault(require("../../util/qqSign"));
const requestCredential_1 = require("../../util/requestCredential");
/** 32 位大写 hex 随机 guid（上游仅作缓存标识，无需与登录态绑定） */
const randomGuid = () => Array.from({ length: 8 }, () => Math.floor((1 + Math.random()) * 0x10000)
    .toString(16)
    .slice(1)).join('').toUpperCase();
exports.default = async ({ params = {} } = {}) => {
    const disstid = Number(params.disstid || 0);
    if (!disstid) {
        return { status: 400, body: { response: { code: 500, cdlist: [] } } };
    }
    const cookie = (0, requestCredential_1.getRequestCookie)();
    const uin = (0, requestCredential_1.getRequestUin)();
    const body = {
        comm: {
            format: 'json',
            ct: 20,
            cv: 2252,
            platform: 'wk_v17',
            inCharset: 'utf-8',
            outCharset: 'utf-8',
            notice: 0,
            needNewCode: 1,
            uin: Number(uin) || 0,
        },
        req_1: {
            module: 'music.srfDissInfo.aiDissInfo',
            method: 'uniform_get_Dissinfo',
            param: {
                disstid,
                userinfo: 1,
                tag: 1,
                enc_host_uin: '',
                guid: randomGuid(),
            },
        },
    };
    try {
        const sign = (0, qqSign_1.default)(body);
        const res = await axios_1.default.post(`https://u6.y.qq.com/cgi-bin/musics.fcg?_=${Date.now()}&sign=${sign}`, body, {
            headers: {
                'Content-Type': 'application/json',
                ...(cookie ? { Cookie: cookie } : {}),
                Referer: 'https://y.qq.com/',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
            },
            timeout: 10000,
        });
        // 兼容两种响应形态：网页版通道 data 为对象；客户端通道 data 为数组
        const raw = res.data?.req_1 || {};
        const inner = Array.isArray(raw.data) ? raw.data[0] : raw.data;
        const d = (inner || {});
        const code = Number(raw.code ?? 0) !== 0 ? Number(raw.code) : Number(d.code ?? -1);
        if (code !== 0 || !d.dirinfo) {
            // 匿名访问上游为 80120：透传原 code 便于排查
            logger_1.logger.warn('aiSongListDetail: 上游未返回歌单数据', { disstid, code });
            return {
                status: 200,
                body: { response: { code: code || -1, cdlist: [] } },
            };
        }
        const dir = d.dirinfo;
        const cdlistItem = {
            disstid: dir.id,
            dissid: dir.id,
            dissname: dir.title,
            diss_title: dir.title,
            logo: dir.picurl,
            picurl: dir.picurl,
            pic_mid: dir.picmid,
            picurl2: dir.picurl2,
            nickname: dir.host_nick,
            // 与 songListDetail 的 cdlist[0] 同构：nick = 创建人昵称（前端歌单详情 meta 据此追加「by 创建人」）
            nick: dir.host_nick,
            creator: { name: dir.host_nick },
            songnum: dir.songnum,
            total_song_num: dir.songnum,
            listennum: dir.listennum,
            desc: dir.desc,
            song_update_time: dir.song_update_time,
            // AI 歌单每日更新：前端详情页 meta 可用
            dir_show: dir.dir_show,
            songlist: d.songlist || [],
        };
        return {
            status: 200,
            body: {
                response: {
                    code: 0,
                    subcode: 0,
                    cdlist: [cdlistItem],
                },
            },
        };
    }
    catch (error) {
        logger_1.logger.error('aiSongListDetail: 请求异常', {
            disstid,
            error: error instanceof Error ? error.message : String(error),
        });
        return {
            status: 200,
            body: { response: { code: -1, cdlist: [] } },
        };
    }
};
