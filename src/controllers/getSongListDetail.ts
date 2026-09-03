import services from '../services';

const { songListDetail, aiSongListDetail } = services;

/**
 * @description: 2, 3
 * @param {page} 页数
 * @param {limit} 每页条数[20, 60]
 * @param {categoryId} 分类
 * @param {sortId} 分类
 * @return:
 */
import { Context } from 'koa';

/**
 * 歌单详情：传统歌单走 qzone-music fcg 通道；
 * 官方 AI 歌单（百万收藏 211111 / 新歌推荐 211207 等推荐页官方歌单）
 * 旧通道恒返 code 10（带 cookie 也不行），失败时回落 aiDissInfo 通道。
 * AI 通道需登录 cookie，匿名时上游 80120 → 原样返回首次的 code 10。
 */
export default async (ctx: Context) => {
  const disstid = String(ctx.query.disstid || '');
  const props = {
    method: 'get',
    params: {
      disstid,
    },
    option: {},
  };
  let { status, body } = await songListDetail(props);
  const firstCode = Number((body as { response?: { code?: unknown } } | undefined)?.response?.code);
  if (firstCode !== 0) {
    const ai = await aiSongListDetail({ method: 'post', params: { disstid }, option: {} });
    if (Number(ai.body?.response?.code) === 0) {
      status = ai.status;
      body = ai.body;
    }
  }
  Object.assign(ctx, {
    status,
    body,
  });
};
