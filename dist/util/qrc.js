"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.qrcDecryptHex = qrcDecryptHex;
exports.qrcXmlToLrc = qrcXmlToLrc;
exports.qrcXmlToWordData = qrcXmlToWordData;
/**
 * QQ 音乐 QRC 歌词解密（2026-08 新增，适配音译歌词）
 *
 * GetPlayLyricInfo（musicu.fcg，crypt:1）返回的 lyric/trans/roma 均为
 * QRC 加密的 hex 字符串。解密 = 魔改 DES 三重运算（EDE）后 zlib 解压：
 *   3DES 密钥 "!@#)(*$%123ZXC!@!@#)(NHL"（= K1|K2|K3，各 8 字节），
 *   解密方向 D(K3) → E(K2) → D(K1)，每块 8 字节 ECB、无填充。
 * 注意：该 DES 的 S 盒与标准 DES 有两处差异（S2[1][7]=15、S4[3][5]=10），
 * 且 S 盒索引位序特殊（sBoxBit 重排），Node 内置 crypto 无法完成，需本实现。
 * 来源：lx-music-api-server（GPL-3.0）utils/crypt/des.py + modules/lyric/tx.py。
 */
const node_zlib_1 = __importDefault(require("node:zlib"));
const SBOX = [
    [14, 4, 13, 1, 2, 15, 11, 8, 3, 10, 6, 12, 5, 9, 0, 7, 0, 15, 7, 4, 14, 2, 13, 1, 10, 6, 12, 11, 9, 5, 3, 8, 4, 1, 14, 8, 13, 6, 2, 11, 15, 12, 9, 7, 3, 10, 5, 0, 15, 12, 8, 2, 4, 9, 1, 7, 5, 11, 3, 14, 10, 0, 6, 13],
    [15, 1, 8, 14, 6, 11, 3, 4, 9, 7, 2, 13, 12, 0, 5, 10, 3, 13, 4, 7, 15, 2, 8, 15, 12, 0, 1, 10, 6, 9, 11, 5, 0, 14, 7, 11, 10, 4, 13, 1, 5, 8, 12, 6, 9, 3, 2, 15, 13, 8, 10, 1, 3, 15, 4, 2, 11, 6, 7, 12, 0, 5, 14, 9],
    [10, 0, 9, 14, 6, 3, 15, 5, 1, 13, 12, 7, 11, 4, 2, 8, 13, 7, 0, 9, 3, 4, 6, 10, 2, 8, 5, 14, 12, 11, 15, 1, 13, 6, 4, 9, 8, 15, 3, 0, 11, 1, 2, 12, 5, 10, 14, 7, 1, 10, 13, 0, 6, 9, 8, 7, 4, 15, 14, 3, 11, 5, 2, 12],
    [7, 13, 14, 3, 0, 6, 9, 10, 1, 2, 8, 5, 11, 12, 4, 15, 13, 8, 11, 5, 6, 15, 0, 3, 4, 7, 2, 12, 1, 10, 14, 9, 10, 6, 9, 0, 12, 11, 7, 13, 15, 1, 3, 14, 5, 2, 8, 4, 3, 15, 0, 6, 10, 10, 13, 8, 9, 4, 5, 11, 12, 7, 2, 14],
    [2, 12, 4, 1, 7, 10, 11, 6, 8, 5, 3, 15, 13, 0, 14, 9, 14, 11, 2, 12, 4, 7, 13, 1, 5, 0, 15, 10, 3, 9, 8, 6, 4, 2, 1, 11, 10, 13, 7, 8, 15, 9, 12, 5, 6, 3, 0, 14, 11, 8, 12, 7, 1, 14, 2, 13, 6, 15, 0, 9, 10, 4, 5, 3],
    [12, 1, 10, 15, 9, 2, 6, 8, 0, 13, 3, 4, 14, 7, 5, 11, 10, 15, 4, 2, 7, 12, 9, 5, 6, 1, 13, 14, 0, 11, 3, 8, 9, 14, 15, 5, 2, 8, 12, 3, 7, 0, 4, 10, 1, 13, 11, 6, 4, 3, 2, 12, 9, 5, 15, 10, 11, 14, 1, 7, 6, 0, 8, 13],
    [4, 11, 2, 14, 15, 0, 8, 13, 3, 12, 9, 7, 5, 10, 6, 1, 13, 0, 11, 7, 4, 9, 1, 10, 14, 3, 5, 12, 2, 15, 8, 6, 1, 4, 11, 13, 12, 3, 7, 14, 10, 15, 6, 8, 0, 5, 9, 2, 6, 11, 13, 8, 1, 4, 10, 7, 9, 5, 0, 15, 14, 2, 3, 12],
    [13, 2, 8, 4, 6, 15, 11, 1, 10, 9, 3, 14, 5, 0, 12, 7, 1, 15, 13, 8, 10, 3, 7, 4, 12, 5, 6, 11, 0, 14, 9, 2, 7, 11, 4, 1, 9, 12, 14, 2, 0, 6, 10, 13, 15, 3, 5, 8, 2, 1, 14, 7, 4, 10, 8, 13, 15, 12, 9, 0, 3, 5, 6, 11],
];
const KEY_RND_SHIFT = [1, 1, 2, 2, 2, 2, 2, 2, 1, 2, 2, 2, 2, 2, 2, 1];
const KEY_PERM_C = [56, 48, 40, 32, 24, 16, 8, 0, 57, 49, 41, 33, 25, 17, 9, 1, 58, 50, 42, 34, 26, 18, 10, 2, 59, 51, 43, 35];
const KEY_PERM_D = [62, 54, 46, 38, 30, 22, 14, 6, 61, 53, 45, 37, 29, 21, 13, 5, 60, 52, 44, 36, 28, 20, 12, 4, 27, 19, 11, 3];
const KEY_COMPRESSION = [13, 16, 10, 23, 0, 4, 2, 27, 14, 5, 20, 9, 22, 18, 11, 3, 25, 7, 15, 6, 26, 19, 12, 1, 40, 51, 30, 36, 46, 54, 29, 39, 50, 44, 32, 47, 43, 48, 38, 55, 33, 52, 45, 41, 49, 35, 28, 31];
const KEY1 = Buffer.from('!@#)(NHL');
const KEY2 = Buffer.from('123ZXC!@');
const KEY3 = Buffer.from('!@#)(*$%');
/** 从 8 字节数组 a 取位 b，放到结果位 c（与 Python 版 bitnum 一致） */
function bitNum(a, b, c) {
    const byteIndex = Math.floor(b / 32) * 4 + 3 - Math.floor((b % 32) / 8);
    const bitPos = 7 - (b % 8);
    return ((a[byteIndex] >> bitPos) & 1) << c;
}
/** 32 位整数 a 的位 b（0=MSB）→ 结果位 c */
function bitNumIntR(a, b, c) {
    return ((a >> (31 - b)) & 1) << c;
}
/** a 的位 b → 结果位 c（>>> 防 JS 符号扩展，Python 无符号语义） */
function bitNumIntL(a, b, c) {
    return ((a << b) & 0x80000000) >>> c;
}
/** S 盒索引位序重排 */
function sBoxBit(a) {
    return (a & 0x20) | ((a & 0x1f) >> 1) | ((a & 0x01) << 4);
}
function initialPermutation(inputData) {
    const p = (list) => {
        let v = 0;
        for (let i = 0; i < 32; i++)
            v |= bitNum(inputData, list[i], 31 - i);
        return v >>> 0;
    };
    return [
        p([57, 49, 41, 33, 25, 17, 9, 1, 59, 51, 43, 35, 27, 19, 11, 3, 61, 53, 45, 37, 29, 21, 13, 5, 63, 55, 47, 39, 31, 23, 15, 7]),
        p([56, 48, 40, 32, 24, 16, 8, 0, 58, 50, 42, 34, 26, 18, 10, 2, 60, 52, 44, 36, 28, 20, 12, 4, 62, 54, 46, 38, 30, 22, 14, 6]),
    ];
}
function inversePermutation(s0, s1) {
    const data = Buffer.alloc(8);
    const byte = (s1bits, s0bits) => {
        let v = 0;
        for (let k = 0; k < 8; k++) {
            v |= bitNumIntR(k % 2 === 0 ? s1 : s0, (k % 2 === 0 ? s1bits : s0bits)[k], 7 - k);
        }
        return v;
    };
    data[3] = byte([7, 7, 15, 15, 23, 23, 31, 31], [7, 7, 15, 15, 23, 23, 31, 31]);
    data[2] = byte([6, 6, 14, 14, 22, 22, 30, 30], [6, 6, 14, 14, 22, 22, 30, 30]);
    data[1] = byte([5, 5, 13, 13, 21, 21, 29, 29], [5, 5, 13, 13, 21, 21, 29, 29]);
    data[0] = byte([4, 4, 12, 12, 20, 20, 28, 28], [4, 4, 12, 12, 20, 20, 28, 28]);
    data[7] = byte([3, 3, 11, 11, 19, 19, 27, 27], [3, 3, 11, 11, 19, 19, 27, 27]);
    data[6] = byte([2, 2, 10, 10, 18, 18, 26, 26], [2, 2, 10, 10, 18, 18, 26, 26]);
    data[5] = byte([1, 1, 9, 9, 17, 17, 25, 25], [1, 1, 9, 9, 17, 17, 25, 25]);
    data[4] = byte([0, 0, 8, 8, 16, 16, 24, 24], [0, 0, 8, 8, 16, 16, 24, 24]);
    return data;
}
/** DES 轮函数（E 扩展 → 与子钥异或 → 魔改 S 盒 → P 置换） */
function fRound(state, key) {
    const t1 = bitNumIntL(state, 31, 0) | ((state & 0xf0000000) >>> 1) | bitNumIntL(state, 4, 5) | bitNumIntL(state, 3, 6) |
        ((state & 0x0f000000) >>> 3) | bitNumIntL(state, 8, 11) | bitNumIntL(state, 7, 12) | ((state & 0x00f00000) >>> 5) |
        bitNumIntL(state, 12, 17) | bitNumIntL(state, 11, 18) | ((state & 0x000f0000) >>> 7) | bitNumIntL(state, 16, 23);
    const t2 = bitNumIntL(state, 15, 0) | ((state & 0x0000f000) << 15) | bitNumIntL(state, 20, 5) | bitNumIntL(state, 19, 6) |
        ((state & 0x00000f00) << 13) | bitNumIntL(state, 24, 11) | bitNumIntL(state, 23, 12) | ((state & 0x000000f0) << 11) |
        bitNumIntL(state, 28, 17) | bitNumIntL(state, 27, 18) | ((state & 0x0000000f) << 9) | bitNumIntL(state, 0, 23);
    const lrg = [
        (t1 >>> 24) & 0xff, (t1 >>> 16) & 0xff, (t1 >>> 8) & 0xff,
        (t2 >>> 24) & 0xff, (t2 >>> 16) & 0xff, (t2 >>> 8) & 0xff,
    ].map((v, i) => v ^ key[i]);
    let out = (SBOX[0][sBoxBit(lrg[0] >> 2)] << 28) |
        (SBOX[1][sBoxBit(((lrg[0] & 0x03) << 4) | (lrg[1] >> 4))] << 24) |
        (SBOX[2][sBoxBit(((lrg[1] & 0x0f) << 2) | (lrg[2] >> 6))] << 20) |
        (SBOX[3][sBoxBit(lrg[2] & 0x3f)] << 16) |
        (SBOX[4][sBoxBit(lrg[3] >> 2)] << 12) |
        (SBOX[5][sBoxBit(((lrg[3] & 0x03) << 4) | (lrg[4] >> 4))] << 8) |
        (SBOX[6][sBoxBit(((lrg[4] & 0x0f) << 2) | (lrg[5] >> 6))] << 4) |
        SBOX[7][sBoxBit(lrg[5] & 0x3f)];
    out =
        (bitNumIntL(out, 15, 0) | bitNumIntL(out, 6, 1) | bitNumIntL(out, 19, 2) | bitNumIntL(out, 20, 3) |
            bitNumIntL(out, 28, 4) | bitNumIntL(out, 11, 5) | bitNumIntL(out, 27, 6) | bitNumIntL(out, 16, 7) |
            bitNumIntL(out, 0, 8) | bitNumIntL(out, 14, 9) | bitNumIntL(out, 22, 10) | bitNumIntL(out, 25, 11) |
            bitNumIntL(out, 4, 12) | bitNumIntL(out, 17, 13) | bitNumIntL(out, 30, 14) | bitNumIntL(out, 9, 15) |
            bitNumIntL(out, 1, 16) | bitNumIntL(out, 7, 17) | bitNumIntL(out, 23, 18) | bitNumIntL(out, 13, 19) |
            bitNumIntL(out, 31, 20) | bitNumIntL(out, 26, 21) | bitNumIntL(out, 2, 22) | bitNumIntL(out, 8, 23) |
            bitNumIntL(out, 18, 24) | bitNumIntL(out, 12, 25) | bitNumIntL(out, 29, 26) | bitNumIntL(out, 5, 27) |
            bitNumIntL(out, 21, 28) | bitNumIntL(out, 10, 29) | bitNumIntL(out, 3, 30) | bitNumIntL(out, 24, 31)) >>> 0;
    return out;
}
function keySchedule(key8, decrypt) {
    const schedule = Array.from({ length: 16 }, () => new Array(6).fill(0));
    let c = 0;
    let d = 0;
    for (let i = 0; i < 28; i++) {
        c |= bitNum(key8, KEY_PERM_C[i], 31 - i);
        d |= bitNum(key8, KEY_PERM_D[i], 31 - i);
    }
    for (let i = 0; i < 16; i++) {
        c = ((c << KEY_RND_SHIFT[i]) | (c >>> (28 - KEY_RND_SHIFT[i]))) & 0xfffffff0;
        d = ((d << KEY_RND_SHIFT[i]) | (d >>> (28 - KEY_RND_SHIFT[i]))) & 0xfffffff0;
        const toGen = decrypt ? 15 - i : i;
        for (let j = 0; j < 24; j++)
            schedule[toGen][j >> 3] |= bitNumIntR(c, KEY_COMPRESSION[j], 7 - (j % 8));
        for (let j = 24; j < 48; j++)
            schedule[toGen][j >> 3] |= bitNumIntR(d, KEY_COMPRESSION[j] - 27, 7 - (j % 8));
    }
    return schedule;
}
function desCrypt(input8, schedule) {
    let [s0, s1] = initialPermutation(input8);
    for (let idx = 0; idx < 15; idx++) {
        const prev = s1;
        s1 = (fRound(s1, schedule[idx]) ^ s0) >>> 0;
        s0 = prev;
    }
    s0 = (fRound(s1, schedule[15]) ^ s0) >>> 0;
    return inversePermutation(s0, s1);
}
function funcDes(buff, key8, decrypt) {
    const schedule = keySchedule(key8, decrypt);
    const out = Buffer.alloc(buff.length);
    for (let i = 0; i + 8 <= buff.length; i += 8) {
        desCrypt(buff.subarray(i, i + 8), schedule).copy(out, i);
    }
    return out;
}
/**
 * QRC 密文（hex 字符串）→ 明文文本。
 * 三重：D(KEY1) → E(KEY2) → D(KEY3)（各 8 字节密钥，与 lx-music 一致），再 zlib 解压。
 */
function qrcDecryptHex(hex) {
    if (!hex)
        return '';
    const buf = Buffer.from(String(hex).trim(), 'hex');
    let out = funcDes(buf, KEY1, true);
    out = funcDes(out, KEY2, false);
    out = funcDes(out, KEY3, true);
    return node_zlib_1.default.inflateSync(out).toString('utf8');
}
/** 毫秒 → [mm:ss.mmm]（与 lx-music msFormat 一致） */
function msFormat(ms) {
    const m = String(Math.floor(ms / 60000)).padStart(2, '0');
    const s = String(Math.floor((ms % 60000) / 1000)).padStart(2, '0');
    const f = String(ms % 1000).padStart(3, '0');
    return `[${m}:${s}.${f}]`;
}
/**
 * 提取 QRC XML 的 LyricContent 属性值。
 * 上游 QRC 的歌词文本里可能含未转义的英文双引号，非贪婪正则 /LyricContent="([\s\S]*?)"/
 * 会在第一个引号处截断，导致该行及后续歌词全部丢失。
 * 改为定位 LyricContent 的真正收尾引号：其后的空白 + LyricInfo 标签闭合（/> 或 >）。
 * 返回空串表示未找到。
 */
function extractLyricContent(xml) {
    const s = String(xml);
    const key = 'LyricContent="';
    const i = s.indexOf(key);
    if (i < 0)
        return '';
    const rest = s.slice(i + key.length);
    const close = rest.match(/"\s*(?:\/>|>)/);
    if (!close || close.index == null)
        return '';
    return rest.slice(0, close.index);
}
/**
 * QRC XML（<QrcInfos>…LyricContent="…"）→ 行级标准 LRC。
 * QRC 行为 "[起始ms,结束ms]文本(逐字时间,时长)…"，转成前端可解析的 [mm:ss.mmm]文本。
 */
function qrcXmlToLrc(xml) {
    const content = extractLyricContent(xml);
    if (!content)
        return '';
    const lines = [];
    for (const raw of content.split('\n')) {
        const t = raw.match(/^\[(\d+),\d+\]/);
        if (!t)
            continue;
        const text = raw.replace(/\[(\d+),\d+\]/, '').replace(/\(\d+,\d+\)/g, '').trim();
        lines.push(msFormat(Number(t[1])) + text);
    }
    return lines.join('\n');
}
/**
 * QRC XML → 逐字歌词数据（KTV 逐字高亮用）。
 * 返回 { lrc, words }：
 *   lrc   行级 LRC（与 qrcXmlToLrc 相同）
 *   words 行起始ms → [{ text, start(ms, 相对行首), end(ms, 相对行首) }]
 * 词文本取括号前的紧邻文本（与 lx-music 的逐字解析语义一致）；
 * 无逐字信息的行整体记为一个词（前端退化整行高亮）。
 */
function qrcXmlToWordData(xml) {
    const content = extractLyricContent(xml);
    const out = {};
    const lines = [];
    if (!content)
        return { lrc: lines.join('\n'), words: out };
    for (const raw of content.split('\n')) {
        const t = raw.match(/^\[(\d+),(\d+)\]/);
        if (!t)
            continue;
        const rowStart = Number(t[1]);
        const rowEnd = rowStart + Number(t[2]);
        const body = raw.replace(/\[(\d+),\d+\]/, '').trim();
        const plain = body.replace(/\(\d+,\d+\)/g, '').replace(/\s+/g, ' ').trim();
        lines.push(msFormat(rowStart) + plain);
        // 逐字：QRC 行体 = 逐词文本 + (起始,时长) 标记交替配对，行首无独立前导文本——
        // 如 "词(2250,450)：(2700,450)周…" 中 "词" 就是第一个词（第一个标记即它的时间）
        const pieces = body.split(/(\(\d+,\d+\))/g);
        const spans = [];
        for (let i = 0; i + 1 < pieces.length; i += 2) {
            const mm = pieces[i + 1].match(/^\((\d+),(\d+)\)$/);
            if (!mm)
                continue;
            spans.push({ text: pieces[i], start: Number(mm[1]) - rowStart, dur: Number(mm[2]) });
        }
        const words = [];
        for (let i = 0; i < spans.length; i++) {
            const raw = spans[i].text;
            if (raw === '')
                continue; // 空串词丢弃；纯空格词保留（词间空格可见）
            const end = i + 1 < spans.length ? Math.min(spans[i + 1].start, spans[i].start + spans[i].dur) : Math.min(rowEnd - rowStart, spans[i].start + spans[i].dur);
            words.push({ text: raw, start: spans[i].start, end });
        }
        out[String(rowStart)] = words.length ? words : [{ text: plain, start: 0, end: rowEnd - rowStart }];
    }
    return { lrc: lines.join('\n'), words: out };
}
