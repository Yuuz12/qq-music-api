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

import getConcernStatus from '../src/services/concern/getConcernStatus';
import setSingerConcern from '../src/services/concern/setSingerConcern';
import setUserConcern from '../src/services/concern/setUserConcern';
import { runWithCredential } from '../src/util/requestCredential';

const mockedGet = mockGet as jest.Mock;

/** 取第 n 次 axios.get 的请求报文（服务层把 fcg 报文整体塞在 params.data 里） */
const bodyOf = (callIndex = 0) => {
  const [, config] = mockedGet.mock.calls[callIndex];
  return JSON.parse(config.params.data);
};

const COOKIE = 'uin=123456; qm_keyst=TESTKEY123; other=1';

/** 在「携带凭据」的上下文中执行（服务层经 AsyncLocalStorage 读取） */
const withCredential = <T>(fn: () => Promise<T>, cookie = COOKIE, uin = '123456'): Promise<T> =>
  runWithCredential({ cookie, uin }, fn);

describe('services/concern/getConcernStatus', () => {
  beforeEach(() => {
    mockedGet.mockReset();
  });

  it('基础 comm 直连 musicu.fcg，vec_userinfo 用 usertype=1（歌手）+ singerMid', async () => {
    mockedGet.mockResolvedValue({
      data: { req_0: { code: 0, data: { map_singer_status: { '0025NhlN2yWrP4': 1 } } } },
    });

    const result = await getConcernStatus({ mids: ['0025NhlN2yWrP4'] });

    expect(mockedGet).toHaveBeenCalledTimes(1);
    const [url, config] = mockedGet.mock.calls[0];
    expect(url).toContain('u.y.qq.com/cgi-bin/musicu.fcg');
    expect(config.params.format).toBe('json');
    expect(config.headers.Referer).toBe('https://y.qq.com/');
    expect(bodyOf()).toEqual({
      // 读接口只要基础 comm（不带 uin/g_tk）
      comm: { ct: 24, cv: 0, format: 'json', platform: 'yqq.json' },
      req_0: {
        module: 'Concern.ConcernSystemServer',
        method: 'cgi_qry_concern_status',
        param: {
          vec_userinfo: [{ usertype: 1, userid: '0025NhlN2yWrP4' }],
          opertype: 5,
          encrypt_singerid: 1,
        },
      },
    });
    expect(result.status).toBe(200);
    expect(result.body.response.code).toBe(0);
    expect(result.body.response.req_0?.data?.map_singer_status).toEqual({ '0025NhlN2yWrP4': 1 });
  });

  it('批量去重并把单次上限压在 20 个（GET 通道 URL 长度保护）', async () => {
    mockedGet.mockResolvedValue({ data: { req_0: { code: 0, data: { map_singer_status: {} } } } });
    const mids = ['a1', 'a1', ...Array.from({ length: 30 }, (_, i) => `m${i}`)];

    await getConcernStatus({ mids });

    const param = bodyOf().req_0.param;
    expect(param.vec_userinfo).toHaveLength(20);
    expect(param.vec_userinfo[0]).toEqual({ usertype: 1, userid: 'a1' });
  });

  it('空 mids / encuins 直接 400，不打上游', async () => {
    const result = await getConcernStatus({ mids: ['  '], encuins: [] });
    expect(result.status).toBe(400);
    expect(result.body.response.code).toBe(-1);
    expect(mockedGet).not.toHaveBeenCalled();
  });

  it('encuins 用 usertype=0 查询（他人主页「我有没有关注 TA」）', async () => {
    mockedGet.mockResolvedValue({
      data: { req_0: { code: 0, data: { map_user_status: { 'oivioeol7i6P7c**': 1 } } } },
    });

    const result = await getConcernStatus({ encuins: ['oivioeol7i6P7c**'] });

    expect(bodyOf().req_0.param).toEqual({
      vec_userinfo: [{ usertype: 0, userid: 'oivioeol7i6P7c**' }],
      opertype: 5,
      encrypt_singerid: 1, // 对用户维度无副作用（实测）
    });
    expect(result.body.response.req_0?.data?.map_user_status).toEqual({ 'oivioeol7i6P7c**': 1 });
  });

  it('mids 与 encuins 可一次混合查询（两套 map 同时返回）', async () => {
    mockedGet.mockResolvedValue({
      data: {
        req_0: {
          code: 0,
          data: {
            map_singer_status: { '0025NhlN2yWrP4': 1 },
            map_user_status: { 'oivioeol7i6P7c**': 0 },
          },
        },
      },
    });

    await getConcernStatus({ mids: ['0025NhlN2yWrP4'], encuins: ['oivioeol7i6P7c**'] });

    expect(bodyOf().req_0.param.vec_userinfo).toEqual([
      { usertype: 1, userid: '0025NhlN2yWrP4' },
      { usertype: 0, userid: 'oivioeol7i6P7c**' },
    ]);
  });

  it('上游业务码原样透出（未登录 1000）', async () => {
    mockedGet.mockResolvedValue({ data: { req_0: { code: 1000 } } });
    const result = await getConcernStatus({ mids: ['0025NhlN2yWrP4'] });
    expect(result.body.response.code).toBe(1000);
  });

  it('网络异常回 500 + code -1，不把异常抛给控制器', async () => {
    mockedGet.mockRejectedValue(new Error('boom'));
    const result = await getConcernStatus({ mids: ['0025NhlN2yWrP4'] });
    expect(result.status).toBe(500);
    expect(result.body.response.code).toBe(-1);
    expect(result.body.response.message).toContain('boom');
  });
});

describe('services/concern/setSingerConcern', () => {
  beforeEach(() => {
    mockedGet.mockReset();
  });

  it('isFollow=true（已关注）时发 opertype=1（取关）', async () => {
    mockedGet.mockResolvedValue({ data: { req_0: { code: 0, data: { code: 0 } } } });

    await withCredential(() => setSingerConcern({ singermid: '0025NhlN2yWrP4', isFollow: true }));

    const body = bodyOf();
    expect(body.req_0).toEqual({
      module: 'Concern.ConcernSystemServer',
      method: 'cgi_concern_user_v2',
      param: {
        opertype: 1,
        source: 0,
        userinfo: { usertype: 1, userid: '0025NhlN2yWrP4' },
        encrypt_singerid: 1,
      },
    });
    // 写接口必须完整 comm：uin + g_tk（500026 的教训）
    expect(body.comm).toEqual(
      expect.objectContaining({
        uin: '123456',
        loginUin: '123456',
        g_tk: expect.any(Number),
        g_tk_new_20200303: expect.any(Number),
      }),
    );
    expect(body.comm.g_tk).toBeGreaterThan(0);
    expect(body.comm.g_tk).toBe(body.comm.g_tk_new_20200303);
  });

  it('isFollow=false（未关注）时发 opertype=0（关注）', async () => {
    mockedGet.mockResolvedValue({ data: { req_0: { code: 0, data: { code: 0 } } } });
    await withCredential(() => setSingerConcern({ singermid: '0025NhlN2yWrP4', isFollow: false }));
    expect(bodyOf().req_0.param.opertype).toBe(0);
  });

  it('qqmusic_key 也是合法的音乐 Key 来源', async () => {
    mockedGet.mockResolvedValue({ data: { req_0: { code: 0, data: { code: 0 } } } });
    const result = await withCredential(
      () => setSingerConcern({ singermid: '0025NhlN2yWrP4' }),
      'uin=123456; qqmusic_key=ALTKEY',
    );
    expect(result.body.response.code).toBe(0);
    expect(bodyOf().comm.g_tk).toBeGreaterThan(0);
  });

  it('无凭据 → code -4 且不打上游（前端据此提示配置 Cookie）', async () => {
    const result = await setSingerConcern({ singermid: '0025NhlN2yWrP4' });
    expect(result.body.response.code).toBe(-4);
    expect(result.body.response.message).toContain('未登录');
    expect(mockedGet).not.toHaveBeenCalled();
  });

  it('凭据缺少音乐 Key → code -4（无 g_tk 必被 500026 拒，提前拦截）', async () => {
    const result = await withCredential(
      () => setSingerConcern({ singermid: '0025NhlN2yWrP4' }),
      'uin=123456; some=1',
    );
    expect(result.body.response.code).toBe(-4);
    expect(result.body.response.message).toContain('qm_keyst');
    expect(mockedGet).not.toHaveBeenCalled();
  });

  it('缺 singermid → 400', async () => {
    const result = await withCredential(() => setSingerConcern({ singermid: '  ' }));
    expect(result.status).toBe(400);
    expect(mockedGet).not.toHaveBeenCalled();
  });

  it('外层 code=0 但内层 data.code≠0 时按失败处理（业务码在内层）', async () => {
    mockedGet.mockResolvedValue({ data: { req_0: { code: 0, data: { code: 500026 } } } });
    const result = await withCredential(() => setSingerConcern({ singermid: '0025NhlN2yWrP4' }));
    expect(result.body.response.code).toBe(500026);
    expect(result.body.response.message).toContain('登录凭据校验不通过');
  });

  it('104604（连续操作限流）给出「操作太频繁」提示', async () => {
    mockedGet.mockResolvedValue({ data: { req_0: { code: 0, data: { code: 104604 } } } });
    const result = await withCredential(() => setSingerConcern({ singermid: '0025NhlN2yWrP4' }));
    expect(result.body.response.code).toBe(104604);
    expect(result.body.response.message).toContain('操作太频繁');
  });

  it('外层 500026（基础 comm 反篡改拒绝）透出并给出可读提示', async () => {
    mockedGet.mockResolvedValue({ data: { req_0: { code: 500026, data: { code: 500026 } } } });
    const result = await withCredential(() => setSingerConcern({ singermid: '0025NhlN2yWrP4' }));
    expect(result.body.response.code).toBe(500026);
    expect(result.body.response.message).toContain('登录凭据校验不通过');
  });
});

describe('services/concern/setUserConcern', () => {
  beforeEach(() => {
    mockedGet.mockReset();
  });

  const ENCUIN = 'oivioeol7i6P7c**';

  it('用户维度用 usertype=0 + EncUin，且不带 encrypt_singerid', async () => {
    mockedGet.mockResolvedValue({ data: { req_0: { code: 0, data: { code: 0 } } } });

    const result = await withCredential(() => setUserConcern({ encuin: ENCUIN, isFollow: true }));

    const body = bodyOf();
    expect(body.req_0).toEqual({
      module: 'Concern.ConcernSystemServer',
      method: 'cgi_concern_user_v2',
      param: {
        opertype: 1,
        source: 0,
        userinfo: { usertype: 0, userid: ENCUIN },
      },
    });
    expect(body.req_0.param).not.toHaveProperty('encrypt_singerid');
    expect(body.comm).toEqual(expect.objectContaining({ uin: '123456', g_tk: expect.any(Number) }));
    expect(result.body.response.code).toBe(0);
  });

  it('EncUin 里的 * 原样保留（不能当通配符/被截断）', async () => {
    mockedGet.mockResolvedValue({ data: { req_0: { code: 0, data: { code: 0 } } } });
    await withCredential(() => setUserConcern({ encuin: ENCUIN }));
    expect(bodyOf().req_0.param.userinfo.userid).toBe(ENCUIN);
  });

  it('isFollow=false → opertype=0（关注）', async () => {
    mockedGet.mockResolvedValue({ data: { req_0: { code: 0, data: { code: 0 } } } });
    await withCredential(() => setUserConcern({ encuin: ENCUIN, isFollow: false }));
    expect(bodyOf().req_0.param.opertype).toBe(0);
  });

  it('缺 encuin → 400', async () => {
    const result = await withCredential(() => setUserConcern({ encuin: '  ' }));
    expect(result.status).toBe(400);
    expect(mockedGet).not.toHaveBeenCalled();
  });

  it('取关失败时提示前缀是「取关」（不是笼统的「关注失败」）', async () => {
    mockedGet.mockResolvedValue({ data: { req_0: { code: 500026, data: { code: 500026 } } } });
    const result = await withCredential(() => setUserConcern({ encuin: ENCUIN, isFollow: true }));
    expect(result.body.response.code).toBe(500026);
    expect(result.body.response.message).toContain('取关失败');
  });
});
