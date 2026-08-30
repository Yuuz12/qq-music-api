const mockAxiosGet = jest.fn();

jest.mock('axios', () => ({
  __esModule: true,
  default: {
    get: (...args: unknown[]) => mockAxiosGet(...args),
  },
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

import refreshCredential from '../src/services/user/refreshCredential';
import { runWithCredential } from '../src/util/requestCredential';

const mockedAxiosGet = mockAxiosGet as jest.Mock;

/** 在指定凭据上下文中调用服务 */
const call = (cookie?: string, uin?: string) =>
  runWithCredential({ cookie, uin }, () => refreshCredential());

describe('services/refreshCredential', () => {
  beforeEach(() => {
    mockedAxiosGet.mockReset();
  });

  it('凭据缺失时应返回 301 未登陆且不发起上游请求', async () => {
    const result = await call(undefined, undefined);
    expect(result).toEqual({
      status: 200,
      body: { response: { code: 301, message: '未登陆' } },
    });
    expect(mockedAxiosGet).not.toHaveBeenCalled();
  });

  it('cookie 缺少 musickey 时应返回 301', async () => {
    const result = await call('uin=123; qm_keyst=', '123');
    expect(result.body.response.code).toBe(301);
    expect(mockedAxiosGet).not.toHaveBeenCalled();
  });

  it('上游返回新 musickey 时应返回 code=0 并携带新 key', async () => {
    mockedAxiosGet.mockResolvedValue({
      data: {
        code: 0,
        req1: { code: 0, data: { musickey: 'Q_H_L_63NEWKEY' } },
      },
    });

    const result = await call('uin=123; qm_keyst=OLDKEY; qqmusic_key=OLDKEY', '123');

    expect(result).toEqual({
      status: 200,
      body: { response: { code: 0, data: { musickey: 'Q_H_L_63NEWKEY' } } },
    });

    const [url, config] = mockedAxiosGet.mock.calls[0];
    expect(url).toContain('https://u6.y.qq.com/cgi-bin/musics.fcg');
    expect(url).toContain('sign=zz');
    const dataParam = JSON.parse(decodeURIComponent(new URL(url).searchParams.get('data') || '{}'));
    // 现代参数形态：strMusicid 必带（2026-08 实测旧形态会被 10006 拒绝）
    expect(dataParam.req1.param).toEqual({
      expired_in: 7776000,
      musicid: 123,
      strMusicid: '123',
      musickey: 'OLDKEY',
    });
    expect((config as { headers: Record<string, string> }).headers.Cookie).toContain(
      'qm_keyst=OLDKEY',
    );
  });

  it('上游 10006（参数形态被拒）时应回退旧参数形态重试', async () => {
    mockedAxiosGet
      .mockResolvedValueOnce({ data: { code: 0, req1: { code: 10006 } } })
      .mockResolvedValueOnce({
        data: { code: 0, req1: { code: 0, data: { musickey: 'Q_H_L_63RETRY' } } },
      });

    const result = await call('uin=123; qm_keyst=OLDKEY', '123');

    expect(result.body.response.code).toBe(0);
    expect(result.body.response.data?.musickey).toBe('Q_H_L_63RETRY');
    expect(mockedAxiosGet).toHaveBeenCalledTimes(2);
    const secondData = JSON.parse(
      decodeURIComponent(new URL(mockedAxiosGet.mock.calls[1][0]).searchParams.get('data') || '{}'),
    );
    expect(secondData.req1.param).toEqual({
      expired_in: 7776000,
      musicid: '123',
      musickey: 'OLDKEY',
    });
  });

  it('上游 1000（key 已失效）时应返回 code=1000 提示重新登录', async () => {
    mockedAxiosGet.mockResolvedValue({ data: { code: 0, req1: { code: 1000 } } });

    const result = await call('uin=123; qm_keyst=DEADKEY', '123');

    expect(result).toEqual({
      status: 200,
      body: {
        response: {
          code: 1000,
          message: '登录已失效，请重新扫码登录',
        },
      },
    });
  });

  it('上游无 musickey 且非已知错误码时应返回刷新失败', async () => {
    mockedAxiosGet.mockResolvedValue({ data: { code: 0, req1: { code: 2001 } } });

    const result = await call('uin=123; qm_keyst=OLDKEY', '123');

    expect(result.body.response.code).toBe(2001);
    expect(result.body.response.message).toBe('刷新失败，建议重新设置 cookie');
  });

  it('网络异常时应返回 500 与 code=-1', async () => {
    mockedAxiosGet.mockRejectedValue(new Error('ECONNRESET'));

    const result = await call('uin=123; qm_keyst=OLDKEY', '123');

    expect(result.status).toBe(500);
    expect(result.body.response.code).toBe(-1);
  });

  it('qqmusic_key 可作为 qm_keyst 缺失时的兜底', async () => {
    mockedAxiosGet.mockResolvedValue({
      data: { code: 0, req1: { code: 0, data: { musickey: 'K2' } } },
    });

    const result = await call('uin=123; qqmusic_key=BACKUPKEY', '123');
    expect(result.body.response.code).toBe(0);

    const dataParam = JSON.parse(
      decodeURIComponent(new URL(mockedAxiosGet.mock.calls[0][0]).searchParams.get('data') || '{}'),
    );
    expect(dataParam.req1.param.musickey).toBe('BACKUPKEY');
  });
});
