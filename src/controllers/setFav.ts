import { Context } from 'koa';
import services from '../services';
import { FavSongItem } from '../services/fav/setFav';

const { setFav } = services;

/**
 * setFav - 添加/取消喜欢（猜你喜欢页「喜欢」按钮）
 * 用法：POST /setFav
 * body: { dirId?: 201, songs: [{ songId, songType? }], isFan?: false }
 * isFan=false → AddSonglist（添加到「我喜欢」）；isFan=true → DelSonglist（取消喜欢）
 */
export default async (ctx: Context) => {
  const body = (ctx.request as { body?: Record<string, unknown> }).body || {};
  const songs = Array.isArray(body.songs) ? (body.songs as FavSongItem[]) : [];

  if (!songs.length) {
    ctx.status = 400;
    ctx.body = { response: { code: -1, message: 'songs is required' } };
    return;
  }

  const { status, body: result } = await setFav({
    dirId: body.dirId as string | number | undefined,
    songs,
    isFan: Boolean(body.isFan),
  });

  // 统一响应：把 musicu.fcg 的 req_0 数据提升到 response.data
  const resp = result.response as {
    code?: number;
    message?: string;
    error?: string;
    req_0?: { code?: number; data?: unknown; message?: string };
    [k: number]: { code?: number; data?: unknown; message?: string } | undefined;
  };
  const upstream = resp?.req_0 || resp?.[0] || null;
  ctx.status = status;
  ctx.body = {
    response: {
      code: upstream ? upstream.code : (resp?.code ?? -1),
      data: upstream ? upstream.data : null,
      message: upstream?.message || resp?.error || resp?.message || undefined,
    },
  };
};
