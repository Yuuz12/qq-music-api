import { Context } from 'koa';
import services from '../services';

const { addDislike } = services;

/**
 * addDislike - 删除这首歌曲（不喜欢），加入黑名单（需登录凭据）
 * POST /addDislike  body: { songId }
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

  const { status, body: resp } = await addDislike(songId);
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
