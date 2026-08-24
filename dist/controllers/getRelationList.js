"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const services_1 = __importDefault(require("../services"));
const getRelationList_1 = require("../services/user/getRelationList");
const { getRelationList } = services_1.default;
/**
 * getRelationList - 用户关系链列表（关注歌手 / 关注用户 / 粉丝）
 * GET /getRelationList?type=follow_singer&from=0&size=30&hostUin=
 * type: follow_singer=关注的歌手（y.qq.com/n/ryqq_v2/profile/focus/singer）
 *       follow_user =关注的用户
 *       fans        =粉丝（y.qq.com/n/ryqq_v2/profile/fans）
 * hostUin 为目标用户加密 uin，缺省查当前登录用户自己；需登录凭据（cookie）。
 * 整理为前端友好结构：list[]{mid,name,picurl,desc,fannum,isfollow} + hasMore。
 */
exports.default = async (ctx) => {
    const rawType = String(ctx.query.type || 'fans');
    if (!(0, getRelationList_1.isRelationListType)(rawType)) {
        ctx.status = 400;
        ctx.body = {
            response: {
                code: -1,
                message: `invalid type "${rawType}" (expect follow_singer | follow_user | fans)`,
            },
        };
        return;
    }
    const type = rawType;
    const from = Math.max(Number(ctx.query.from) || 0, 0);
    const size = Math.min(Math.max(Number(ctx.query.size) || 30, 1), 100);
    const hostUin = String(ctx.query.hostUin || '');
    const { status, body } = await getRelationList({ type, from, size, hostUin });
    const d = body.response?.req_0?.data || {};
    const list = Array.isArray(d.List) ? d.List : [];
    ctx.status = status;
    ctx.body = {
        response: {
            code: body.response?.code ?? -1,
            data: {
                list: list.map((u) => ({
                    mid: String(u.MID || ''),
                    encuin: String(u.EncUin || ''),
                    name: String(u.Name || ''),
                    desc: String(u.Desc || ''),
                    picurl: String(u.AvatarUrl || ''),
                    fannum: Number(u.FanNum) || 0,
                    isfollow: u.IsFollow === true || u.IsFollow === 1,
                })),
                hasMore: !!d.HasMore,
            },
        },
    };
};
