import { Context } from 'koa';
import services from '../services';

const { getUserFavDiss } = services;

/**
 * getUserFavDiss - 收藏歌单列表
 * GET /getUserFavDiss?sin=0&num=100
 * 整理为与 getUserProfile.disslist 同构的结构（dissid/title/picurl/subtitle），
 * 前端个人主页「收藏歌单」标签可直接复用同一套歌单卡片渲染。
 */
export default async (ctx: Context) => {
  const sin = Number(ctx.query.sin) || 0;
  const num = Math.min(Math.max(Number(ctx.query.num) || 100, 1), 200);
  const { status, body } = await getUserFavDiss({ sin, num });
  const d = body.response?.data || {};

  interface RawDisst {
    disstid?: number | string;
    dissid?: number | string;
    tid?: number | string;
    dirid?: number | string;
    dissname?: string;
    diss_name?: string;
    picurl?: string;
    imgurl?: string;
    diss_cover?: string;
    logo?: string;
    nickname?: string;
  }

  ctx.status = status;
  ctx.body = {
    response: {
      code: body.response?.code ?? -1,
      data: {
        total: d.totaldiss ?? 0,
        disslist: ((d.cdlist || []) as RawDisst[]).map((s) => ({
          // 打开歌单详情用 disstid：兼容多种字段命名（tid/dirid 为系统列表兜底）
          dissid: String(s.disstid ?? s.dissid ?? s.tid ?? s.dirid ?? ''),
          title: s.dissname || s.diss_name || '',
          picurl: s.picurl || s.imgurl || s.diss_cover || s.logo || '',
          subtitle: s.nickname ? `by ${s.nickname}` : '',
        })),
      },
    },
  };
};
