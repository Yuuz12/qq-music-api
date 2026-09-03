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
     * 音质 → CDN 文件名模板（{s} 前缀 + {suffix} 音质后缀 + {e} 扩展名）：
     * 基础档：m4a/128/320/ape/flac（旧版 CDN 命名，长期稳定）。
     * 省流档（2026-09 客户端 22.52 面板实测）：xq=SQ无损省流（O600 ogg，free 可播）、
     * nac=NAC 品质（AICodec 76kbps，CDN 无独立文件，落地 O400 省流 ogg）。
     * 臻品系（2026-09 客户端 22.52 抓包/静态分析新增）：
     *   - hires    Hi-Res 臻品音质（qtype=6，面板「Hi-Res品质」，DLL 文件后缀表 `_hires`）
     *   - master   臻品母带（qtype=8，面板「臻品母带」，DLL 文件后缀表 `_EM`）
     *   - vinyl    黑胶音质（qtype=12，面板「黑胶音质」，DLL 文件后缀表 `_BT`=blackTape）
     * 上述臻品档位与 flac 一样走 VIP（绿钻）鉴权，filename 的 ID 段优先使用 mediaId
     * （media_mid）；服务端对带后缀的文件名走 media_mid 匹配（实测：带后缀时
     * songmid 会被映射到 media_mid，两种都能命中）。
     */
    const fileType = {
        m4a: {
            s: 'C400',
            suffix: '',
            e: '.m4a',
        },
        128: {
            s: 'M500',
            suffix: '',
            e: '.mp3',
        },
        320: {
            s: 'M800',
            suffix: '',
            e: '.mp3',
        },
        ape: {
            s: 'A000',
            suffix: '',
            e: '.ape',
        },
        flac: {
            s: 'F000',
            suffix: '',
            e: '.flac',
        },
        // SQ无损省流（客户端面板「XQ」档，2026-09 实测：O600 为 free 可播的真实 ogg 文件）
        xq: {
            s: 'O600',
            suffix: '',
            e: '.ogg',
        },
        // NAC 品质（客户端面板文案：最高 76kbps 自研 AICodec 编码，好品质更省流）。
        // CDN 上未发现独立 .nac 文件（该档仅对部分设备/会员开放），
        // 用同档位既有免费文件 O400（96kbps ogg，省流档）落地，歌曲无文件时前端自动回退。
        nac: {
            s: 'O400',
            suffix: '',
            e: '.ogg',
        },
        hires: {
            s: 'F000',
            suffix: '_hires',
            e: '.flac',
        },
        master: {
            s: 'F000',
            suffix: '_EM',
            e: '.flac',
        },
        vinyl: {
            s: 'F000',
            suffix: '_BT',
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
    // 2026-09：新增后缀字段（臻品系音质 `F000{id}_hires.flac` 等）。
    const file = songmidList.map((_) => `${fileInfo.s}${mediaId || _}${fileInfo.suffix || ''}${fileInfo.e}`);
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
