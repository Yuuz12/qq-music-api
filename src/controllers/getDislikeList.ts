import { Context } from 'koa';
import services from '../services';

const { getDislikeList } = services;

/**
 * getDislikeList - 不喜欢（黑名单）列表（需登录凭据）
 * GET /getDislikeList
 */
export default async (ctx: Context) => {
  const { status, body: resp } = await getDislikeList();
  const d = resp.response?.req_0?.data || {};
  const code = resp.response?.code ?? -1;

  ctx.status = status;
  ctx.body = {
    response: {
      code,
      data: d,
      message: resp.response?.message || undefined,
    },
  };
};
