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

import getIsPlaylistFan from '../src/services/fav/getIsPlaylistFan';
import { runWithCredential } from '../src/util/requestCredential';

const mockedGet = mockGet as jest.Mock;

describe('services/getIsPlaylistFan', () => {
  beforeEach(() => {
    mockedGet.mockReset();
  });

  it('通过 musicu.fcg 明文通道查询 PlaylistFavRead/IsPlaylistFan 并归一化 m_fan', async () => {
    mockedGet.mockResolvedValue({
      data: {
        req_0: {
          code: 0,
          data: { m_fan: { '7011264340': 1, '7011264341': 0 } },
        },
      },
    });

    const result = await getIsPlaylistFan({ disstids: ['7011264340', '7011264341'] });

    const [url, config] = mockedGet.mock.calls[0];
    expect(url).toContain('u.y.qq.com/cgi-bin/musicu.fcg');
    const data = JSON.parse(config.params.data);
    expect(data.req_0.module).toBe('music.musicasset.PlaylistFavRead');
    expect(data.req_0.method).toBe('IsPlaylistFan');
    // 上游要求数字 id（字符串会返回 10006 参数错误）
    expect(data.req_0.param.v_tid).toEqual([7011264340, 7011264341]);
    expect(result).toEqual({
      status: 200,
      body: {
        response: {
          code: 0,
          req_0: {
            code: 0,
            data: { m_fan: { '7011264340': 1, '7011264341': 0 } },
          },
        },
      },
    });
  });

  it('超过 100 个 disstid 时自动分批并合并结果', async () => {
    mockGet.mockResolvedValue({
      data: { req_0: { code: 0, data: { m_fan: { tid1: 1 } } } },
    });
    const disstids = Array.from({ length: 150 }, (_, i) => 1000 + i);
    const result = await getIsPlaylistFan({ disstids });

    expect(mockedGet).toHaveBeenCalledTimes(2);
    const batched1 = JSON.parse(mockedGet.mock.calls[0][1].params.data).req_0.param.v_tid;
    const batched2 = JSON.parse(mockedGet.mock.calls[1][1].params.data).req_0.param.v_tid;
    expect(batched1).toHaveLength(100);
    expect(batched2).toHaveLength(50);
    expect(batched1[0]).toBe(1000); // 数字类型（非字符串）
    expect(result.body.response.req_0?.data?.m_fan).toEqual({ tid1: 1 });
  });

  it('未登录（code 1000）信号原样透出', async () => {
    mockedGet.mockResolvedValue({
      data: { req_0: { code: 1000, data: null } },
    });
    const result = await getIsPlaylistFan({ disstids: ['7011264340'] });
    expect(result.body.response.code).toBe(1000);
  });

  it('多用户：cookie 随请求头发送', async () => {
    mockedGet.mockResolvedValue({
      data: { req_0: { code: 0, data: { m_fan: {} } } },
    });

    await runWithCredential({ cookie: 'uin=1234567890; skey=abc', uin: '1234567890' }, () =>
      getIsPlaylistFan({ disstids: ['7011264340'] }),
    );

    const config = mockedGet.mock.calls[0][1];
    expect(config.headers.Cookie).toBe('uin=1234567890; skey=abc');
  });

  it('全部批次失败时返回 500 并带原因', async () => {
    mockedGet.mockRejectedValue(new Error('network down'));
    const result = await getIsPlaylistFan({ disstids: ['7011264340'] });
    expect(result.status).toBe(500);
    expect(result.body.response.code).toBe(-1);
    expect(result.body.response.message).toContain('network down');
  });
});
