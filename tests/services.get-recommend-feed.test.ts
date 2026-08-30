const mockAxiosPost = jest.fn();

jest.mock('axios', () => ({
  __esModule: true,
  default: {
    post: (...args: unknown[]) => mockAxiosPost(...args),
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

import getRecommendFeed from '../src/services/recommend/getRecommendFeed';
import { runWithCredential } from '../src/util/requestCredential';

const mockedAxiosPost = mockAxiosPost as jest.Mock;

const card = (over: Record<string, unknown>) => ({
  id: '7804197460',
  title: '同学！你抄歌词的笔记本还在吗',
  jumptype: 10014,
  subtype: 0,
  cnt: 30674080,
  cover: 'http://qpic.y.qq.com/music_cover/abc/300?n=1',
  miscellany: { rcmdtemplate: '听过「{String}」，听听这个', rcmdcontent: '退后' },
  ...over,
});

const shelf = (id: number, cards: unknown[]) => ({ id, v_niche: [{ v_card: cards }] });

const resp = (shelves: unknown[], loadMark: number) => ({
  data: { code: 0, req_1: { code: 0, data: { v_shelf: shelves, load_mark: loadMark } } },
});

const call = (cookie?: string, uin?: string) =>
  runWithCredential({ cookie, uin }, () => getRecommendFeed());

describe('services/getRecommendFeed（客户端通道 + 翻页）', () => {
  beforeEach(() => {
    mockedAxiosPost.mockReset();
  });

  it('按 load_mark 翻页：direction/s_num 遵循客户端语义，v_cache/v_uniq 恒为空', async () => {
    mockedAxiosPost
      .mockResolvedValueOnce(
        resp(
          [
            shelf(301, [
              card({ id: '7424827127', title: '每日30首', subtype: 510, miscellany: {} }),
            ]),
            shelf(271, [card({})]),
          ],
          0,
        ),
      )
      .mockResolvedValueOnce(
        resp([shelf(205, [card({ id: '8628298123', title: '《绝区零》欢迎来到新艾利都' })])], -1),
      );

    const result = await call('uin=123; qm_keyst=KEY', '123');

    expect(mockedAxiosPost).toHaveBeenCalledTimes(2);
    const [url1, body1] = mockedAxiosPost.mock.calls[0];
    const [, body2] = mockedAxiosPost.mock.calls[1];

    expect(String(url1)).toContain('https://u6.y.qq.com/cgi-bin/musics.fcg');
    expect(String(url1)).toContain('sign=zz');
    const b1 = body1 as {
      comm: Record<string, unknown>;
      req_1: { param: Record<string, unknown> };
    };
    const b2 = body2 as { req_1: { param: Record<string, unknown> } };
    // 客户端形态：platform=wk_v17（缺省回落 11 卡通用形态）；uid/guid/g_tk 均可省略
    expect(b1.comm.platform).toBe('wk_v17');
    expect(b1.comm).not.toHaveProperty('uid');
    expect(b1.comm).not.toHaveProperty('g_tk');
    expect(b1.req_1.param).toEqual({ direction: 0, page: 1, v_cache: [], v_uniq: [], s_num: 0 });
    // 第二页：direction=1，s_num=已加载版块数（2），v_cache/v_uniq 仍为空
    expect(b2.req_1.param).toEqual({ direction: 1, page: 2, v_cache: [], v_uniq: [], s_num: 2 });
    // load_mark=-1 到底，v_shelf 合并两页共 3 个版块
    expect(result.body.response.data.v_shelf).toHaveLength(3);
    expect(result.body.response.data.personalized).toBe(true);
  });

  it('歌曲卡应经 CgiGetTrackInfo 批量补全 track_info（ids/types/source 与客户端一致）', async () => {
    mockedAxiosPost
      .mockResolvedValueOnce(
        resp(
          [shelf(207, [card({ id: '183887', title: '雨不停歇', jumptype: 10046, subtype: 0 })])],
          -1,
        ),
      )
      .mockResolvedValueOnce({
        data: {
          code: 0,
          req_1: {
            code: 0,
            data: {
              tracks: [
                {
                  mid: '000eUB4y2U2Qwk',
                  id: 183887,
                  name: '雨不停歇',
                  singer: [{ name: '萧贺硕' }],
                  album: { name: '硕一硕的流浪地图' },
                  pay: { pay_play: 0 },
                },
              ],
            },
          },
        },
      });

    const result = await call('uin=123; qm_keyst=KEY', '123');

    // 第二次请求为 CgiGetTrackInfo
    expect(mockedAxiosPost).toHaveBeenCalledTimes(2);
    const [infoUrl, infoBody] = mockedAxiosPost.mock.calls[1];
    expect(String(infoUrl)).toContain('musics.fcg');
    const req1 = (
      infoBody as { req_1: { module: string; method: string; param: Record<string, unknown> } }
    ).req_1;
    expect(req1.module).toBe('music.trackInfo.UniformRuleCtrl');
    expect(req1.method).toBe('CgiGetTrackInfo');
    expect(req1.param).toEqual({ ids: [183887], types: [200], source: 'AiNoFree' });

    const songShelf = result.body.response.data.v_shelf[0] as {
      v_niche?: Array<{ v_card?: Array<{ track?: { mid?: string } }> }>;
    };
    const songCard = songShelf.v_niche?.[0]?.v_card?.[0];
    expect(songCard?.track?.mid).toBe('000eUB4y2U2Qwk');
  });

  it('歌曲信息补全失败时版块仍返回（歌曲卡无 track）', async () => {
    mockedAxiosPost
      .mockResolvedValueOnce(
        resp(
          [shelf(207, [card({ id: '183887', title: '雨不停歇', jumptype: 10046, subtype: 0 })])],
          -1,
        ),
      )
      .mockRejectedValueOnce(new Error('ECONNRESET'));

    const result = await call('uin=123; qm_keyst=KEY', '123');

    expect(result.status).toBe(200);
    const songCard = (
      result.body.response.data.v_shelf[0] as {
        v_niche?: Array<{ v_card?: Array<{ track?: unknown }> }>;
      }
    ).v_niche?.[0]?.v_card?.[0];
    expect(songCard?.track).toBeUndefined();
  });

  it('无凭据时 personalized=false 且不带 Cookie 头', async () => {
    mockedAxiosPost.mockResolvedValue(resp([shelf(271, [card({})])], -1));

    const result = await call(undefined, undefined);

    expect(result.body.response.data.personalized).toBe(false);
    const cfg = mockedAxiosPost.mock.calls[0][2] as { headers: Record<string, string> };
    expect(cfg.headers.Cookie).toBeUndefined();
  });

  it('上游失败（req_1.code 非 0）时原样透出错误码与空 v_shelf', async () => {
    mockedAxiosPost.mockResolvedValue({ data: { code: 0, req_1: { code: 500020 } } });

    const result = await call('uin=123; qm_keyst=KEY', '123');

    expect(result).toEqual({
      status: 200,
      body: { response: { code: 500020, data: { v_shelf: [], personalized: true } } },
    });
  });

  it('网络异常时应返回 500 与 code=-1', async () => {
    mockedAxiosPost.mockRejectedValue(new Error('ECONNRESET'));

    const result = await call('uin=123; qm_keyst=KEY', '123');

    expect(result.status).toBe(500);
    expect(result.body.response.code).toBe(-1);
  });
});
