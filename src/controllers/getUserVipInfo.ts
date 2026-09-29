import { Context } from 'koa';
import services from '../services';

const { getUserVipInfo } = services;

/**
 * getUserVipInfo - 当前登录账号的会员状态
 * GET /getUserVipInfo（需登录 cookie；多用户经请求头隔离）
 * 归一为前端友好结构：level=svip|vip|none + 布尔权益标记，
 * 供顶栏头像会员角标与「音质本地预判」（VIP 歌曲的高音质档直接置灰/拦截，不发注定失败的 vkey 请求）。
 */

/** 上游归一后的节点（services/user/getUserVipInfo 汇总两条上游；字段含义见该文件注释） */
interface VipData {
  vip?: number | string; // 绿钻
  svip?: number | string; // 豪华绿钻（绿钻族高档，≠超级会员）
  hugeVip?: number | string; // 超级会员（唯一可区分超级会员的标志）
  svipKnown?: boolean; // 超级会员档位是否取到（false=未知）
  start?: unknown;
  end?: unknown;
  [key: string]: unknown;
}

const toFlag = (v: unknown): boolean => v === 1 || v === '1' || v === true;
const toText = (v: unknown): string => (typeof v === 'string' ? v : '');

/**
 * 上游 → 前端归一结构。
 *
 * 会员档次（2026-09 真实账号双向核对）：
 *   - 绿钻族 VIP：绿钻 `vip===1` / 豪华绿钻 `svip===1` / 超级会员本身也含绿钻族权益
 *     → 无损（flac）可用，角标为绿色 VIP；
 *   - 超级会员 SVIP：仅 identity.HugeVip===1（可听臻品母带等）→ 角标为金色 SVIP；
 *   - 其余（0/2/3/缺失）→ 无绿钻，不显示角标、不授予无损/母带。
 *
 * ⚠️ 旧版接口的 `svip` 是「豪华绿钻」而非「超级会员」——两者极易混淆，
 * 把豪华绿钻当超级会员会让账号在母带档发出注定被拒（result=104003）的请求。
 */
function fromData(d: VipData) {
  const hugeVip = toFlag(d.hugeVip); // 超级会员
  const luxury = toFlag(d.svip); // 豪华绿钻
  const vipNum = Number(d.vip);
  const vip = Number.isFinite(vipNum) && vipNum > 0 ? vipNum : 0;
  const family = vip === 1 || luxury || hugeVip; // 绿钻级权益（含豪华绿钻、超级会员）
  return {
    level: hugeVip ? 'svip' : family ? 'vip' : 'none',
    vip,
    luxury, // 豪华绿钻（角标虽同为绿色 VIP，气泡文案据此区分）
    hugeVip: hugeVip ? 1 : 0,
    member: family, // 绿钻级会员（音质预判里 flac 档的判定依据）
    // 超级会员档位未知（上游 B 接口失败）→ 前端对母带档放行，不误挡真超级会员
    svipKnown: d.svipKnown !== false,
    start: toText(d.start),
    end: toText(d.end), // 会员到期时间（官方字段名是 end，非 expire）
  };
}

const EMPTY = {
  level: 'none',
  vip: 0,
  luxury: false,
  hugeVip: 0,
  member: false,
  svipKnown: true,
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
