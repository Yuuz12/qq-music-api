"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const observability_1 = require("../../util/observability");
const y_common_1 = __importDefault(require("../y_common"));
// 上游路径（本播放器项目适配 2026-08）：
// 旧路径 /qzone/fcg-bin/... 已触发 "check privacy error"（subcode 4000），
// 需改为 /qzone-music/fcg-bin/... 新路径（公开歌单免登录、私有歌单带 cookie 均可返回）。
// git pull 更新上游时此路径可能被还原，需留意（同 getRanks 适配说明）。
const upstream = '/qzone-music/fcg-bin/fcg_ucc_getcdinfo_byids_cp.fcg';
exports.default = ({ method = 'get', params = {}, option = {} }) => {
    const data = Object.assign(params, {
        format: 'json',
        outCharset: 'utf-8',
        type: 1,
        json: 1,
        utf8: 1,
        onlysong: 0,
        new_format: 1,
    });
    const options = Object.assign(option, {
        params: data,
    });
    (0, observability_1.logServiceRequest)('songListDetail', upstream, data);
    return (0, y_common_1.default)({
        url: upstream,
        method,
        options,
    })
        .then((res) => {
        const response = res.data;
        (0, observability_1.logServiceSuccess)('songListDetail', upstream, response, {
            disstid: data.disstid,
        });
        return {
            status: 200,
            body: {
                response,
            },
        };
    })
        .catch((error) => {
        (0, observability_1.logServiceFailure)('songListDetail', upstream, error, data);
        return {
            status: 500,
            body: {
                error,
            },
        };
    });
};
