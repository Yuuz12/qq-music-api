import { Context } from 'koa';
import services from '../services';
import { getTypedQuery } from '../types/core/request';

const { getSearchByType } = services;

interface SearchByTypeQuery {
  key: string;
  limit?: string | number;
  page?: string | number;
  /** musicu search_type：1 歌手 / 2 专辑 / 3 歌单 / 8 用户（歌曲/歌词走 getSearchByKey） */
  t?: string | number;
}

export default async (ctx: Context) => {
  const query = getTypedQuery<SearchByTypeQuery>(ctx);
  const { key: w, limit: n, page: p, t } = query;
  if (w) {
    const { status, body } = await getSearchByType({ key: w, limit: n, page: p, t });
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
