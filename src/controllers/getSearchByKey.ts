import { Context } from 'koa';
import services from '../services';
import { getTypedQuery } from '../types/core/request';

const { getSearchByKey } = services;

interface SearchByKeyQuery {
  key: string;
  limit?: string | number;
  page?: string | number;
  catZhida?: string | number;
  /** 搜索类型（上游 client_search_cp 的 t 参数）：0 歌曲 / 2 用户 / 3 歌单 / 7 歌词 / 8 专辑 / 9 歌手 */
  t?: string | number;
}

export default async (ctx: Context) => {
  const query = getTypedQuery<SearchByKeyQuery>(ctx);
  const { key: w, limit: n, page: p, catZhida, t } = query;
  const props = {
    method: 'get',
    params: {
      // w：搜索关键字
      // p：当前页
      // n：每页歌曲数量
      // t：搜索类型（歌曲/用户/歌单/歌词/专辑/歌手）
      // catZhida: 0表示歌曲, 2表示歌手, 3表示专辑, 4, 5
      w,
      n: Number(n) || 10,
      p: Number(p) || 1,
      catZhida: Number(catZhida) || 1,
      t: Number(t) || 0,
    },
    option: {},
  };
  if (w) {
    const { status, body } = await getSearchByKey(props);
    Object.assign(ctx, {
      status,
      body,
    });
  } else {
    ctx.status = 400;
    ctx.body = {
      response: 'search key is null',
    };
  }
};
