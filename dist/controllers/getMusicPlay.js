"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const services_1 = __importDefault(require("../services"));
const { UCommon } = services_1.default;
const lodash_get_1 = __importDefault(require("lodash.get"));
const config_1 = require("../config");
const requestCredential_1 = require("../util/requestCredential");
exports.default = async (ctx) => {
    const uin = (0, requestCredential_1.getRequestUin)();
    const songmid = `${ctx.query.songmid}`;
    // response data only need play url value (all play)
    const justPlayUrl = (ctx.query.resType || 'play') === 'play';
    const guid = config_1._guid ? `${config_1._guid}` : '1429839143';
    const { quality = 128, mediaId } = ctx.query;
    /**
     * 音质 → CDN 文件名模板（{s} 前缀 + {e} 扩展名）：
     * 基础档：m4a/128/320/ape/flac（旧版 CDN 命名，长期稳定）。
     * 省流档（2026-09 客户端 22.52 面板实测）：xq=SQ无损省流（O600 ogg，free 可播）、
     * nac=NAC 品质（AICodec 76kbps，CDN 无独立文件，落地 O400 省流 ogg）。
     * 臻品母带（2026-09 实测）：master = AI00{id}.flac（qtype=8，面板「臻品母带」，
     * 24bit/192kHz；vkey 会按 songmid 自动映射到母带专属 mid，无需传 mediaId 也能命中）。
     * 客户端面板的「Hi-Res 臻品音质（qtype=6，SQ00{id}.flac）/ 黑胶音质（qtype=12）」
     * 为 AI 升频/合成档，CDN 无独立文件（size_hires/size_new[4] 几乎恒为 0），不做映射。
     */
    const fileType = {
        m4a: {
            s: 'C400',
            e: '.m4a',
        },
        128: {
            s: 'M500',
            e: '.mp3',
        },
        320: {
            s: 'M800',
            e: '.mp3',
        },
        ape: {
            s: 'A000',
            e: '.ape',
        },
        flac: {
            s: 'F000',
            e: '.flac',
        },
        // SQ无损省流（客户端面板「XQ」档，2026-09 实测：O600 为 free 可播的真实 ogg 文件）
        xq: {
            s: 'O600',
            e: '.ogg',
        },
        // NAC 品质（客户端面板文案：最高 76kbps 自研 AICodec 编码，好品质更省流）。
        // CDN 上未发现独立 .nac 文件（该档仅对部分设备/会员开放），
        // 用同档位既有免费文件 O400（96kbps ogg，省流档）落地，歌曲无文件时前端自动回退。
        nac: {
            s: 'O400',
            e: '.ogg',
        },
        // 臻品母带（2026-09 实测）：AI00{id}.flac 为真母带文件（24bit/192kHz，如晴天 178MB）
        master: {
            s: 'AI00',
            e: '.flac',
        },
    };
    const songmidList = songmid.split(',');
    const qualityKey = quality;
    // 未知/过时音质键（如已并入 FLAC 的 ape 由旧端下发新档键）兜底走高品，避免 500
    const fileInfo = fileType[qualityKey] || fileType[320];
    // 本播放器项目适配（2026-08）：filename 应形如 M500{songmid}.mp3。
    // 上游原写法 `${s}${_}${mediaId || _}${e}` 在未传 mediaId 时会重复 songmid
    // （M500{songmid}{songmid}.mp3），上游 vkey 接口查不到文件导致 purl 恒为空。
    // 2026-09：母带档为 AI00{id}.flac（vkey 自动映射母带专属 mid，无需后缀字段）。
    const file = songmidList.map((_) => `${fileInfo.s}${mediaId || _}${fileInfo.e}`);
    const data = {
        // req: {
        // 	module: 'CDN.SrfCdnDispatchServer',
        // 	method: 'GetCdnDispatch',
        // 	param: {
        // 		guid,
        // 		calltype: 0,
        // 		userip: '',
        // 	},
        // },
        req_0: {
            module: 'vkey.GetVkeyServer',
            method: 'CgiGetVkey',
            param: {
                filename: file,
                guid,
                songmid: songmidList,
                songtype: [0],
                uin,
                loginflag: 1,
                platform: '20',
            },
        },
        loginUin: uin,
        comm: {
            uin,
            format: 'json',
            ct: 24,
            cv: 0,
        },
    };
    const params = Object.assign({
        format: 'json',
        sign: 'zzannc1o6o9b4i971602f3554385022046ab796512b7012',
        data: JSON.stringify(data),
    });
    const props = {
        method: 'get',
        params,
        // 本播放器项目适配（2026-08）：u_common 不携带用户 cookie，
        // 上游 vkey 接口即使免费歌曲也要求登录 cookie 才返回 purl（未带 cookie 时 purl 恒为空）。
        option: {
            headers: {
                Cookie: (0, requestCredential_1.getRequestCookie)(),
            },
        },
    };
    if (songmid) {
        await UCommon(props)
            .then((res) => {
            const response = res.data;
            const domain = (0, lodash_get_1.default)(response, 'req_0.data.sip', []).find((i) => !i.startsWith('http://ws')) ||
                (0, lodash_get_1.default)(response, 'req_0.data.sip[0]');
            const playUrl = {};
            (0, lodash_get_1.default)(response, 'req_0.data.midurlinfo', []).forEach((item) => {
                playUrl[item.songmid] = {
                    url: item.purl ? `${domain}${item.purl}` : '',
                    error: !item.purl && '暂无播放链接',
                };
            });
            response.playUrl = playUrl;
            ctx.body = {
                data: justPlayUrl ? { playUrl } : response,
            };
        })
            .catch((error) => {
            throw error;
        });
    }
    else {
        ctx.status = 400;
        ctx.body = {
            data: {
                message: 'no songmid',
            },
        };
    }
};
