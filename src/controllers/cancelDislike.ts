import { Context } from 'koa';
import services from '../services';

const { cancelDislike } = services;

/**
 * cancelDislike - 取消不喜欢，从黑名单恢复（需登录凭据）
 * POST /cancelDislike  body: { songId }
 * 响应 data.innerCode === 0 表示成功
 */
export default async (ctx: Context) => {
  const body = (ctx.request as { body?: Record<string, unknown> }).body || {};
  const songId = Number(body.songId);
  if (!songId) {
    ctx.status = 400;
    ctx.body = { response: { code: -1, message: 'songId is required' } };
    return;
  }

  const { status, body: resp } = await cancelDislike(songId);
  const d = resp.response?.req_0?.data || {};
  const code = resp.response?.code ?? -1;

  ctx.status = status;
  ctx.body = {
    response: {
      code,
      data: {
        innerCode: d.code ?? d.ret ?? 0,
      },
      message: resp.response?.message || undefined,
    },
  };
};
