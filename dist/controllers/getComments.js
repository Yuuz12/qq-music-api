"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const services_1 = __importDefault(require("../services"));
const logger_1 = require("../util/logger");
const { UCommon } = services_1.default;
/**
 * 把歌曲 songmid 解析成 songid（评论接口 BizId 需要纯数字 songid）。
 * 复用 get_song_detail_yqq 通道，成功返回数字字符串，失败返回 null。
 */
async function resolveSongIdByMid(songmid) {
    try {
        const res = await UCommon({
            method: 'get',
            params: {
                format: 'json',
                inCharset: 'utf8',
                outCharset: 'utf-8',
                notice: 0,
                platform: 'yqq.json',
                needNewCode: 0,
                data: JSON.stringify({
                    comm: { ct: 24, cv: 0 },
                    songinfo: {
                        module: 'music.pf_song_detail_svr',
                        method: 'get_song_detail_yqq',
                        param: { song_type: 0, song_mid: songmid, song_id: '' },
                    },
                }),
            },
            option: {},
        });
        const data = res?.data;
        const songid = data?.songinfo?.data?.track_info?.id;
        return songid != null ? String(songid) : null;
    }
    catch {
        return null;
    }
}
exports.default = async (ctx) => {
    let { id } = ctx.query;
    if (!id) {
        ctx.status = 400;
        ctx.body = { data: { message: "Don't have id" } };
        return;
    }
    // pagenum/pagesize 可能以字符串传入（query string），转数字避免「0」被当成非零页
    const pagenum = Number(ctx.query.pagenum ?? 0) || 0;
    const pagesize = Number(ctx.query.pagesize ?? 25) || 25;
    const rootcommentid = ctx.query.rootcommentid || ''; // 翻页游标
    // 非纯数字 id（如 002Jf2V72NrQXG）视为 songmid，兜底转换成 songid
    if (!/^\d+$/.test(String(id))) {
        const resolved = await resolveSongIdByMid(String(id));
        if (!resolved) {
            ctx.status = 400;
            ctx.body = { data: { message: `Cannot resolve songid from songmid ${id}` } };
            return;
        }
        id = resolved;
    }
    try {
        const res = await UCommon({
            method: 'get',
            params: {
                format: 'json',
                data: JSON.stringify({
                    comm: { cv: 4747474, ct: 24, platform: 'yqq.json', needNewCode: 1, uin: '0' },
                    req_0: {
                        module: 'music.globalComment.CommentRead',
                        method: 'GetNewCommentList',
                        param: {
                            BizType: 1,
                            BizId: String(id),
                            LastCommentSeqNo: rootcommentid,
                            PageSize: pagesize,
                            PageNum: pagenum,
                            FromCommentId: '',
                            WithHot: 0,
                            PicEnable: 1,
                            LastTotal: 0,
                            LastTotalVer: '0',
                        },
                    },
                }),
            },
            option: {},
        });
        const req0 = (res?.data).req_0;
        if (!req0 || req0.code !== 0 || !req0.data?.CommentList) {
            ctx.status = 500;
            ctx.body = {
                response: {
                    code: 500,
                    message: `QQ 音乐评论接口返回异常 code=${req0?.code}`,
                },
            };
            return;
        }
        const cl = req0.data.CommentList;
        const commentlist = (cl.Comments || []).map((c) => ({
            // 映射回前端旧结构字段
            nick: c.Nick || '陌生人',
            rootcommentcontent: c.Content || '',
            rootcommentid: c.SeqNo || '', // 翻页游标（LastCommentSeqNo）
            time: c.PubTime || 0,
            praisenum: c.PraiseNum || 0,
            avatarurl: c.Avatar || '', // 头像：musicu.fcg 返回在 Avatar 字段（老结构是 avatarurl）
        }));
        Object.assign(ctx, {
            status: 200,
            body: {
                response: {
                    code: 0,
                    topic_name: '',
                    comment: {
                        commenttotal: cl.Total ?? 0,
                        commentlist,
                    },
                },
            },
        });
    }
    catch (error) {
        logger_1.logger.error('getComments failed', { error });
        ctx.status = 500;
        ctx.body = { response: { code: 500, message: 'QQ 音乐评论接口请求失败' } };
    }
};
