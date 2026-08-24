"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const lyricParse_1 = __importDefault(require("../../util/lyricParse"));
const qrc_1 = require("../../util/qrc");
const observability_1 = require("../../util/observability");
/**
 * 2026-08 适配：老接口 /lyric/fcgi-bin/fcg_query_lyric_new.fcg 已不再返回翻译，
 * 改为官方 Web 端在用的 musicu.fcg GetPlayLyricInfo（crypt:1）。
 *
 * 该接口返回的 lyric/trans/roma 均为 QRC 加密的 hex 字符串，需经
 * util/qrc.ts 的魔改 3DES 解密 + zlib 解压：
 *   - lyric / roma 解出的是 QRC XML（<QrcInfos>…LyricContent="…"），再转成行级 LRC
 *   - trans 解出的是普通 LRC
 *
 * 响应保持老契约：
 *   response.lyric = 原文 LRC（isFormat 时为 lyricParse 解析对象）
 *   response.trans = 翻译 LRC 字符串
 *   response.roma  = 音译 LRC 字符串（此前接口不提供，2026-08 新增）
 */
const upstream = 'https://u.y.qq.com/cgi-bin/musicu.fcg';
/** 单字段 QRC 解密：失败静默返回空串（部分歌曲某字段为空/异常） */
function decryptField(hex) {
    if (!hex)
        return '';
    try {
        return (0, qrc_1.qrcDecryptHex)(hex);
    }
    catch {
        return '';
    }
}
exports.default = ({ params = {}, isFormat = false, }) => {
    const data = {
        comm: {
            ct: 19,
            cv: 1873,
            format: 'json',
            uin: 0,
        },
        req_1: {
            module: 'music.musichallSong.PlayLyricInfo',
            method: 'GetPlayLyricInfo',
            param: {
                format: 'json',
                crypt: 1,
                ct: 19,
                cv: 1873,
                interval: 0,
                lrc_t: 0,
                qrc: 1,
                qrc_t: 0,
                roma: 1,
                roma_t: 0,
                songMid: params.songmid,
                trans: 1,
                trans_t: 0,
                type: -1,
            },
        },
    };
    (0, observability_1.logServiceRequest)('getLyric', upstream, data, {
        formatLyric: isFormat,
    });
    if (isFormat) {
        (0, observability_1.logServiceBranch)('getLyric', upstream, 'format', {
            formatLyric: true,
        });
    }
    return axios_1.default
        .post(upstream, data, {
        headers: {
            Referer: 'https://y.qq.com/',
            // util/request.ts 把 axios 全局 post 头设成了 x-www-form-urlencoded，
            // musicu.fcg 只认 JSON body，这里必须显式覆盖回 application/json
            'Content-Type': 'application/json',
        },
        timeout: 10000,
    })
        .then((res) => {
        const code = res.data?.req_1?.code;
        const d = res.data?.req_1?.data || {};
        const lyricRaw = decryptField(d.lyric);
        // 逐字数据：isFormat 时一并解析（KTV 逐字高亮），老契约新增 words 字段
        const wordData = isFormat ? (0, qrc_1.qrcXmlToWordData)(lyricRaw) : null;
        const lyricLrc = wordData ? wordData.lrc : (0, qrc_1.qrcXmlToLrc)(lyricRaw);
        const lyric = isFormat ? lyricParse_1.default.lyricParse(lyricLrc) : lyricLrc;
        const trans = decryptField(d.trans);
        const roma = (0, qrc_1.qrcXmlToLrc)(decryptField(d.roma));
        const response = {
            retcode: code,
            code,
            lyric,
            trans,
            roma,
            words: wordData ? wordData.words : undefined,
        };
        (0, observability_1.logServiceSuccess)('getLyric', upstream, {
            code,
            hasLyric: Boolean(lyricLrc),
            hasTrans: Boolean(trans),
            hasRoma: Boolean(roma),
            hasWords: Boolean(wordData && Object.keys(wordData.words).length),
            formatLyric: isFormat,
        });
        return {
            status: 200,
            body: {
                response,
            },
        };
    })
        .catch((error) => {
        (0, observability_1.logServiceFailure)('getLyric', upstream, error, data, {
            formatLyric: isFormat,
        });
        return {
            status: 500,
            body: {
                error,
            },
        };
    });
};
