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

import radioDislike from '../src/services/radio/radioDislike';

const mockedGet = mockGet as jest.Mock;

describe('services/radioDislike', () => {
  beforeEach(() => {
    mockedGet.mockReset();
  });

  it('向 stat.pc.music.qq.com 上报 fcg_val_report（data_type=112, method=0, data2=15）', async () => {
    mockedGet.mockResolvedValue({ data: '' });

    const result = await radioDislike({ radioId: 99, songId: 1459873321, songType: 0 });

    expect(mockedGet).toHaveBeenCalledTimes(1);
    const [url] = mockedGet.mock.calls[0];
    expect(url).toContain('http://stat.pc.music.qq.com/fcgi-bin/fcg_val_report.fcg');
    expect(url).toContain('data_type=112');
    expect(url).toContain('version=1502');
    expect(url).toContain('method=0');
    expect(url).toContain('data=99');
    expect(url).toContain('data2=15');
    expect(url).toContain('data3=1459873321');
    expect(url).toContain('songtype=0');
    expect(url).toContain('data4=0');
    expect(result).toEqual({
      status: 200,
      body: {
        response: {
          code: 0,
          data: { reported: true },
        },
      },
    });
  });

  it('默认 radioId=99，songType 缺省为 0', async () => {
    mockedGet.mockResolvedValue({ data: '' });

    await radioDislike({ songId: 123 });

    const [url] = mockedGet.mock.calls[0];
    expect(url).toContain('data=99');
    expect(url).toContain('songtype=0');
  });

  it('统计上报失败时仍返回 200 并标记 reported=false（fire-and-forget）', async () => {
    mockedGet.mockRejectedValue(new Error('stat blocked'));

    const result = await radioDislike({ radioId: 99, songId: 1 });

    expect(result.status).toBe(200);
    expect(result.body.response.code).toBe(0);
    expect(result.body.response.data).toEqual({
      reported: false,
      error: expect.stringContaining('stat blocked'),
    });
  });
});
