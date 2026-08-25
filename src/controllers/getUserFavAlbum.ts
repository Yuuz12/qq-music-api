import { Context } from 'koa';
import services from '../services';

const { getUserFavAlbum } = services;

/**
 * getUserFavAlbum - 收藏专辑列表（个人主页「我喜欢」→ 专辑）
 * GET /getUserFavAlbum?sin=0&num=100
 * 整理为与 getUserFavDiss 同构的结构：albummid/title/singername/picurl/pubtime，
 * 前端个人主页「我喜欢」专辑标签可直接复用歌单卡片渲染（点击打开专辑页）。
 */
export default async (ctx: Context) => {
  const sin = Number(ctx.query.sin) || 0;
  const num = Math.min(Math.max(Number(ctx.query.num) || 100, 1), 200);
  const { status, body } = await getUserFavAlbum({ sin, num });
  const d = body.response?.data || {};

  interface RawAlbum {
    albummid?: number | string;
    albumMid?: number | string;
    mid?: number | string;
    albumname?: string;
    album_name?: string;
    albumName?: string;
    name?: string;
    singername?: string;
    singer_name?: string;
    singerName?: string;
    picurl?: string;
    album_pic?: string;
    albumPic?: string;
    imgurl?: string;
    logo?: string;
    pubtime?: string | number;
    public_time?: string | number;
    aDate?: string;
    date?: string;
  }

  ctx.status = status;
  ctx.body = {
    response: {
      code: body.response?.code ?? -1,
      data: {
        total: d.totalalb ?? d.total ?? d.totalalbum ?? 0,
        albumlist: ((d.albumlist || d.albumList || d.cdlist || []) as RawAlbum[]).map((a) => ({
          albummid: String(a.albummid ?? a.albumMid ?? a.mid ?? ''),
          title: a.albumname || a.album_name || a.albumName || a.name || '',
          singername: a.singername || a.singer_name || a.singerName || '',
          picurl: a.picurl || a.album_pic || a.albumPic || a.imgurl || a.logo || '',
          pubtime: String(a.pubtime ?? a.public_time ?? a.aDate ?? a.date ?? ''),
        })),
      },
    },
  };
};
