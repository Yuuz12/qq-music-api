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

import getSearchByKey from '../src/services/search/getSearchByKey';
import { logger } from '../src/util/logger';

const mockedPost = mockPost as jest.Mock;
const mockedLogger = logger as jest.Mocked<typeof logger>;

/** 造一份 musicu DoSearchForQQMusicDesktop 成功响应 */
const musicuOk = (list: unknown[], zhida?: unknown) => ({
  data: {
    req_search: {
      code: 0,
      data: { body: { song: { list, sum: list.length }, ...(zhida ? { zhida } : {}) } },
    },
  },
});

/** musicu 详情格式歌曲项（供映射前后对比） */
const rawSong = {
  mid: '003GnQQp3cGIyh',
  id: 488250858,
  name: '夢幻',
  singer: [
    { id: 42450, mid: '003qCt5Z1hvcia', name: 'MY FIRST STORY' },
    { id: 5146, mid: '001Wimim3PSzC1', name: 'HYDE' },
  ],
  album: { id: 50253976, mid: '00375GhC0gJH6M', name: '夢幻', pmid: '00375GhC0gJH6M_2' },
  interval: 241,
  language: 3,
  genre: 0,
  pay: { pay_play: 1, pay_down: 1, pay_month: 1 },
  file: {
    media_mid: '003GnQQp3cGIyh',
    size_128mp3: 3859657,
    size_320mp3: 9648809,
    size_flac: 0,
  },
};

/** 映射后应得到的老 client_search_cp 扁平搜索项 */
const flatSong = {
  songmid: '003GnQQp3cGIyh',
  songid: 488250858,
  songname: '夢幻',
  singer: [
    { mid: '003qCt5Z1hvcia', name: 'MY FIRST STORY' },
    { mid: '001Wimim3PSzC1', name: 'HYDE' },
  ],
  albummid: '00375GhC0gJH6M',
  albumname: '夢幻',
  interval: 241,
  language: 3,
  genre: 0,
  pay: { payplay: 1, payalbum: 0 },
  strMediaMid: '003GnQQp3cGIyh',
  file: {
    media_mid: '003GnQQp3cGIyh',
    size_128mp3: 3859657,
    size_320mp3: 9648809,
    size_flac: 0,
  },
};

describe('services/getSearchByKey（musicu 迁移）', () => {
  beforeEach(() => {
    mockedPost.mockReset();
    jest.clearAllMocks();
  });

  it('歌曲搜索：POST musicu DoSearchForQQMusicDesktop 并映射回老的 data.song.list 信封', async () => {
    mockedPost.mockResolvedValue(musicuOk([rawSong]));

    const result = await getSearchByKey({ params: { w: '梦幻', n: 20, p: 1, t: 0 } });

    const [url, payload, config] = mockedPost.mock.calls[0];
    expect(url).toBe('https://u.y.qq.com/cgi-bin/musicu.fcg');
    expect(config.headers.Referer).toBe('https://y.qq.com/');
    expect(payload.req_search).toEqual({
      module: 'music.search.SearchCgiService',
      method: 'DoSearchForQQMusicDesktop',
      param: { search_type: 0, query: '梦幻', page_num: 1, num_per_page: 20, highlight: 1 },
    });

    expect(result.status).toBe(200);
    expect(result.body.response.code).toBe(0);
    expect(result.body.response.data.song.list).toEqual([flatSong]);
    expect(result.body.response.data.song.totalnum).toBe(1);
    expect(result.body.response.data.song.cur_page).toBe(1);
    // 只有 zhida_singer 存在时才写 data.zhida；此例无 zhida → 不应有该字段
    expect(result.body.response.data.zhida).toBeUndefined();
  });

  it('歌词搜索：走 data.lyric.list 且 content 由 lyric_hilight 拆行得到', async () => {
    const lyricItem = {
      ...rawSong,
      lyric: '月亮代表我的心\n轻轻的一个吻\n已经打动我的心',
      lyric_hilight: '<em>月亮代表我的心</em>\n轻轻的一个吻\n已经打动我的心',
    };
    mockedPost.mockResolvedValue(musicuOk([lyricItem]));

    const result = await getSearchByKey({ params: { w: '月亮', n: 20, p: 1, t: 7 } });

    expect(mockedPost.mock.calls[0][1].req_search.param.search_type).toBe(7);
    expect(result.status).toBe(200);
    const list = result.body.response.data.lyric.list;
    expect(Array.isArray(list)).toBe(true);
    expect(list[0].songmid).toBe(rawSong.mid);
    expect(list[0].content).toEqual(['<em>月亮代表我的心</em>', '轻轻的一个吻', '已经打动我的心']);
    // 歌词分支不再写 data.song
    expect(result.body.response.data.song).toBeUndefined();
  });

  it('num_per_page 超上限 50 时钳制到 50（musicu 上游硬约束）', async () => {
    mockedPost.mockResolvedValue(musicuOk([]));
    await getSearchByKey({ params: { w: 'x', n: 200, p: 1 } });
    expect(mockedPost.mock.calls[0][1].req_search.param.num_per_page).toBe(50);
  });

  it('映射歌手直达：body.zhida.list 存在时给出 data.zhida.zhida_singer（singerMid 依赖）', async () => {
    const zhida = {
      list: [
        {
          title: '歌手: 周杰伦',
          from: 'singer',
          custom_info: { from: 'singer', mid: '0025NhlN2yWrP4', parent_ids: '4558' },
        },
      ],
    };
    mockedPost.mockResolvedValue(musicuOk([rawSong], zhida));

    const result = await getSearchByKey({ params: { w: '周杰伦', n: 1, p: 1 } });

    expect(result.body.response.data.zhida).toEqual({
      zhida_singer: { singerMID: '0025NhlN2yWrP4', singerID: 4558, singerName: '周杰伦' },
    });
  });

  it('code=2001 风控时最多重试 3 次，最终返回空的合法信封（不是 500）', async () => {
    mockedPost.mockResolvedValue({ data: { req_search: { code: 2001 } } });

    const result = await getSearchByKey({ params: { w: 'x', n: 20, p: 1 } });

    expect(mockedPost).toHaveBeenCalledTimes(3);
    expect(result.status).toBe(200);
    expect(result.body.response.data.song.list).toEqual([]);
    expect(mockedLogger.error).toHaveBeenCalledWith(
      'service.failed',
      expect.objectContaining({ service: 'getSearchByKey' }),
    );
  });

  it('axios 抛错时返回 500 且不做重试', async () => {
    mockedPost.mockRejectedValue(new Error('network failed'));

    const result = await getSearchByKey({ params: { w: 'x' } });

    expect(mockedPost).toHaveBeenCalledTimes(1);
    expect(result.status).toBe(500);
    expect(result.body.error).toBeInstanceOf(Error);
    expect(mockedLogger.error).toHaveBeenCalledWith(
      'service.failed',
      expect.objectContaining({
        service: 'getSearchByKey',
        error: { name: 'Error', message: 'network failed' },
      }),
    );
  });

  it('缺省参数：limit 默认 20、page 默认 1、search_type 默认 0', async () => {
    mockedPost.mockResolvedValue(musicuOk([]));
    await getSearchByKey({ params: { w: 'default' } });
    const p = mockedPost.mock.calls[0][1].req_search.param;
    expect(p).toEqual({
      search_type: 0,
      query: 'default',
      page_num: 1,
      num_per_page: 20,
      highlight: 1,
    });
  });
});
