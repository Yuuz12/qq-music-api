"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const request_1 = require("../types/core/request");
exports.default = async (ctx) => {
    const query = (0, request_1.getTypedQuery)(ctx);
    const topId = +(query.topId || 4);
    const num = +(query.limit || 20) || 20;
    const page = +(query.page || 1) || 1;
    const songBegin = (page - 1) * num;
    try {
        const res = await axios_1.default.get('https://c.y.qq.com/v8/fcg-bin/fcg_v8_toplist_cp.fcg', {
            params: {
                topid: topId,
                format: 'json',
                outCharset: 'utf-8',
                page: 'detail',
                type: 'top',
                tpl: 3,
                song_begin: songBegin,
                song_num: num,
            },
            headers: { Referer: 'https://y.qq.com/' },
            timeout: 10000,
        });
        const data = res.data || {};
        // 老接口歌曲数据嵌套在 songlist[].data
        const songlist = (Array.isArray(data.songlist) ? data.songlist : [])
            .map((item) => item?.data)
            .filter(Boolean);
        ctx.status = 200;
        ctx.body = {
            response: {
                code: data.code ?? -1,
                subcode: data.subcode ?? 0,
                data: {
                    songlist,
                    cur_song_num: data.cur_song_num,
                    date: data.date,
                },
            },
        };
    }
    catch (error) {
        ctx.status = 500;
        ctx.body = {
            response: {
                code: -1,
                error: String(error),
            },
        };
    }
};
