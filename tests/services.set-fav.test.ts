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

import setFav, { DEFAULT_FAV_DIR_ID } from '../src/services/fav/setFav';
import { runWithCredential } from '../src/util/requestCredential';

const mockedGet = mockGet as jest.Mock;
const FULL_COOKIE = [
  'uin=1234567890',
  'p_uin=o1234567890',
  'pt2gguin=o1234567890',
  'qm_keyst=Q_H_L_test',
  'qqmusic_key=Q_H_L_test',
  'p_skey=WEBONLY',
  'psrf_qqaccess_token=ACCESSTOKEN',
  'psrf_qqopenid=OPENID',
  'tmeLoginType=2',
  'login_type=1',
  'music_ignore_pskey=1',
].join('; ');

type FavResult = Awaited<ReturnType<typeof setFav>>;
const withCred = (fn: () => Promise<FavResult>) =>
  runWithCredential({ cookie: FULL_COOKIE, uin: '1234567890' }, fn);

describe('services/setFav（客户端式免签直写）', () => {
  beforeEach(() => {
    mockedGet.mockReset();
    mockedGet.mockRejectedValue(new Error('network down'));
  });

  it('AddSonglist：用客户端最小 Cookie + 客户端 comm 直写', async () => {
    mockedGet.mockResolvedValue({
      data: { req_1: { code: 0, data: { result: { songlist: [] } } } },
    });

    const result = await withCred(() => setFav({ songs: [{ songId: 1459873321, songType: 0 }] }));

    expect(mockedGet).toHaveBeenCalledTimes(1);
    const [url, config] = mockedGet.mock.calls[0];
    expect(url).toContain('musicu.fcg');
    expect(config.params.data).toContain('"method":"AddSonglist"');
    expect(config.params.data).toContain('"dirId":201');
    expect(config.params.data).toContain('"authst":"Q_H_L_test"');
    expect(config.headers.Cookie).toContain('qm_keyst=Q_H_L_test');
    expect(config.headers.Cookie).toContain('psrf_qqopenid=OPENID');
    // 网页字段不能混进客户端最小集
    expect(config.headers.Cookie).not.toContain('p_skey');
    expect(result).toEqual({
      status: 200,
      body: {
        response: {
          code: 0,
          data: { raw: expect.any(String) },
        },
      },
    });
  });

  it('已喜欢时调用 DelSonglist', async () => {
    mockedGet.mockResolvedValue({ data: { req_1: { code: 0 } } });

    await withCred(() => setFav({ songs: [{ songId: 123, songType: 1 }], isFan: true }));

    const payload = mockedGet.mock.calls[0][1].params.data;
    expect(payload).toContain('"method":"DelSonglist"');
    expect(payload).toContain('"songId":123');
  });

  it('默认 dirId=201，songType 缺省为 0，支持自定义 dirId', async () => {
    mockedGet.mockResolvedValue({ data: { req_1: { code: 0 } } });

    await withCred(() => setFav({ songs: [{ songId: 456 }] }));
    expect(mockedGet.mock.calls[0][1].params.data).toContain('"dirId":201');
    expect(mockedGet.mock.calls[0][1].params.data).toContain('"songType":0');

    await withCred(() => setFav({ dirId: 205, songs: [{ songId: 456, songType: 2 }] }));
    expect(mockedGet.mock.calls[1][1].params.data).toContain('"dirId":205');
  });

  it('遇到 80106 会短暂重试一次，成功后返回 code=0', async () => {
    mockedGet
      .mockResolvedValueOnce({ data: { req_1: { code: 80106 } } })
      .mockResolvedValueOnce({ data: { req_1: { code: 0 } } });

    const result = await withCred(() => setFav({ songs: [{ songId: 1 }] }));

    expect(mockedGet).toHaveBeenCalledTimes(2);
    expect(result.body.response.code).toBe(0);
  });

  it('持续 80106 时返回可重试提示', async () => {
    mockedGet.mockResolvedValue({ data: { req_1: { code: 80106 } } });

    const result = await withCred(() => setFav({ songs: [{ songId: 1 }] }));

    expect(mockedGet).toHaveBeenCalledTimes(2);
    expect(result.body.response.code).toBe(80106);
    expect((result.body.response as { message?: string }).message).toContain('操作太频繁');
  });

  it('80105 直接返回会话过期提示（不再走官方页面代理）', async () => {
    mockedGet.mockResolvedValue({ data: { req_1: { code: 80105 } } });

    const result = await withCred(() => setFav({ songs: [{ songId: 1 }] }));

    expect(mockedGet).toHaveBeenCalledTimes(1);
    expect(result.body.response.code).toBe(80105);
    expect((result.body.response as { message?: string }).message).toContain('登录会话已过期');
  });

  it('未配置凭据时直接返回 -4，不发上游请求', async () => {
    const result = await setFav({ songs: [{ songId: 1 }] });

    expect(mockedGet).not.toHaveBeenCalled();
    expect(result.body.response.code).toBe(-4);
  });

  it('凭据缺少 qm_keyst 时返回 -4，不发上游请求', async () => {
    const result = await runWithCredential(
      { cookie: 'uin=1234567890; skey=abc', uin: '1234567890' },
      () => setFav({ songs: [{ songId: 1 }] }),
    );

    expect(mockedGet).not.toHaveBeenCalled();
    expect(result.body.response.code).toBe(-4);
  });

  it('DEFAULT_FAV_DIR_ID 保持 201', () => {
    expect(DEFAULT_FAV_DIR_ID).toBe(201);
  });
});
