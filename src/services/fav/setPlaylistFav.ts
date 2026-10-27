import { logger } from '../../util/logger';
import { getRequestUin } from '../../util/requestCredential';
import { clientWrite, clientWriteMessage, isFavDataOk } from './clientWrite';

/**
 * setPlaylistFav - 收藏/取消收藏歌单
 *
 * 「收藏歌单」接口为 music.musicasset.PlaylistFavWrite
 * （FavPlaylist 收藏 / CancelFavPlaylist 取消，param={ uin, v_playlistId:[disstid] }）。
 *
 * 写通道：客户端式免签直写（fav/clientWrite.ts）——刷新换 key 后仍可写入
 * （真实账号对已收藏歌单做过幂等 FavPlaylist 验证：code=0、result=0）。
 * 不再使用隐藏官方网页/写代理。
 */

interface SetPlaylistFavParams {
  /** 歌单数字 id（disstid） */
  disstid?: string | number;
  /** 当前是否已收藏：true 时调用 CancelFavPlaylist（取消收藏），false 时调用 FavPlaylist（收藏） */
  isFan?: boolean;
}

export default async ({ disstid = '', isFan = false }: SetPlaylistFavParams = {}) => {
  const tid = String(disstid ?? '').trim();
  if (!tid) {
    return {
      status: 400,
      body: {
        response: { code: -1, message: 'disstid is required' },
      },
    };
  }
  const tidNum = Number(tid);
  if (!Number.isFinite(tidNum) || tidNum <= 0) {
    return {
      status: 400,
      body: {
        response: { code: -1, message: 'disstid 不是有效数字' },
      },
    };
  }

  const direct = await clientWrite({
    module: 'music.musicasset.PlaylistFavWrite',
    method: isFan ? 'CancelFavPlaylist' : 'FavPlaylist',
    param: { uin: String(getRequestUin()), v_playlistId: [tidNum] },
    logTag: 'setPlaylistFav',
  });

  if (direct.code === 0 && isFavDataOk(direct.data, 'v_failedPlaylistId')) {
    logger.info('[setPlaylistFav] 客户端式写入成功', { disstid: tid, isFan });
    return {
      status: 200,
      body: {
        response: {
          code: 0,
          data: direct.raw ? { raw: direct.raw } : undefined,
        },
      },
    };
  }

  const code = direct.code === 0 ? -1 : direct.code;
  const message =
    direct.code === 0
      ? '收藏失败：上游返回失败清单'
      : clientWriteMessage(direct.code, direct.message);
  logger.warn('[setPlaylistFav] 客户端式写入失败', { disstid: tid, isFan, code });
  return {
    status: 200,
    body: {
      response: { code, message },
    },
  };
};
