"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const observability_1 = require("../../util/observability");
const y_common_1 = __importDefault(require("../y_common"));
const upstream = '/soso/fcgi-bin/client_search_cp';
exports.default = ({ method = 'get', params = {}, option = {} }) => {
    const data = Object.assign(params, {
        format: 'json',
        outCharset: 'utf-8',
        ct: 24,
        qqmusic_ver: 1298,
        // https://github.com/Rain120/qq-music-api/issues/68
        // Upstream returns code:0 with totalnum:0 (empty song list) when new_json=1.
        // new_json: 1,
        remoteplace: 'txt.yqq.song',
        // searchid: 58932895599763136,
        t: 0,
        aggr: 1,
        cr: 1,
        lossless: 0,
        flag_qc: 0,
        platform: 'yqq.json',
    });
    const options = Object.assign(option, {
        params: data,
    });
    (0, observability_1.logServiceRequest)('getSearchByKey', upstream, data);
    return (0, y_common_1.default)({
        url: upstream,
        method,
        options,
    })
        .then((res) => {
        const response = res.data;
        (0, observability_1.logServiceSuccess)('getSearchByKey', upstream, response, {
            keyword: typeof data.w === 'string' ? data.w : undefined,
        });
        return {
            status: 200,
            body: {
                response,
            },
        };
    })
        .catch((error) => {
        (0, observability_1.logServiceFailure)('getSearchByKey', upstream, error, data);
        return {
            status: 500,
            body: {
                error,
            },
        };
    });
};
