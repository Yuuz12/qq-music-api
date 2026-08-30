"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const services_1 = __importDefault(require("../services"));
const request_1 = require("../types/core/request");
const { getSearchByType } = services_1.default;
exports.default = async (ctx) => {
    const query = (0, request_1.getTypedQuery)(ctx);
    const { key: w, limit: n, page: p, t } = query;
    if (w) {
        const { status, body } = await getSearchByType({ key: w, limit: n, page: p, t });
        Object.assign(ctx, {
            status,
            body,
        });
    }
    else {
        ctx.status = 400;
        ctx.body = {
            response: 'search key is null',
        };
    }
};
