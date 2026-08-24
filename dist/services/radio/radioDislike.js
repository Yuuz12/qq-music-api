"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const config_1 = require("../../config");
const requestCredential_1 = require("../../util/requestCredential");
exports.default = async ({ radioId = 99, songId, songType = 0 } = {}) => {
    const uin = (0, requestCredential_1.getRequestUin)();
    const guid = Number(config_1._guid) || 0;
    const statUrl = [
        'http://stat.pc.music.qq.com/fcgi-bin/fcg_val_report.fcg',
        `?data_type=112&version=1502&uin=${encodeURIComponent(uin)}`,
        `&guid=${guid}&method=0&data=${encodeURIComponent(String(radioId))}`,
        `&data2=15&data3=${encodeURIComponent(String(songId ?? ''))}`,
        `&songtype=${Number(songType) || 0}&data4=0&_r=${Date.now()}`,
    ].join('');
    try {
        // 统计上报为 fire-and-forget，失败不影响业务
        await axios_1.default.get(statUrl, {
            headers: {
                Referer: 'https://y.qq.com/',
                Cookie: (0, requestCredential_1.getRequestCookie)(),
            },
            timeout: 3000,
        });
        return {
            status: 200,
            body: {
                response: {
                    code: 0,
                    data: {
                        reported: true,
                    },
                },
            },
        };
    }
    catch (error) {
        return {
            status: 200,
            body: {
                response: {
                    code: 0,
                    data: {
                        reported: false,
                        error: String(error),
                    },
                },
            },
        };
    }
};
