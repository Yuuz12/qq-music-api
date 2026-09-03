"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const services_1 = __importDefault(require("../services"));
const { getUserProfile, getUserCreatedDiss } = services_1.default;
const EMPTY_PROFILE = {
    nick: '',
    headpic: '',
    encryptUin: '',
    fansnum: 0,
    follownum: 0,
    like: null,
    disslist: [],
    source: 'homepage',
};
/** 主页聚合接口 data → 前端结构 */
function fromHomepage(d) {
    const like = (d.mymusic || []).find((m) => m.type === 1) || null;
    return {
        nick: d.creator?.nick || '',
        headpic: d.creator?.headpic || '',
        encryptUin: d.creator?.encrypt_uin || '',
        fansnum: d.creator?.nums?.fansnum ?? 0,
        follownum: d.creator?.nums?.follownum ?? 0,
        like: like
            ? {
                id: String(like.id || ''),
                title: like.title || '我喜欢',
                picurl: like.picurl || '',
                songnum: like.num0 ?? 0,
                albumnum: like.num1 ?? 0,
                dirnum: like.num2 ?? 0,
            }
            : null,
        disslist: (d.mydiss?.list || []).map((s) => ({
            dissid: String(s.dissid || ''),
            // 写接口（添加到歌单 PlaylistDetailWrite.AddSonglist）必须用内部 dirId
            // （201=我喜欢；自建歌单为内部序号如 4），不能用 dissid/tid（会返回 80092）
            dirId: s.dirid ? Number(s.dirid) : undefined,
            title: s.title || '',
            picurl: s.picurl || '',
            subtitle: s.subtitle || '',
        })),
        source: 'homepage',
    };
}
/** 创建歌单兜底通道 data → 前端结构（拿不到数据时返回 null） */
function fromCreatedDiss(data, uin) {
    const d = (data || {});
    const list = ([d.lst, d.disslist, d.list].find(Array.isArray) || []);
    const first = list[0];
    // 该通道把创建者信息冗余在每一行里；昵称缺失即视为没取到目标用户
    if (!first?.nick)
        return null;
    if (first.encrypt_uin && first.encrypt_uin !== uin)
        return null;
    return {
        ...EMPTY_PROFILE,
        nick: first.nick,
        headpic: first.avatar || '',
        encryptUin: first.encrypt_uin || uin,
        disslist: list.map((s) => {
            const count = s.song_count ?? s.total_song_count ?? 0;
            return {
                dissid: String(s.dissid || ''),
                dirId: s.dirid ? Number(s.dirid) : undefined,
                title: s.title || '',
                picurl: s.picurl || s.imgurl || '',
                subtitle: count ? `${count} 首` : '',
            };
        }),
        source: 'created_diss',
    };
}
exports.default = async (ctx) => {
    const uin = String(ctx.query.uin || '').trim();
    const { status, body } = await getUserProfile({ uin });
    const code = body.response?.code ?? -1;
    const data = body.response?.data;
    // 查他人时上游可能静默回落成登录用户自己的资料：用返回的 encrypt_uin 与请求 uin 比对识别
    const isTargetUser = !uin || !data?.creator?.encrypt_uin || data.creator.encrypt_uin === uin;
    const usable = code === 0 && !!data?.creator?.nick && isTargetUser;
    if (usable && data) {
        ctx.status = 200;
        ctx.body = { response: { code, data: fromHomepage(data) } };
        return;
    }
    if (!uin) {
        // 查自己：维持原行为（失败也返回同结构空数据，前端据此提示凭据失效）
        ctx.status = status;
        ctx.body = { response: { code, data: fromHomepage(data || {}) } };
        return;
    }
    // 查他人且主页聚合接口不可用（隐私限制/未登录/上游不识别 hostUin）→ 兜底只取公开歌单
    const fallback = await getUserCreatedDiss({ uin });
    const created = fromCreatedDiss(fallback.body.response?.data, uin);
    if (created) {
        ctx.status = 200;
        ctx.body = { response: { code: 0, data: created } };
        return;
    }
    ctx.status = 200;
    ctx.body = { response: { code: code === 0 ? -1 : code, data: { ...EMPTY_PROFILE, encryptUin: uin } } };
};
