import { Context } from 'koa';
import services from '../services';

const { delPlaylist } = services;

/**
 * delPlaylist - 删除歌单
 * 用法：POST /delPlaylist
 * body: { dirId: 9 }
 * dirId 为歌单内部序号（getUserProfile.disslist[].dirId）——**不是 tid**，
 * 传 tid 上游返回 1101（param 键不对）。仅能删自己的自建歌单（dirId=201「我喜欢」不可删）。
 * 响应 data.result: { tid, dirId, dirName, updateTime }
 * 免签 musicu.fcg 直连（PlaylistBaseWrite.DelPlaylist），需登录凭据。
 */
export default async (ctx: Context) => {
  const body = (ctx.request as { body?: Record<string, unknown> }).body || {};
  const dirId = Number(body.dirId);

  if (!Number.isFinite(dirId) || dirId <= 0) {
    ctx.status = 400;
    ctx.body = { response: { code: -1, message: 'dirId is required' } };
    return;
  }

  const { status, body: result } = await delPlaylist({ dirId });

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
