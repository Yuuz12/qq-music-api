import { Context } from 'koa';
import services from '../services';

const { setAlbumFav } = services;

/**
 * setAlbumFav - 收藏/取消收藏专辑
 * 用法：POST /setAlbumFav
 * body: { albumMid: '0016l2F430zMux', isFan?: false }
 * isFan=false → FavAlbum（收藏）；isFan=true → CancelFavAlbum（取消收藏）
 */
export default async (ctx: Context) => {
  const body = (ctx.request as { body?: Record<string, unknown> }).body || {};
  const albumMid = String(body.albumMid ?? '').trim();

  if (!albumMid) {
    ctx.status = 400;
    ctx.body = { response: { code: -1, message: 'albumMid is required' } };
    return;
  }

  const { status, body: result } = await setAlbumFav({
    albumMid,
    isFan: Boolean(body.isFan),
  });

  // 统一响应：把代理返回的 code/message/data 透出
  const resp = result.response as {
    code?: number;
    message?: string;
    error?: string;
    data?: unknown;
  };
  ctx.status = status;
  ctx.body = {
    response: {
      code: resp?.code ?? -1,
      data: resp?.data ?? null,
      message: resp?.message || resp?.error || undefined,
    },
  };
};
