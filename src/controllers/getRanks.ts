import axios from 'axios';
import { Context } from 'koa';
import { getTypedQuery } from '../types/core/request';

/**
 * getRanks - 榜单歌曲
 *
 * 2026-08 修改说明（本播放器项目适配）：
 * 上游 musicToplist.ToplistInfoServer/GetDetail 返回的 song[] 仅为榜单摘要
 * （title/singerName/songId，无 songmid），无法用于播放/歌词接口。
 * 改用老版 Web 接口 fcg_v8_toplist_cp.fcg，返回完整歌曲对象（含 songmid）。
 * 响应结构与旧版兼容：response.data.songlist[]（完整歌曲对象）。
 */

interface RanksQuery {
  topId?: string | number;
  limit?: string | number;
  page?: string | number;
}

export default async (ctx: Context) => {
  const query = getTypedQuery<RanksQuery>(ctx);
  const topId = +(query.topId || 4);
  const num = +(query.limit || 20) || 20;
  const page = +(query.page || 1) || 1;
  const songBegin = (page - 1) * num;

  try {
    const res = await axios.get('https://c.y.qq.com/v8/fcg-bin/fcg_v8_toplist_cp.fcg', {
      params: {
        topid: topId,
        format: 'json',
        outCharset: 'utf-8',
        page: 'detail',
        type: 'top',
        tpl: 3,
        song_begin: songBegin,
        song_num: num,
      },
      headers: { Referer: 'https://y.qq.com/' },
      timeout: 10000,
    });
    const data = res.data || {};
    // 老接口歌曲数据嵌套在 songlist[].data
    const songlist = (Array.isArray(data.songlist) ? data.songlist : [])
      .map((item: { data?: unknown }) => item?.data)
      .filter(Boolean);

    ctx.status = 200;
    ctx.body = {
      response: {
        code: data.code ?? -1,
        subcode: data.subcode ?? 0,
        data: {
          songlist,
          cur_song_num: data.cur_song_num,
          date: data.date,
        },
      },
    };
  } catch (error) {
    ctx.status = 500;
    ctx.body = {
      response: {
        code: -1,
        error: String(error),
      },
    };
  }
};
