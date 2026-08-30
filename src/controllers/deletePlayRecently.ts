import { Context } from 'koa';
import services from '../services';

const { deletePlayRecently } = services;

/**
 * deletePlayRecently - 从最近播放删除一首歌（需登录凭据）
 * POST /deletePlayRecently  body: { songId }
 * 响应 data.innerCode === 0 表示删除成功
 */
export default async (ctx: Context) => {
  const body = (ctx.request as { body?: Record<string, unknown> }).body || {};
  const songId = Number(body.songId);
  if (!songId) {
    ctx.status = 400;
    ctx.body = { response: { code: -1, message: 'songId is required' } };
    return;
  }

  const { status, body: resp } = await deletePlayRecently(songId);
  const d = resp.response?.req_0?.data || {};
  const item = Array.isArray(d.timeList) ? d.timeList[0] : undefined;

  ctx.status = status;
  ctx.body = {
    response: {
      code: resp.response?.code ?? -1,
      data: {
        innerCode: item?.code ?? d.ret ?? 0,
        updateTime: item?.updateTime || 0,
      },
      message: resp.response?.message || undefined,
    },
  };
};
