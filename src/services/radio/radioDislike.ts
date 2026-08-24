import axios from 'axios';
import { _guid } from '../../config';
import { getRequestCookie, getRequestUin } from '../../util/requestCredential';

/**
 * radioDislike - 电台「删除」按钮的接口还原（仅统计上报）
 *
 * 2026-08 新增（本播放器项目适配）：
 * 从 QQ 音乐 Web 端 player_radio 页面（y.qq.com/n/ryqq_v2/player_radio）逆向得到
 * 「删除」按钮（btn_delete js_delete → handleRemove）的实际行为：
 * 1. 只向 stat.pc.music.qq.com 发送一条统计上报（1x1 像素图，method=0）：
 *    fcg_val_report.fcg?data_type=112&version=1502&uin=..&guid=..&method=0
 *      &data=<radioId>&data2=15&data3=<songId>&songtype=<songType>&data4=0&_r=<ts>
 * 2. 网页端在本地把当前歌曲从播放队列剔除并提示「该歌曲将暂时不再播放」。
 * 服务端没有黑名单/删除接口，因此本接口只复刻统计上报；真正的「不再播放」
 * 需要由调用方在前端本地完成（从队列移除并切歌）。
 */

interface RadioDislikeParams {
  /** 电台 id，默认 99（猜你喜欢/私人FM） */
  radioId?: string | number;
  /** 歌曲数字 id（songid），由控制器保证必填 */
  songId?: string | number;
  /** 歌曲类型（songtype），默认 0 */
  songType?: string | number;
}

export default async ({ radioId = 99, songId, songType = 0 }: RadioDislikeParams = {}) => {
  const uin = getRequestUin();
  const guid = Number(_guid) || 0;
  const statUrl = [
    'http://stat.pc.music.qq.com/fcgi-bin/fcg_val_report.fcg',
    `?data_type=112&version=1502&uin=${encodeURIComponent(uin)}`,
    `&guid=${guid}&method=0&data=${encodeURIComponent(String(radioId))}`,
    `&data2=15&data3=${encodeURIComponent(String(songId ?? ''))}`,
    `&songtype=${Number(songType) || 0}&data4=0&_r=${Date.now()}`,
  ].join('');

  try {
    // 统计上报为 fire-and-forget，失败不影响业务
    await axios.get(statUrl, {
      headers: {
        Referer: 'https://y.qq.com/',
        Cookie: getRequestCookie(),
      },
      timeout: 3000,
    });
    return {
      status: 200,
      body: {
        response: {
          code: 0,
          data: {
            reported: true,
          },
        },
      },
    };
  } catch (error) {
    return {
      status: 200,
      body: {
        response: {
          code: 0,
          data: {
            reported: false,
            error: String(error),
          },
        },
      },
    };
  }
};
