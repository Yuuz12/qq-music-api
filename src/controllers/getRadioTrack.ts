import { Context } from 'koa';
import services from '../services';
import { getTypedQuery } from '../types/core/request';

const { getRadioTrack } = services;

interface RadioTrackQuery {
  id?: string | number;
  num?: string | number;
  firstplay?: string | number;
}

/**
 * getRadioTrack - 电台歌曲 / 猜你喜欢
 * 用法：GET /getRadioTrack?id=99&num=10&firstplay=0
 * id=99 为猜你喜欢（私人FM），其他 id 为分类电台
 */
export default async (ctx: Context) => {
  const { id, num, firstplay } = getTypedQuery<RadioTrackQuery>(ctx);
  const { status, body } = await getRadioTrack({ id, num, firstplay });

  // 统一响应：把 musicu.fcg 的 req_0 数据提升到 response.data
  const upstream = (body.response && (body.response.req_0 || body.response[0])) || null;
  ctx.status = status;
  ctx.body = {
    response: {
      code: upstream ? upstream.code : (body.response?.code ?? -1),
      data: upstream ? upstream.data : null,
    },
  };
};
