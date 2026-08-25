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

import getIsAlbumFan from '../src/services/fav/getIsAlbumFan';
import { runWithCredential } from '../src/util/requestCredential';

const mockedGet = mockGet as jest.Mock;

describe('services/getIsAlbumFan', () => {
  beforeEach(() => {
    mockedGet.mockReset();
  });

  it('通过 musicu.fcg 明文通道查询 AlbumFavRead/IsAlbumFan 并归一化 m_fan', async () => {
    mockedGet.mockResolvedValue({
      data: {
        req_0: {
          code: 0,
          data: { m_fan: { '0016l2F430zMux': 1, '001UP7mW458ipG': 0 } },
        },
      },
    });

    const result = await getIsAlbumFan({ albummids: ['0016l2F430zMux', '001UP7mW458ipG'] });

    const [url, config] = mockedGet.mock.calls[0];
    expect(url).toContain('u.y.qq.com/cgi-bin/musicu.fcg');
    const data = JSON.parse(config.params.data);
    expect(data.req_0.module).toBe('music.musicasset.AlbumFavRead');
    expect(data.req_0.method).toBe('IsAlbumFan');
    expect(data.req_0.param.v_albumMid).toEqual(['0016l2F430zMux', '001UP7mW458ipG']);
    expect(result).toEqual({
      status: 200,
      body: {
        response: {
          code: 0,
          req_0: {
            code: 0,
            data: { m_fan: { '0016l2F430zMux': 1, '001UP7mW458ipG': 0 } },
          },
        },
      },
    });
  });

  it('超过 100 个 mid 时自动分批并合并结果', async () => {
    mockGet.mockResolvedValue({
      data: { req_0: { code: 0, data: { m_fan: { mid1: 1 } } } },
    });
    const albummids = Array.from({ length: 150 }, (_, i) => `mid${i}`);
    const result = await getIsAlbumFan({ albummids });

    expect(mockedGet).toHaveBeenCalledTimes(2);
    const batched1 = JSON.parse(mockedGet.mock.calls[0][1].params.data).req_0.param.v_albumMid;
    const batched2 = JSON.parse(mockedGet.mock.calls[1][1].params.data).req_0.param.v_albumMid;
    expect(batched1).toHaveLength(100);
    expect(batched2).toHaveLength(50);
    expect(result.body.response.req_0?.data?.m_fan).toEqual({ mid1: 1 });
  });

  it('未登录（code 1000）信号原样透出', async () => {
    mockedGet.mockResolvedValue({
      data: { req_0: { code: 1000, data: null } },
    });
    const result = await getIsAlbumFan({ albummids: ['0016l2F430zMux'] });
    expect(result.body.response.code).toBe(1000);
  });

  it('多用户：cookie/uin 随请求头发送并写入 comm', async () => {
    mockedGet.mockResolvedValue({
      data: { req_0: { code: 0, data: { m_fan: {} } } },
    });

    await runWithCredential({ cookie: 'uin=1234567890; skey=abc', uin: '1234567890' }, () =>
      getIsAlbumFan({ albummids: ['0016l2F430zMux'] }),
    );

    const config = mockedGet.mock.calls[0][1];
    expect(config.headers.Cookie).toBe('uin=1234567890; skey=abc');
    const data = JSON.parse(config.params.data);
    expect(data.comm.uin).toBe('1234567890');
    expect(data.req_0.param.uin).toBe('1234567890');
  });

  it('全部批次失败时返回 500 并带原因', async () => {
    mockedGet.mockRejectedValue(new Error('network down'));
    const result = await getIsAlbumFan({ albummids: ['0016l2F430zMux'] });
    expect(result.status).toBe(500);
    expect(result.body.response.code).toBe(-1);
    expect(result.body.response.message).toContain('network down');
  });
});
