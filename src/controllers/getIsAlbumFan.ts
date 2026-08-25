import { Context } from 'koa';
import services from '../services';

const { getIsAlbumFan } = services;

/**
 * getIsAlbumFan - 批量查询专辑收藏状态（专辑页「收藏」按钮高亮）
 * 用法：POST /getIsAlbumFan
 * body: { albummids: ['0016l2F430zMux', ...] }
 * 响应 data: { m_fan: { [albummid]: 1 | 0 } }
 */
export default async (ctx: Context) => {
  const body = (ctx.request as { body?: Record<string, unknown> }).body || {};
  const albummids = Array.isArray(body.albummids) ? (body.albummids as (string | number)[]) : [];

  if (!albummids.length) {
    ctx.status = 400;
    ctx.body = { response: { code: -1, message: 'albummids is required' } };
    return;
  }

  const { status, body: result } = await getIsAlbumFan({ albummids });

  // 统一响应：把 musicu.fcg 的 req_0 数据提升到 response.data
  const upstream = result.response.req_0 || null;
  ctx.status = status;
  ctx.body = {
    response: {
      code: upstream ? upstream.code : result.response.code,
      data: upstream?.data ?? null,
      // 服务层失败（如上游网络错误/414）时透出原因，便于前端与 Explorer 排查
      message: result.response.message || undefined,
    },
  };
};
