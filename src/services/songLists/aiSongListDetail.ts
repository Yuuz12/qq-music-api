import axios from 'axios';
import { logger } from '../../util/logger';
import qqSign from '../../util/qqSign';
import { getRequestCookie, getRequestUin } from '../../util/requestCredential';

/**
 * aiSongListDetail - 官方 AI 歌单详情
 *
 * 上游 music.srfDissInfo.aiDissInfo / uniform_get_Dissinfo（PC 客户端网页版
 * recommend chunk 逆向确认：客户端对推荐页「百万收藏」(disstid=211111)、
 * 「新歌推荐」(disstid=211207) 等官方 AI 歌单卡均走此接口取歌曲列表，
 * param 仅 {disstid, userinfo, tag, enc_host_uin, guid}）。
 *
 * 与传统歌单（fcg_ucc_getcdinfo_byids_cp）的差异：
 * - 该接口是唯一能读到官方 AI 歌单的通道：旧 fcg 接口对这些 disstid 恒返
 *   code 10（带登录 cookie 也不行，实测 2026-09）；
 * - 需登录 cookie：匿名调上游返回 80120；
 * - 响应形态：req_1.data 为对象（网页版通道；客户端通道为数组包一层），
 *   data.dirinfo 为歌单头、data.songlist 为歌曲（新格式 mid/name/singer[]/
 *   album{}/pay/file，与 normalizeRadioTrack 输入同构）。
 *
 * 本服务把响应归一化成与 songListDetail 相同的 cdlist[0] 形态返回，
 * 前端无需感知 AI 歌单与传统歌单的差异。
 */

interface AiSongListDetailParams {
  /** 兼容 songListDetail 签名；本服务恒用 POST，method 不参与请求 */
  method?: string;
  params?: { disstid?: string | number };
  option?: Record<string, unknown>;
}

/** 32 位大写 hex 随机 guid（上游仅作缓存标识，无需与登录态绑定） */
const randomGuid = () =>
  Array.from({ length: 8 }, () =>
    Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .slice(1),
  )
    .join('')
    .toUpperCase();

export default async ({ params = {} }: AiSongListDetailParams = {}) => {
  const disstid = Number((params as { disstid?: string | number }).disstid || 0);
  if (!disstid) {
    return { status: 400, body: { response: { code: 500, cdlist: [] } } };
  }
  const cookie = getRequestCookie();
  const uin = getRequestUin();
  const body = {
    comm: {
      format: 'json',
      ct: 20,
      cv: 2252,
      platform: 'wk_v17',
      inCharset: 'utf-8',
      outCharset: 'utf-8',
      notice: 0,
      needNewCode: 1,
      uin: Number(uin) || 0,
    },
    req_1: {
      module: 'music.srfDissInfo.aiDissInfo',
      method: 'uniform_get_Dissinfo',
      param: {
        disstid,
        userinfo: 1,
        tag: 1,
        enc_host_uin: '',
        guid: randomGuid(),
      },
    },
  };
  try {
    const sign = qqSign(body);
    const res = await axios.post(
      `https://u6.y.qq.com/cgi-bin/musics.fcg?_=${Date.now()}&sign=${sign}`,
      body,
      {
        headers: {
          'Content-Type': 'application/json',
          ...(cookie ? { Cookie: cookie } : {}),
          Referer: 'https://y.qq.com/',
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        },
        timeout: 10000,
      },
    );
    // 兼容两种响应形态：网页版通道 data 为对象；客户端通道 data 为数组
    const raw = (res.data as { req_1?: { code?: number; data?: unknown } })?.req_1 || {};
    const inner = Array.isArray(raw.data) ? (raw.data as unknown[])[0] : raw.data;
    const d = (inner || {}) as {
      code?: number;
      dirinfo?: Record<string, unknown>;
      songlist?: unknown[];
    };
    const code = Number(raw.code ?? 0) !== 0 ? Number(raw.code) : Number(d.code ?? -1);
    if (code !== 0 || !d.dirinfo) {
      // 匿名访问上游为 80120：透传原 code 便于排查
      logger.warn('aiSongListDetail: 上游未返回歌单数据', { disstid, code });
      return {
        status: 200,
        body: { response: { code: code || -1, cdlist: [] } },
      };
    }
    const dir = d.dirinfo as Record<string, unknown>;
    const cdlistItem = {
      disstid: dir.id,
      dissid: dir.id,
      dissname: dir.title,
      diss_title: dir.title,
      logo: dir.picurl,
      picurl: dir.picurl,
      pic_mid: dir.picmid,
      picurl2: dir.picurl2,
      nickname: dir.host_nick,
      // 与 songListDetail 的 cdlist[0] 同构：nick = 创建人昵称（前端歌单详情 meta 据此追加「by 创建人」）
      nick: dir.host_nick,
      creator: { name: dir.host_nick },
      songnum: dir.songnum,
      total_song_num: dir.songnum,
      listennum: dir.listennum,
      desc: dir.desc,
      song_update_time: dir.song_update_time,
      // AI 歌单每日更新：前端详情页 meta 可用
      dir_show: dir.dir_show,
      songlist: d.songlist || [],
    };
    return {
      status: 200,
      body: {
        response: {
          code: 0,
          subcode: 0,
          cdlist: [cdlistItem],
        },
      },
    };
  } catch (error) {
    logger.error('aiSongListDetail: 请求异常', {
      disstid,
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      status: 200,
      body: { response: { code: -1, cdlist: [] } },
    };
  }
};
