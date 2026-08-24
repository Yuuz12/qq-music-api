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

import getIsSongFan from '../src/services/fav/getIsSongFan';

const mockedGet = mockGet as jest.Mock;

describe('services/getIsSongFan', () => {
  beforeEach(() => {
    mockedGet.mockReset();
  });

  it('调用 IsSongFanByMid 并携带 v_songMid 列表', async () => {
    mockedGet.mockResolvedValue({
      data: {
        code: 0,
        req_0: {
          code: 0,
          data: { m_fan: { '003rJSwm3TechU': 1 } },
        },
      },
    });

    const result = await getIsSongFan({ songmids: ['003rJSwm3TechU'] });

    expect(mockedGet).toHaveBeenCalledTimes(1);
    const [url, config] = mockedGet.mock.calls[0];
    expect(url).toBe('https://u.y.qq.com/cgi-bin/musicu.fcg');
    const payload = JSON.parse(config.params.data);
    expect(payload.req_0).toEqual({
      module: 'music.musicasset.SongFavRead',
      method: 'IsSongFanByMid',
      param: { v_songMid: ['003rJSwm3TechU'] },
    });
    expect(result).toEqual({
      status: 200,
      body: {
        response: {
          code: 0,
          req_0: {
            code: 0,
            data: { m_fan: { '003rJSwm3TechU': 1 } },
          },
        },
      },
    });
  });

  it('songmids 缺省时发送空列表', async () => {
    mockedGet.mockResolvedValue({ data: { code: 0 } });

    await getIsSongFan({});

    const payload = JSON.parse(mockedGet.mock.calls[0][1].params.data);
    expect(payload.req_0.param.v_songMid).toEqual([]);
  });

  it('上游请求失败时返回 500 响应结构', async () => {
    mockedGet.mockRejectedValue(new Error('boom'));

    const result = await getIsSongFan({ songmids: ['mid'] });

    expect(result.status).toBe(500);
    expect(result.body.response.code).toBe(-1);
  });

  it('超过 100 个 mid 时分批请求并合并 m_fan（避免上游 414 URI Too Large）', async () => {
    const mids = Array.from({ length: 150 }, (_, i) => `mid${i}`);
    mockedGet
      .mockResolvedValueOnce({
        data: { req_0: { code: 0, data: { m_fan: { mid0: 1 } } } },
      })
      .mockResolvedValueOnce({
        data: { req_0: { code: 0, data: { m_fan: { mid149: 1 } } } },
      });

    const result = await getIsSongFan({ songmids: mids });

    expect(mockedGet).toHaveBeenCalledTimes(2);
    const firstBatch = JSON.parse(mockedGet.mock.calls[0][1].params.data).req_0.param.v_songMid;
    const secondBatch = JSON.parse(mockedGet.mock.calls[1][1].params.data).req_0.param.v_songMid;
    expect(firstBatch).toHaveLength(100);
    expect(firstBatch[0]).toBe('mid0');
    expect(secondBatch).toHaveLength(50);
    expect(secondBatch[0]).toBe('mid100');
    expect(result.status).toBe(200);
    expect(result.body.response.code).toBe(0);
    expect(result.body.response.req_0?.data?.m_fan).toEqual({ mid0: 1, mid149: 1 });
  });

  it('部分批次失败时降级返回已取得的部分并保持 200', async () => {
    const mids = Array.from({ length: 150 }, (_, i) => `mid${i}`);
    mockedGet
      .mockResolvedValueOnce({
        data: { req_0: { code: 0, data: { m_fan: { mid0: 1 } } } },
      })
      .mockRejectedValueOnce(new Error('network down'));

    const result = await getIsSongFan({ songmids: mids });

    expect(result.status).toBe(200);
    expect(result.body.response.req_0?.data?.m_fan).toEqual({ mid0: 1 });
  });
});
