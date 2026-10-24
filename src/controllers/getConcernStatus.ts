import { Context } from 'koa';
import services from '../services';

const { getConcernStatus } = services;

/** 把 body 字段规整成去空、去重的字符串数组（兼容单个字符串） */
const toList = (raw: unknown): string[] => {
  const arr = Array.isArray(raw) ? raw : String(raw ?? '').trim() ? [raw] : [];
  return arr.map((x) => String(x ?? '').trim()).filter(Boolean);
};

/**
 * getConcernStatus - 批量查询关注状态（歌手页 / 他人主页「关注」按钮高亮）
 * 用法：POST /getConcernStatus
 * body: { mids?: ['0025NhlN2yWrP4'], encuins?: ['oivioeol7i6P7c**'] }（至少一个）
 * 响应 data: { map_singer_status: { [mid]: 1|0 }, map_user_status: { [encuin]: 1|0 } }
 */
export default async (ctx: Context) => {
  const body = (ctx.request as { body?: Record<string, unknown> }).body || {};
  const mids = toList(body.mids);
  const encuins = toList(body.encuins);

  if (!mids.length && !encuins.length) {
    ctx.status = 400;
    ctx.body = { response: { code: -1, message: 'mids or encuins is required' } };
    return;
  }

  const { status, body: result } = await getConcernStatus({ mids, encuins });

  // 统一响应：把 musicu.fcg 的 req_0 数据提升到 response.data
  const upstream = result.response.req_0 || null;
  ctx.status = status;
  ctx.body = {
    response: {
      code: upstream ? upstream.code : result.response.code,
      data: upstream?.data ?? null,
      // 服务层失败（如上游网络错误）时透出原因，便于前端与 Explorer 排查
      message: result.response.message || undefined,
    },
  };
};
