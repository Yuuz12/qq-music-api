import { AxiosRequestConfig } from 'axios';
import { logServiceFailure, logServiceRequest, logServiceSuccess } from '../../util/observability';
import y_common from '../y_common';

interface SongListDetailParams {
  method?: string;
  params?: Record<string, unknown>;
  option?: AxiosRequestConfig;
}

// 上游路径（本播放器项目适配 2026-08）：
// 旧路径 /qzone/fcg-bin/... 已触发 "check privacy error"（subcode 4000），
// 需改为 /qzone-music/fcg-bin/... 新路径（公开歌单免登录、私有歌单带 cookie 均可返回）。
// git pull 更新上游时此路径可能被还原，需留意（同 getRanks 适配说明）。
const upstream = '/qzone-music/fcg-bin/fcg_ucc_getcdinfo_byids_cp.fcg';

export default ({ method = 'get', params = {}, option = {} }: SongListDetailParams) => {
  const data = Object.assign(params, {
    format: 'json',
    outCharset: 'utf-8',
    type: 1,
    json: 1,
    utf8: 1,
    onlysong: 0,
    new_format: 1,
  });
  const options = Object.assign(option, {
    params: data,
  });
  logServiceRequest('songListDetail', upstream, data);
  return y_common({
    url: upstream,
    method,
    options,
  })
    .then((res: import('axios').AxiosResponse<any>) => {
      const response = res.data;
      logServiceSuccess('songListDetail', upstream, response, {
        disstid: data.disstid,
      });
      return {
        status: 200,
        body: {
          response,
        },
      };
    })
    .catch((error: unknown) => {
      logServiceFailure('songListDetail', upstream, error, data);
      return {
        status: 500,
        body: {
          error,
        },
      };
    });
};
