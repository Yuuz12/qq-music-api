import services from '../services';

const { UCommon } = services;

// songmid=003rJSwm3TechU
// songmid=001yNIo41SJjuC,001wPuVc4ZiMhj
import { Context } from 'koa';
import get from 'lodash.get';
import { _guid } from '../config';
import { getRequestCookie, getRequestUin } from '../util/requestCredential';

export default async (ctx: Context) => {
  const uin = getRequestUin();
  const songmid = `${(ctx.query as Record<string, unknown>).songmid}`;
  // response data only need play url value (all play)
  const justPlayUrl = ((ctx.query as Record<string, unknown>).resType || 'play') === 'play';
  const guid = _guid ? `${_guid}` : '1429839143';
  const { quality = 128, mediaId } = ctx.query;
  const fileType = {
    m4a: {
      s: 'C400',
      e: '.m4a',
    },
    128: {
      s: 'M500',
      e: '.mp3',
    },
    320: {
      s: 'M800',
      e: '.mp3',
    },
    ape: {
      s: 'A000',
      e: '.ape',
    },
    flac: {
      s: 'F000',
      e: '.flac',
    },
  };
  const songmidList = songmid.split(',');
  const qualityKey = quality as keyof typeof fileType;
  const fileInfo = fileType[qualityKey];
  // 本播放器项目适配（2026-08）：filename 应形如 M500{songmid}.mp3。
  // 上游原写法 `${s}${_}${mediaId || _}${e}` 在未传 mediaId 时会重复 songmid
  // （M500{songmid}{songmid}.mp3），上游 vkey 接口查不到文件导致 purl 恒为空。
  const file = songmidList.map((_) => `${fileInfo.s}${mediaId || _}${fileInfo.e}`);
  const data = {
    // req: {
    // 	module: 'CDN.SrfCdnDispatchServer',
    // 	method: 'GetCdnDispatch',
    // 	param: {
    // 		guid,
    // 		calltype: 0,
    // 		userip: '',
    // 	},
    // },
    req_0: {
      module: 'vkey.GetVkeyServer',
      method: 'CgiGetVkey',
      param: {
        filename: file,
        guid,
        songmid: songmidList,
        songtype: [0],
        uin,
        loginflag: 1,
        platform: '20',
      },
    },
    loginUin: uin,
    comm: {
      uin,
      format: 'json',
      ct: 24,
      cv: 0,
    },
  };
  const params = Object.assign({
    format: 'json',
    sign: 'zzannc1o6o9b4i971602f3554385022046ab796512b7012',
    data: JSON.stringify(data),
  });
  const props = {
    method: 'get',
    params,
    // 本播放器项目适配（2026-08）：u_common 不携带用户 cookie，
    // 上游 vkey 接口即使免费歌曲也要求登录 cookie 才返回 purl（未带 cookie 时 purl 恒为空）。
    option: {
      headers: {
        Cookie: getRequestCookie(),
      },
    },
  };

  if (songmid) {
    await UCommon(props)
      .then((res: { data: any }) => {
        const response = res.data;
        const domain =
          get(response, 'req_0.data.sip', []).find((i: string) => !i.startsWith('http://ws')) ||
          get(response, 'req_0.data.sip[0]');

        const playUrl: Record<string, { url: string; error: string | boolean }> = {};
        get(response, 'req_0.data.midurlinfo', []).forEach(
          (item: { songmid: string; purl: string }) => {
            playUrl[item.songmid] = {
              url: item.purl ? `${domain}${item.purl}` : '',
              error: !item.purl && '暂无播放链接',
            };
          },
        );
        response.playUrl = playUrl;
        ctx.body = {
          data: justPlayUrl ? { playUrl } : response,
        };
      })
      .catch((error: unknown) => {
        throw error;
      });
  } else {
    ctx.status = 400;
    ctx.body = {
      data: {
        message: 'no songmid',
      },
    };
  }
};
