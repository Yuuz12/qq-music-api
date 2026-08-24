const mockPost = jest.fn();

jest.mock('axios', () => ({
  __esModule: true,
  default: { post: mockPost },
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

import setFav, { DEFAULT_FAV_DIR_ID } from '../src/services/fav/setFav';
import { runWithCredential } from '../src/util/requestCredential';

const mockedPost = mockPost as jest.Mock;

describe('services/setFav', () => {
  beforeEach(() => {
    mockedPost.mockReset();
  });

  it('未喜欢时通过官方通道代理调用 AddSonglist 写入 dirId=201（我喜欢）', async () => {
    mockedPost.mockResolvedValue({
      data: { ok: true, code: 0, raw: '{"code":0,"req_1":{"code":0}}' },
    });

    const result = await setFav({
      dirId: 201,
      songs: [{ songId: 1459873321, songType: 0 }],
      isFan: false,
    });

    expect(mockedPost).toHaveBeenCalledTimes(1);
    const [url, payload, config] = mockedPost.mock.calls[0];
    expect(url).toContain('/playlist-write');
    expect(payload).toEqual({
      dirId: 201,
      method: 'AddSonglist',
      songs: [{ songId: 1459873321, songType: 0 }],
    });
    expect(config.headers['Content-Type']).toBe('application/json');
    expect(result).toEqual({
      status: 200,
      body: {
        response: {
          code: 0,
          message: undefined,
          data: { raw: '{"code":0,"req_1":{"code":0}}' },
        },
      },
    });
  });

  it('已喜欢时调用 DelSonglist（取消喜欢）', async () => {
    mockedPost.mockResolvedValue({ data: { ok: true, code: 0 } });

    await setFav({
      dirId: 201,
      songs: [{ songId: 123, songType: 1 }],
      isFan: true,
    });

    const payload = mockedPost.mock.calls[0][1];
    expect(payload.method).toBe('DelSonglist');
    expect(payload.songs).toEqual([{ songId: 123, songType: 1 }]);
  });

  it('默认 dirId=201，songType 缺省为 0，支持自定义 dirId', async () => {
    mockedPost.mockResolvedValue({ data: { ok: true, code: 0 } });

    await setFav({ songs: [{ songId: 456 }] });
    expect(mockedPost.mock.calls[0][1].dirId).toBe(DEFAULT_FAV_DIR_ID);
    expect(mockedPost.mock.calls[0][1].songs).toEqual([{ songId: 456, songType: 0 }]);

    await setFav({ dirId: 205, songs: [{ songId: 456, songType: 2 }] });
    expect(mockedPost.mock.calls[1][1].dirId).toBe(205);
  });

  it('多用户：请求头下发的凭据（cookie/uin）随请求转发给代理', async () => {
    mockedPost.mockResolvedValue({ data: { ok: true, code: 0 } });

    await runWithCredential({ cookie: 'uin=1234567890; skey=abc', uin: '1234567890' }, () =>
      setFav({ songs: [{ songId: 1459873321 }] }),
    );

    const payload = mockedPost.mock.calls[0][1];
    expect(payload.cookie).toBe('uin=1234567890; skey=abc');
    expect(payload.uin).toBe('1234567890');
  });

  it('未配置凭据时不转发 cookie/uin 字段（保持兼容）', async () => {
    mockedPost.mockResolvedValue({ data: { ok: true, code: 0 } });

    await setFav({ songs: [{ songId: 456 }] });

    const payload = mockedPost.mock.calls[0][1];
    expect(payload).not.toHaveProperty('cookie');
    expect(payload).not.toHaveProperty('uin');
  });

  it('代理返回错误时透出 message（如代理未启动提示）', async () => {
    mockedPost.mockRejectedValue(new Error('connect ECONNREFUSED'));

    const result = await setFav({ songs: [{ songId: 1 }] });

    expect(result.status).toBe(500);
    expect(result.body.response.code).toBe(-1);
    expect(result.body.response.error).toContain('ECONNREFUSED');
    expect(result.body.response.error).toContain('npm run proxy');
  });
});
