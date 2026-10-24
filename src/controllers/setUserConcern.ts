import { Context } from 'koa';
import services from '../services';

const { setUserConcern } = services;

/**
 * setUserConcern - 关注 / 取关普通用户
 * 用法：POST /setUserConcern
 * body: { encuin: 'oivioeol7i6P7c**', isFollow?: false }
 * isFollow=false → 关注；isFollow=true → 取关（传的是「当前是否已关注」）
 */
export default async (ctx: Context) => {
  const body = (ctx.request as { body?: Record<string, unknown> }).body || {};
  const encuin = String(body.encuin ?? '').trim();

  if (!encuin) {
    ctx.status = 400;
    ctx.body = { response: { code: -1, message: 'encuin is required' } };
    return;
  }

  const { status, body: result } = await setUserConcern({
    encuin,
    isFollow: Boolean(body.isFollow),
  });

  const resp = result.response as {
    code?: number;
    message?: string;
  };
  ctx.status = status;
  ctx.body = {
    response: {
      code: resp?.code ?? -1,
      message: resp?.message || undefined,
    },
  };
};
