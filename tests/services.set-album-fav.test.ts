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

import setAlbumFav from '../src/services/fav/setAlbumFav';
import { runWithCredential } from '../src/util/requestCredential';

const mockedPost = mockPost as jest.Mock;

describe('services/setAlbumFav', () => {
  beforeEach(() => {
    mockedPost.mockReset();
  });

  it('未收藏时通过官方通道代理调用 /album-fav-write（FavAlbum）', async () => {
    mockedPost.mockResolvedValue({
      data: { ok: true, code: 0, raw: '{"code":0,"req_1":{"code":0,"data":{"result":0}}}' },
    });

    const result = await setAlbumFav({
      albumMid: '0016l2F430zMux',
      isFan: false,
    });

    expect(mockedPost).toHaveBeenCalledTimes(1);
    const [url, payload, config] = mockedPost.mock.calls[0];
    expect(url).toContain('/album-fav-write');
    expect(payload).toEqual({
      albumMid: '0016l2F430zMux',
      isFan: false,
    });
    expect(config.headers['Content-Type']).toBe('application/json');
    expect(result).toEqual({
      status: 200,
      body: {
        response: {
          code: 0,
          message: undefined,
          data: { raw: '{"code":0,"req_1":{"code":0,"data":{"result":0}}}' },
        },
      },
    });
  });

  it('已收藏时同样转发到 /album-fav-write（由代理侧映射为 CancelFavAlbum）', async () => {
    mockedPost.mockResolvedValue({ data: { ok: true, code: 0 } });

    await setAlbumFav({
      albumMid: '0016l2F430zMux',
      isFan: true,
    });

    const payload = mockedPost.mock.calls[0][1];
    expect(payload.isFan).toBe(true);
    expect(payload.albumMid).toBe('0016l2F430zMux');
  });

  it('albumMid 为空时直接返回 400，不调用代理', async () => {
    const result = await setAlbumFav({ albumMid: '  ' });

    expect(mockedPost).not.toHaveBeenCalled();
    expect(result.status).toBe(400);
    expect(result.body.response.code).toBe(-1);
  });

  it('albumMid 前后空格会被裁剪', async () => {
    mockedPost.mockResolvedValue({ data: { ok: true, code: 0 } });

    await setAlbumFav({ albumMid: '  0016l2F430zMux  ' });

    expect(mockedPost.mock.calls[0][1].albumMid).toBe('0016l2F430zMux');
  });

  it('多用户：请求头下发的凭据（cookie/uin）随请求转发给代理', async () => {
    mockedPost.mockResolvedValue({ data: { ok: true, code: 0 } });

    await runWithCredential({ cookie: 'uin=1234567890; skey=abc', uin: '1234567890' }, () =>
      setAlbumFav({ albumMid: '0016l2F430zMux' }),
    );

    const payload = mockedPost.mock.calls[0][1];
    expect(payload.cookie).toBe('uin=1234567890; skey=abc');
    expect(payload.uin).toBe('1234567890');
  });

  it('未配置凭据时不转发 cookie/uin 字段（保持兼容）', async () => {
    mockedPost.mockResolvedValue({ data: { ok: true, code: 0 } });

    await setAlbumFav({ albumMid: '0016l2F430zMux' });

    const payload = mockedPost.mock.calls[0][1];
    expect(payload).not.toHaveProperty('cookie');
    expect(payload).not.toHaveProperty('uin');
  });

  it('代理返回错误时透出 message（如代理未启动提示）', async () => {
    mockedPost.mockRejectedValue(new Error('connect ECONNREFUSED'));

    const result = await setAlbumFav({ albumMid: '0016l2F430zMux' });

    expect(result.status).toBe(500);
    expect(result.body.response.code).toBe(-1);
    expect(result.body.response.error).toContain('ECONNREFUSED');
    expect(result.body.response.error).toContain('npm run proxy');
  });
});
