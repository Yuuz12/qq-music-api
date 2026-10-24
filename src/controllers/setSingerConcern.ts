import { Context } from 'koa';
import services from '../services';

const { setSingerConcern } = services;

/**
 * setSingerConcern - 关注 / 取关歌手
 * 用法：POST /setSingerConcern
 * body: { singermid: '0025NhlN2yWrP4', isFollow?: false }
 * isFollow=false → 关注；isFollow=true → 取关（传的是「当前是否已关注」）
 */
export default async (ctx: Context) => {
  const body = (ctx.request as { body?: Record<string, unknown> }).body || {};
  const singermid = String(body.singermid ?? '').trim();

  if (!singermid) {
    ctx.status = 400;
    ctx.body = { response: { code: -1, message: 'singermid is required' } };
    return;
  }

  const { status, body: result } = await setSingerConcern({
    singermid,
    isFollow: Boolean(body.isFollow),
  });

  const resp = result.response as {
    code?: number;
    message?: string;
    req_0?: unknown;
  };
  ctx.status = status;
  ctx.body = {
    response: {
      code: resp?.code ?? -1,
      message: resp?.message || undefined,
    },
  };
};
