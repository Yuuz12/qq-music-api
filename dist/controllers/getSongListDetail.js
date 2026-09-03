"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const services_1 = __importDefault(require("../services"));
const { songListDetail, aiSongListDetail } = services_1.default;
/**
 * 歌单详情：传统歌单走 qzone-music fcg 通道；
 * 官方 AI 歌单（百万收藏 211111 / 新歌推荐 211207 等推荐页官方歌单）
 * 旧通道恒返 code 10（带 cookie 也不行），失败时回落 aiDissInfo 通道。
 * AI 通道需登录 cookie，匿名时上游 80120 → 原样返回首次的 code 10。
 */
exports.default = async (ctx) => {
    const disstid = String(ctx.query.disstid || '');
    const props = {
        method: 'get',
        params: {
            disstid,
        },
        option: {},
    };
    let { status, body } = await songListDetail(props);
    const firstCode = Number(body?.response?.code);
    if (firstCode !== 0) {
        const ai = await aiSongListDetail({ method: 'post', params: { disstid }, option: {} });
        if (Number(ai.body?.response?.code) === 0) {
            status = ai.status;
            body = ai.body;
        }
    }
    Object.assign(ctx, {
        status,
        body,
    });
};
