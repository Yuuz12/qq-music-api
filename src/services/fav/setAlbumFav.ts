import { logger } from '../../util/logger';
import { getRequestUin } from '../../util/requestCredential';
import { clientWrite, clientWriteMessage, isFavDataOk } from './clientWrite';

/**
 * setAlbumFav - 收藏/取消收藏专辑
 *
 * 「收藏专辑」接口为 music.musicasset.AlbumFavWrite
 * （FavAlbum 收藏 / CancelFavAlbum 取消，param={ uin, v_albumMid:[albumMid] }，
 *  成功判据 req_1.data.result === 0）。
 *
 * 写通道：客户端式免签直写（fav/clientWrite.ts）——刷新换 key 后仍可写入
 * （真实账号做过 FavAlbum → CancelFavAlbum 可逆验证，均 code=0/result=0）。
 * 不再使用隐藏官方网页/写代理。
 */

interface SetAlbumFavParams {
  /** 专辑 mid（albumMid） */
  albumMid?: string | number;
  /** 当前是否已收藏：true 时调用 CancelFavAlbum（取消收藏），false 时调用 FavAlbum（收藏） */
  isFan?: boolean;
}

export default async ({ albumMid = '', isFan = false }: SetAlbumFavParams = {}) => {
  const mid = String(albumMid ?? '').trim();
  if (!mid) {
    return {
      status: 400,
      body: {
        response: { code: -1, message: 'albumMid is required' },
      },
    };
  }

  const direct = await clientWrite({
    module: 'music.musicasset.AlbumFavWrite',
    method: isFan ? 'CancelFavAlbum' : 'FavAlbum',
    param: { uin: String(getRequestUin()), v_albumMid: [mid] },
    logTag: 'setAlbumFav',
  });

  if (direct.code === 0 && isFavDataOk(direct.data, 'v_failedAlbumMid')) {
    logger.info('[setAlbumFav] 客户端式写入成功', { albumMid: mid, isFan });
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
  logger.warn('[setAlbumFav] 客户端式写入失败', { albumMid: mid, isFan, code });
  return {
    status: 200,
    body: {
      response: { code, message },
    },
  };
};
