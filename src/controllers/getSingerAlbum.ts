import { Context } from 'koa';
import services from '../services';
import { getTypedQuery } from '../types/core/request';

const { UCommon } = services;

// singermid=0025NhlN2yWrP4

interface SingerAlbumQuery {
  singermid: string;
  limit?: string | number;
  page?: string | number;
  order?: string | number;
}

export default async (ctx: Context) => {
  const query = getTypedQuery<SingerAlbumQuery>(ctx);
  const singermid = query.singermid;
  // ⚠️ 上游 num 实际封顶 80：传更大的 limit 也只返回 80 条；
  // 分页游标须按「实际返回条数」推进，否则会整段丢数据（调用方见 app/src/singerAlbum.js）
  const num = +(query.limit || 5);
  const begin = +(query.page || 0);
  // order：2=最新（默认，按发行时间倒序），1=热度
  const order = +(query.order || 2);
  const data = {
    comm: {
      ct: 24,
      cv: 0,
    },
    singer: {
      method: 'GetAlbumList',
      param: {
        sort: 5,
        order,
        singermid,
        begin,
        num,
      },
      module: 'music.musichallAlbum.AlbumListServer',
    },
  };
  const params = Object.assign({
    format: 'json',
    singermid,
    data: JSON.stringify(data),
  });
  const props = {
    method: 'get',
    params,
    option: {},
  };
  if (singermid) {
    await UCommon(props)
      .then((res: import('axios').AxiosResponse<any>) => {
        const response = res.data;
        ctx.status = 200;
        ctx.body = {
          response,
        };
      })
      .catch((error: unknown) => {
        throw error;
      });
  } else {
    ctx.status = 400;
    ctx.body = {
      response: 'no singermid',
    };
  }
};
