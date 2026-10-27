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

import setAlbumFav from '../src/services/fav/setAlbumFav';
import { runWithCredential } from '../src/util/requestCredential';

const mockedGet = mockGet as jest.Mock;
const FULL_COOKIE = [
  'uin=1234567890',
  'p_uin=o1234567890',
  'qm_keyst=Q_H_L_test',
  'qqmusic_key=Q_H_L_test',
  'p_skey=WEBONLY',
  'psrf_qqaccess_token=ACCESSTOKEN',
  'psrf_qqopenid=OPENID',
  'tmeLoginType=2',
  'login_type=1',
  'music_ignore_pskey=1',
].join('; ');

type FavResult = Awaited<ReturnType<typeof setAlbumFav>>;
const withCred = (fn: () => Promise<FavResult>) =>
  runWithCredential({ cookie: FULL_COOKIE, uin: '1234567890' }, fn);

describe('services/setAlbumFav（客户端式免签直写）', () => {
  beforeEach(() => {
    mockedGet.mockReset();
    mockedGet.mockRejectedValue(new Error('network down'));
  });

  it('FavAlbum：客户端最小 Cookie + 客户端 comm 直写', async () => {
    mockedGet.mockResolvedValue({
      data: { req_1: { code: 0, data: { result: 0, v_failedAlbumMid: [] } } },
    });

    const result = await withCred(() => setAlbumFav({ albumMid: '0016l2F430zMux', isFan: false }));

    expect(mockedGet).toHaveBeenCalledTimes(1);
    const [url, config] = mockedGet.mock.calls[0];
    expect(url).toContain('musicu.fcg');
    expect(config.params.data).toContain('"method":"FavAlbum"');
    expect(config.params.data).toContain('"v_albumMid":["0016l2F430zMux"]');
    expect(config.params.data).toContain('"authst":"Q_H_L_test"');
    expect(config.headers.Cookie).not.toContain('p_skey');
    expect(result.body.response.code).toBe(0);
  });

  it('已收藏时调用 CancelFavAlbum', async () => {
    mockedGet.mockResolvedValue({
      data: { req_1: { code: 0, data: { result: 0, v_failedAlbumMid: [] } } },
    });

    await withCred(() => setAlbumFav({ albumMid: '0016l2F430zMux', isFan: true }));

    expect(mockedGet.mock.calls[0][1].params.data).toContain('"method":"CancelFavAlbum"');
  });

  it('albumMid 为空时返回 400，不发上游请求', async () => {
    const result = await setAlbumFav({ albumMid: '  ' });

    expect(mockedGet).not.toHaveBeenCalled();
    expect(result.status).toBe(400);
    expect(result.body.response.code).toBe(-1);
  });

  it('80105 返回会话过期提示', async () => {
    mockedGet.mockResolvedValue({ data: { req_1: { code: 80105 } } });

    const result = await withCred(() => setAlbumFav({ albumMid: '0016l2F430zMux' }));

    expect(result.body.response.code).toBe(80105);
    expect((result.body.response as { message?: string }).message).toContain('登录会话已过期');
  });

  it('未配置凭据时返回 -4，不发上游请求', async () => {
    const result = await setAlbumFav({ albumMid: '0016l2F430zMux' });

    expect(mockedGet).not.toHaveBeenCalled();
    expect(result.body.response.code).toBe(-4);
  });
});
