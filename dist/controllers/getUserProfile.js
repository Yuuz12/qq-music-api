"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const services_1 = __importDefault(require("../services"));
const { getUserProfile } = services_1.default;
/**
 * getUserProfile - 用户主页信息
 * GET /getUserProfile
 * 整理为前端友好结构：昵称/头像/粉丝/关注/我喜欢/创建的歌单
 */
exports.default = async (ctx) => {
    const { status, body } = await getUserProfile();
    const d = body.response?.data || {};
    const like = (d.mymusic || []).find((m) => m.type === 1) || null;
    ctx.status = status;
    ctx.body = {
        response: {
            code: body.response?.code ?? -1,
            data: {
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
            },
        },
    };
};
