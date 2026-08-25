import axios from 'axios';
import { logServiceFailure, logServiceRequest, logServiceSuccess } from '../../util/observability';
import { getRequestCookie, getRequestUin } from '../../util/requestCredential';

/**
 * getIsAlbumFan - 批量查询专辑收藏状态（专辑页「收藏」按钮高亮）
 *
 * 2026-08 新增（本播放器项目适配）：
 * 逆向自 QQ 音乐 Web 端专辑页运行时代码：
 * - module: music.musicasset.AlbumFavRead
 * - method: IsAlbumFan
 * - param:  { uin, v_albumMid: [albummid, ...] }
 * - 响应:   data.m_fan = { [albummid]: 1 | 0 }
 * 读接口走明文 musicu.fcg（GET + data 查询串），无需官方加密代理。
 * 需要登录态 cookie（多用户：随请求头下发，见 util/requestCredential.ts）。
 *
 * 2026-08-23 分页上限：与 getIsSongFan 相同，按 BATCH_SIZE=100 分批并行请求后合并 m_fan；
 * 全部批次失败才返回 500，部分失败降级返回已取得的部分。
 */

interface GetIsAlbumFanParams {
  /** 专辑 mid（albummid）列表 */
  albummids?: (string | number)[];
}

export interface GetIsAlbumFanResponse {
  /** 0 成功；上游业务码（如 1000 未登录）原样透出；服务层失败为 -1 */
  code: number;
  /** 与 musicu.fcg 单请求结构对齐：data.m_fan = { [albummid]: 1 | 0 }（多批已合并） */
  req_0?: { code: number; data?: { m_fan?: Record<string, number> } };
  /** 失败原因（仅服务层失败时存在） */
  message?: string;
}

/** 单次请求的 mid 数上限（100 个 ≈ 查询串 2.5KB，远低于上游 URI 限制） */
const BATCH_SIZE = 100;

const UPSTREAM_URL = 'https://u.y.qq.com/cgi-bin/musicu.fcg';

type GetIsAlbumFanResult = Promise<{
  status: number;
  body: { response: GetIsAlbumFanResponse };
}>;

export default async ({
  albummids = [],
}: GetIsAlbumFanParams = {}): Promise<GetIsAlbumFanResult> => {
  const mids = albummids.map(String);

  // 切批：每批独立走一次 musicu.fcg（空列表也保留一个空批，与既有行为一致）
  const batches: string[][] = [];
  for (let i = 0; i < mids.length; i += BATCH_SIZE) {
    batches.push(mids.slice(i, i + BATCH_SIZE));
  }
  if (!batches.length) batches.push([]);

  logServiceRequest('getIsAlbumFan', UPSTREAM_URL, { count: mids.length, batches: batches.length });

  const settled = await Promise.allSettled(
    batches.map((batch) => {
      const data = {
        comm: {
          ct: 24,
          cv: 0,
          uin: getRequestUin(),
          loginUin: getRequestUin(),
          format: 'json',
          platform: 'yqq.json',
        },
        req_0: {
          module: 'music.musicasset.AlbumFavRead',
          method: 'IsAlbumFan',
          param: {
            uin: getRequestUin(),
            v_albumMid: batch,
          },
        },
      };
      return axios.get(UPSTREAM_URL, {
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
    }),
  );

  // 合并各批次结果：m_fan 取并集；code 取第一个非 0 的批次码（保留未登录 1000 等信号），全 0 则为 0
  const m_fan: Record<string, number> = {};
  let code: number | undefined;
  let firstError: unknown;
  let okBatches = 0;

  for (const item of settled) {
    if (item.status === 'rejected') {
      firstError ??= item.reason;
      continue;
    }
    okBatches += 1;
    const req0 =
      item.value.data && typeof item.value.data === 'object' ? item.value.data.req_0 : undefined;
    if (req0 && typeof req0 === 'object') {
      if (code === undefined || (code === 0 && req0.code !== 0)) code = req0.code;
      if (req0.data && typeof req0.data === 'object' && req0.data.m_fan) {
        Object.assign(m_fan, req0.data.m_fan);
      }
    } else {
      code ??= -1;
    }
  }

  // 全部批次都失败：向上返回 500 并带上原因
  if (!okBatches) {
    logServiceFailure('getIsAlbumFan', UPSTREAM_URL, firstError, { count: mids.length });
    return {
      status: 500,
      body: {
        response: {
          code: -1,
          message: String(firstError),
        },
      },
    };
  }

  // 部分批次失败：降级返回已取得的部分（缺失的专辑保持无收藏态），同时记录失败日志
  if (okBatches < batches.length) {
    logServiceFailure('getIsAlbumFan', UPSTREAM_URL, firstError, {
      count: mids.length,
      okBatches,
      totalBatches: batches.length,
    });
  }

  const response = {
    code: code ?? 0,
    req_0: {
      code: code ?? 0,
      data: { m_fan },
    },
  };
  logServiceSuccess('getIsAlbumFan', UPSTREAM_URL, {
    code: response.code,
    fans: Object.keys(m_fan).length,
  });
  return {
    status: 200,
    body: { response },
  };
};
