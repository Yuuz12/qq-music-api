"use strict";
/**
 * 官方通道代理（npm run proxy）调用失败时的错误整理。
 * 实测（2026-09）：Node + axios 在 localhost 连接被拒时，错误对象形态不唯一：
 *   - ESM 直连 127.0.0.1：AxiosError，message="connect ECONNREFUSED ..."，code=ECONNREFUSED
 *   - 服务进程（CJS/ts-node）连 localhost：name="AggregateError"、message=""（空）、
 *     code=ECONNREFUSED、无 errors[]、cause 为空
 * 因此优先用 code 判定可达性，其次拆解 AggregateError.errors[]，兜底给占位文案，
 * 避免把空字符串透传给前端。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.proxyFailureText = proxyFailureText;
/** 把代理调用失败整理成可读文案；返回的文案可能带「代理未启动」提示，直接给前端展示 */
function proxyFailureText(error) {
    const e = error;
    if (!e)
        return '代理调用失败';
    const code = e.code || '';
    const isRefused = code === 'ECONNREFUSED' || /ECONNREFUSED|fetch failed/i.test(String(e.message || ''));
    if (isRefused) {
        return `${e.message || '无法连接写代理'}（代理未启动：请先运行 npm run proxy）`;
    }
    // AggregateError 的 message 常为空，拆解 errors[] 取第一条真实原因
    if (Array.isArray(e.errors) && e.errors.length) {
        const first = e.errors.find((x) => x && x.message);
        if (first?.message)
            return String(first.message);
    }
    return String(e.message || `代理调用失败（${code || '未知错误'}）`);
}
