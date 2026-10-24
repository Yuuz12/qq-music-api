import { Context } from 'koa';
import services from '../services';

const { addPlaylist } = services;

/**
 * addPlaylist - 创建歌单
 * 用法：POST /addPlaylist
 * body: { dirName: '我的歌单' }
 * 响应 data.result: { tid, dirId, dirName, updateTime }（dirId 为后续加歌/删歌单用的内部序号）
 * 免签 musicu.fcg 直连（PlaylistBaseWrite.AddPlaylist），需登录凭据。
 */
export default async (ctx: Context) => {
  const body = (ctx.request as { body?: Record<string, unknown> }).body || {};
  const dirName = String(body.dirName ?? '').trim();

  if (!dirName) {
    ctx.status = 400;
    ctx.body = { response: { code: -1, message: 'dirName is required' } };
    return;
  }

  const { status, body: result } = await addPlaylist({ dirName });

  // 统一响应：把上游 req_1 的 code/data 提升到 response
  const resp = result.response as {
    code?: number;
    message?: string;
    req_1?: { code?: number; data?: { result?: unknown; [k: string]: unknown } };
  };
  const upstream = resp?.req_1;
  ctx.status = status;
  ctx.body = {
    response: {
      code: upstream?.code ?? resp?.code ?? -1,
      data: upstream?.data?.result ?? null,
      message: resp?.message || undefined,
    },
  };
};
