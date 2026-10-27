import { logger } from '../../util/logger';
import { clientWrite, clientWriteMessage } from './clientWrite';

/**
 * setFav - 添加/取消喜欢（写入「我喜欢」等收藏歌单）
 *
 * 「喜欢」按钮真实接口为 music.musicasset.PlaylistDetailWrite
 * （AddSonglist 添加 / DelSonglist 取消，dirId=201 为「我喜欢」）。
 *
 * 写通道：客户端式免签直写（fav/clientWrite.ts）——当前 Cookie 收窄成客户端最小集 +
 * 客户端 comm，刷新登录换 key 后仍可写入（真实账号实测 Add/Del 均 code=0）。
 * 不再使用隐藏官方网页/写代理。
 *
 * 多用户：使用当前请求的凭据，写入的是**用户自己**的「我喜欢」列表。
 */

export interface FavSongItem {
  /** 歌曲数字 id（songid） */
  songId: string | number;
  /** 歌曲类型（songtype），默认 0 */
  songType?: string | number;
}

interface SetFavParams {
  /** 目标收藏列表 dirId，默认 201 = 我喜欢 */
  dirId?: string | number;
  songs?: FavSongItem[];
  /** 当前是否已喜欢：true 时调用 DelSonglist（取消喜欢），false 时调用 AddSonglist（添加喜欢） */
  isFan?: boolean;
}

export const DEFAULT_FAV_DIR_ID = 201;

export default async ({
  dirId = DEFAULT_FAV_DIR_ID,
  songs = [],
  isFan = false,
}: SetFavParams = {}) => {
  const v_songInfo = songs.map(({ songId, songType = 0 }) => ({
    songId,
    songType: Number(songType) || 0,
  }));
  const method: 'AddSonglist' | 'DelSonglist' = isFan ? 'DelSonglist' : 'AddSonglist';
  const normalizedDirId = Number(dirId) || DEFAULT_FAV_DIR_ID;

  const direct = await clientWrite({
    module: 'music.musicasset.PlaylistDetailWrite',
    method,
    param: { dirId: normalizedDirId, v_songInfo },
    logTag: 'setFav',
  });

  if (direct.code === 0) {
    logger.info('[setFav] 客户端式写入成功', {
      method,
      dirId: normalizedDirId,
      songs: v_songInfo.length,
    });
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

  logger.warn('[setFav] 客户端式写入失败', {
    method,
    dirId: normalizedDirId,
    code: direct.code,
  });
  return {
    status: 200,
    body: {
      response: {
        code: direct.code,
        message: clientWriteMessage(direct.code, direct.message),
      },
    },
  };
};
