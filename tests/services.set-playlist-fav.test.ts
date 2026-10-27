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

import setPlaylistFav from '../src/services/fav/setPlaylistFav';
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

type FavResult = Awaited<ReturnType<typeof setPlaylistFav>>;
const withCred = (fn: () => Promise<FavResult>) =>
  runWithCredential({ cookie: FULL_COOKIE, uin: '1234567890' }, fn);

describe('services/setPlaylistFav（客户端式免签直写）', () => {
  beforeEach(() => {
    mockedGet.mockReset();
    mockedGet.mockRejectedValue(new Error('network down'));
  });

  it('FavPlaylist：客户端最小 Cookie + 客户端 comm 直写', async () => {
    mockedGet.mockResolvedValue({
      data: { req_1: { code: 0, data: { result: 0, v_failedPlaylistId: [] } } },
    });

    const result = await withCred(() => setPlaylistFav({ disstid: '7011264340', isFan: false }));

    expect(mockedGet).toHaveBeenCalledTimes(1);
    const [url, config] = mockedGet.mock.calls[0];
    expect(url).toContain('musicu.fcg');
    expect(config.params.data).toContain('"method":"FavPlaylist"');
    expect(config.params.data).toContain('"v_playlistId":[7011264340]');
    expect(config.params.data).toContain('"authst":"Q_H_L_test"');
    expect(config.headers.Cookie).not.toContain('p_skey');
    expect(result.body.response.code).toBe(0);
  });

  it('已收藏时调用 CancelFavPlaylist', async () => {
    mockedGet.mockResolvedValue({
      data: { req_1: { code: 0, data: { result: 0, v_failedPlaylistId: [] } } },
    });

    await withCred(() => setPlaylistFav({ disstid: '7011264340', isFan: true }));

    expect(mockedGet.mock.calls[0][1].params.data).toContain('"method":"CancelFavPlaylist"');
  });

  it('disstid 为空或非数字时返回 400，不发上游请求', async () => {
    const empty = await setPlaylistFav({ disstid: '  ' });
    const bad = await setPlaylistFav({ disstid: 'abc' });

    expect(mockedGet).not.toHaveBeenCalled();
    expect(empty.status).toBe(400);
    expect(empty.body.response.code).toBe(-1);
    expect(bad.status).toBe(400);
  });

  it('80105 返回会话过期提示', async () => {
    mockedGet.mockResolvedValue({ data: { req_1: { code: 80105 } } });

    const result = await withCred(() => setPlaylistFav({ disstid: '7011264340' }));

    expect(result.body.response.code).toBe(80105);
    expect((result.body.response as { message?: string }).message).toContain('登录会话已过期');
  });

  it('未配置凭据时返回 -4，不发上游请求', async () => {
    const result = await setPlaylistFav({ disstid: '7011264340' });

    expect(mockedGet).not.toHaveBeenCalled();
    expect(result.body.response.code).toBe(-4);
  });
});
