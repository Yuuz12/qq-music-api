import { Context } from 'koa';
import services from '../services';

const { refreshCredential } = services;

/**
 * refreshCredential - 刷新登录（延长 QQ 登录有效期，对应 jsososo /user/refresh）
 * GET /user/refresh
 *
 * 用当前凭据的 musickey 向上游换发新 musickey；多用户模式下服务端不落盘，
 * 新 key 放在 response.data.musickey 返回，由前端更新本地凭据后再继续使用。
 * response.code：0 成功 / 301 未配置凭据 / 1000 登录已失效（需重新扫码）/ 其他为上游错误码。
 */
export default async (ctx: Context) => {
  const { status, body } = await refreshCredential();
  ctx.status = status;
  ctx.body = body;
};
