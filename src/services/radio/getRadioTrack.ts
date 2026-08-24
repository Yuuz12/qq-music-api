import axios from 'axios';
import { getRequestCookie, getRequestUin } from '../../util/requestCredential';

/**
 * getRadioTrack - 电台歌曲列表 / 猜你喜欢（私人FM）
 *
 * 2026-08 新增（本播放器项目适配）：
 * 从 QQ 音乐 Web 端 player_radio 页面（y.qq.com/n/ryqq_v2/player_radio）逆向得到：
 * - id=99（猜你喜欢/私人FM）：module=music.radioProxy.MbTrackRadioSvr, method=get_radio_track
 * - 其他 id（分类电台）：module=pf.radiosvr, method=GetRadiosonglist
 * 个人化推荐需要登录 cookie（多用户：随请求头下发，见 util/requestCredential.ts）。
 */

interface RadioTrackParams {
  id?: string | number;
  num?: string | number;
  firstplay?: string | number;
}

export default async ({ id = 99, num = 10, firstplay = 0 }: RadioTrackParams = {}) => {
  const radioId = Number(id) || 99;
  const isGuessLike = radioId === 99;
  const count = Math.max(1, Number(num) || 10);

  const data = {
    comm: {
      ct: 24,
      cv: 0,
      uin: getRequestUin(),
      loginUin: getRequestUin(),
      format: 'json',
      platform: 'yqq.json',
    },
    req_0: isGuessLike
      ? {
          module: 'music.radioProxy.MbTrackRadioSvr',
          method: 'get_radio_track',
          param: { id: radioId, firstplay: firstplay ? 1 : 0, num: count },
        }
      : {
          module: 'pf.radiosvr',
          method: 'GetRadiosonglist',
          param: { id: radioId, firstplay: firstplay ? 1 : 0, num: count },
        },
  };

  try {
    const res = await axios.get('https://u.y.qq.com/cgi-bin/musicu.fcg', {
      params: {
        format: 'json',
        data: JSON.stringify(data),
      },
      headers: {
        Referer: 'https://y.qq.com/',
        Cookie: getRequestCookie(),
      },
      timeout: 10000,
    });
    const response = res.data || {};
    return {
      status: 200,
      body: { response },
    };
  } catch (error) {
    return {
      status: 500,
      body: {
        response: {
          code: -1,
          error: String(error),
        },
      },
    };
  }
};
