import { Context } from 'koa';
import services from '../services';

const { getUserVipInfo } = services;

/**
 * getUserVipInfo - 当前登录账号的会员状态
 * GET /getUserVipInfo（需登录 cookie；多用户经请求头隔离）
 * 归一为前端友好结构：level=vip|svip|none + 布尔权益标记，
 * 供顶栏头像会员角标与「音质本地预判」（VIP 歌曲的高音质档直接置灰/拦截，不发注定失败的 vkey 请求）。
 */

/** 上游 data 节点（字段以官方 userinfo_detail 为准，2026-09-07 真实凭据实测核对） */
interface VipData {
  vip?: number | string;
  svip?: number | string | boolean;
  start?: unknown;
  end?: unknown;
  [key: string]: unknown;
}

const toFlag = (v: unknown): boolean => v === 1 || v === '1' || v === true;
const toText = (v: unknown): string => (typeof v === 'string' ? v : '');

/**
 * 上游 → 前端归一结构。
 * 语义（官方前端 hasVip 判定 = vip===1 || svip===1；2026-09-07 实测超级会员账号
 * 返回 vip=1、svip=1、end=会员到期时间）：
 * - svip 真值（1/'1'/true）→ 豪华绿钻 SVIP（可听臻品母带等高阶音质）
 * - vip===1 → 绿钻 VIP（可听无损 flac）
 * - 其余（0/2/3/缺失）→ 非绿钻（音乐包等非绿钻权益不显示钻石角标、不授予无损/母带）
 * 若日后某账号实测语义与此不符，只需调整本函数（前端不感知）。
 */
function fromData(d: VipData) {
  const svip = toFlag(d.svip);
  const vipNum = Number(d.vip);
  const vip = Number.isFinite(vipNum) && vipNum > 0 ? vipNum : 0;
  const green = vip === 1 || svip; // 绿钻级权益（含豪华绿钻）：无损可用
  return {
    level: svip ? 'svip' : vip === 1 ? 'vip' : 'none',
    vip,
    svip: svip ? 1 : 0,
    member: green, // 绿钻级会员（音质预判里 flac 档的判定依据）
    start: toText(d.start),
    end: toText(d.end), // 会员到期时间（官方字段名是 end，非 expire）
  };
}

const EMPTY = {
  level: 'none',
  vip: 0,
  svip: 0,
  member: false,
  start: '',
  end: '',
};

export default async (ctx: Context) => {
  const { status, body } = await getUserVipInfo();
  const code = body.response?.code ?? -1;
  const data = (body.response?.data ?? {}) as VipData;
  // 未登录（无凭据/凭据失效）：code!=0 且无 data → 归一为 none（前端不显示角标、不做拦截）
  const hasPayload = body.response && typeof body.response === 'object' && 'data' in body.response;
  if (code === 0 && hasPayload) {
    ctx.status = 200;
    ctx.body = { response: { code: 0, data: fromData(data) } };
    return;
  }
  ctx.status = status === 500 ? status : 200;
  ctx.body = { response: { code: code === 0 ? -1 : code, data: { ...EMPTY } } };
};
