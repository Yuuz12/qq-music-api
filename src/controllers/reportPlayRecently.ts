import { Context } from 'koa';
import services from '../services';

const { reportPlayRecently } = services;

/**
 * reportPlayRecently - 上报最近播放（每播一首歌调用一次，需登录凭据）
 * POST /reportPlayRecently  body: { songId }
 * 响应 data.timeList[0].code === 0 表示写入成功（服务器在 lastTime/listenCnt 上累加）
 */
export default async (ctx: Context) => {
  const body = (ctx.request as { body?: Record<string, unknown> }).body || {};
  const songId = Number(body.songId);
  if (!songId) {
    ctx.status = 400;
    ctx.body = { response: { code: -1, message: 'songId is required' } };
    return;
  }

  const { status, body: resp } = await reportPlayRecently(songId);
  const d = resp.response?.req_0?.data || {};
  const item = Array.isArray(d.timeList) ? d.timeList[0] : undefined;

  ctx.status = status;
  ctx.body = {
    response: {
      code: resp.response?.code ?? -1,
      data: {
        // 内层业务码：timeList[0].code 0=写入成功
        innerCode: item?.code ?? d.ret ?? 0,
        updateTime: item?.updateTime || 0,
      },
      message: resp.response?.message || undefined,
    },
  };
};
