const mockGet = jest.fn();

jest.mock('axios', () => ({
  __esModule: true,
  default: { get: mockGet },
}));

jest.mock('../src/util/logger', () => ({
  __esModule: true,
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

import { addPlaylist, delPlaylist } from '../src/services/songLists/playlistBaseWrite';
import { runWithCredential } from '../src/util/requestCredential';

const mockedGet = mockGet as jest.Mock;

/** 从 axios.get 的 params.data 里取出请求报文（服务层把 fcg 报文整体塞在 data 参数里） */
const bodyOf = (callIndex = 0) => {
  const [, config] = mockedGet.mock.calls[callIndex];
  return JSON.parse(config.params.data);
};

describe('services/playlistBaseWrite', () => {
  beforeEach(() => {
    mockedGet.mockReset();
  });

  it('addPlaylist: 免签直连 musicu.fcg，param 为 dirName（trim 后）', async () => {
    mockedGet.mockResolvedValue({
      data: {
        req_1: {
          code: 0,
          data: {
            result: { tid: 9771934528, dirId: 9, dirName: 'QQMP测试歌单', updateTime: 1788082619 },
          },
        },
      },
    });

    const result = await addPlaylist({ dirName: '  QQMP测试歌单  ' });

    expect(mockedGet).toHaveBeenCalledTimes(1);
    const [url, config] = mockedGet.mock.calls[0];
    expect(url).toContain('u.y.qq.com/cgi-bin/musicu.fcg');
    expect(config.params.format).toBe('json');
    expect(config.headers.Referer).toBe('https://y.qq.com/');
    expect(bodyOf()).toEqual({
      comm: expect.objectContaining({ format: 'json', platform: 'wk_v17' }),
      req_1: {
        module: 'music.musicasset.PlaylistBaseWrite',
        method: 'AddPlaylist',
        param: { dirName: 'QQMP测试歌单' },
      },
    });
    // 创建成功后把上游 req_1 原样带回，控制器据此取 data.result.dirId
    expect(result.status).toBe(200);
    expect(result.body.response.code).toBe(0);
    expect(result.body.response.req_1?.data?.result?.dirId).toBe(9);
  });

  it('delPlaylist: param 键是 dirId（数字），不是 tid', async () => {
    mockedGet.mockResolvedValue({
      data: { req_1: { code: 0, data: { result: { tid: 9771934528, dirId: 9 } } } },
    });

    const result = await delPlaylist({ dirId: '9' });

    expect(bodyOf()).toEqual({
      comm: expect.objectContaining({ format: 'json' }),
      req_1: {
        module: 'music.musicasset.PlaylistBaseWrite',
        method: 'DelPlaylist',
        param: { dirId: 9 },
      },
    });
    expect(result.body.response.code).toBe(0);
  });

  it('多用户：请求头下发的 cookie 随请求发往上游', async () => {
    mockedGet.mockResolvedValue({ data: { req_1: { code: 0 } } });

    await runWithCredential({ cookie: 'uin=1234567890; qm_keyst=abc', uin: '1234567890' }, () =>
      addPlaylist({ dirName: '歌单' }),
    );

    const [, config] = mockedGet.mock.calls[0];
    expect(config.headers.Cookie).toBe('uin=1234567890; qm_keyst=abc');
    expect(bodyOf().comm.uin).toBe('1234567890');
  });

  it('上游业务码（如 80105 会话失效）原样透出，不吞成 -1', async () => {
    mockedGet.mockResolvedValue({ data: { req_1: { code: 80105 } } });

    const result = await delPlaylist({ dirId: 9 });

    expect(result.status).toBe(200);
    expect(result.body.response.code).toBe(80105);
  });

  it('上游网络错误：status 500 + code -1 + message', async () => {
    mockedGet.mockRejectedValue(new Error('connect ETIMEDOUT'));

    const result = await addPlaylist({ dirName: '歌单' });

    expect(result.status).toBe(500);
    expect(result.body.response.code).toBe(-1);
    expect(result.body.response.message).toContain('ETIMEDOUT');
  });
});
