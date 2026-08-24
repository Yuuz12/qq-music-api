"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const config_1 = require("../config");
const logger_1 = require("./logger");
const observability_1 = require("./observability");
require('../util/colors');
// `withCredentials` 表示跨域请求时是否需要使用凭证
axios_1.default.defaults.withCredentials = config_1.requestConfig.withCredentials;
axios_1.default.defaults.timeout = config_1.requestConfig.timeout;
axios_1.default.defaults.headers.post['Content-Type'] = config_1.requestConfig.contentType;
axios_1.default.defaults.responseType = config_1.requestConfig.responseType;
function request(url, method, options = {}, isUUrl = 'c') {
    let baseURL = '';
    switch (isUUrl) {
        case 'y':
            baseURL = config_1.requestConfig.baseURL.y + url;
            break;
        case 'u':
            baseURL = url;
            break;
        case 'c':
            baseURL = config_1.requestConfig.baseURL.c + url;
            break;
        default:
            baseURL = config_1.requestConfig.baseURL.c + url;
            break;
    }
    const axiosMethod = method.toLowerCase();
    const requestConfigOptions = {
        ...options,
        url: baseURL,
        method: axiosMethod,
    };
    logger_1.logger.debug('upstream.requesting', {
        scope: 'request',
        url: baseURL,
        method: axiosMethod,
        params: (0, observability_1.summarizeValue)(options.params),
    });
    return (0, axios_1.default)(requestConfigOptions).then((response) => {
        if (!response) {
            throw Error('response is null');
        }
        logger_1.logger.debug('upstream.succeeded', {
            scope: 'request',
            url: baseURL,
            method: axiosMethod,
            status: response.status,
            result: (0, observability_1.summarizeValue)(response.data),
        });
        return response;
    }, (error) => {
        logger_1.logger.error('upstream.failed', {
            scope: 'request',
            url: baseURL,
            method: axiosMethod,
            error: (0, observability_1.summarizeValue)(error),
        });
        throw error;
    });
}
exports.default = request;
