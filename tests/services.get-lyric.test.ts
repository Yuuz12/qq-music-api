const mockAxiosPost = jest.fn();
const mockQrcDecryptHex = jest.fn();
const mockQrcXmlToLrc = jest.fn();
const mockQrcXmlToWordData = jest.fn();
const mockLyricParse = jest.fn();

jest.mock('axios', () => ({
  __esModule: true,
  default: {
    post: mockAxiosPost,
  },
}));

jest.mock('../src/util/qrc', () => ({
  __esModule: true,
  qrcDecryptHex: (...args: unknown[]) => mockQrcDecryptHex(...args),
  qrcXmlToLrc: (...args: unknown[]) => mockQrcXmlToLrc(...args),
  qrcXmlToWordData: (...args: unknown[]) => mockQrcXmlToWordData(...args),
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

jest.mock('../src/util/lyricParse', () => ({
  __esModule: true,
  default: {
    lyricParse: mockLyricParse,
  },
}));

import getLyric from '../src/services/music/getLyric';
import { logger } from '../src/util/logger';

const mockedLogger = logger as jest.Mocked<typeof logger>;

/**
 * 2026-08 更新：getLyric 服务已改为 musicu.fcg GetPlayLyricInfo（crypt:1，QRC 加密），
 * 经 util/qrc 解密；本用例同步为当前实现（旧版 y_common/fcg_query_lyric_new.fcg 已废弃）。
 */
describe('services/getLyric', () => {
  beforeEach(() => {
    mockAxiosPost.mockReset();
    mockQrcDecryptHex.mockReset();
    mockQrcXmlToLrc.mockReset();
    mockQrcXmlToWordData.mockReset();
    mockLyricParse.mockReset();
    jest.clearAllMocks();
  });

  it('应在未格式化时返回解密后的歌词字符串', async () => {
    // QRC 链路：上游 hex → qrcDecryptHex → QRC XML → qrcXmlToLrc → 行级 LRC
    mockQrcDecryptHex.mockImplementation((hex: string) => `<xml>${hex}</xml>`);
    mockQrcXmlToLrc.mockImplementation(
      (xml: string) => `[00:01.00]${xml.replace(/<\/?xml>/g, '')}`,
    );
    mockAxiosPost.mockResolvedValue({
      data: {
        req_1: {
          code: 0,
          data: { lyric: 'HEX_LYRIC', trans: 'HEX_TRANS', roma: '' },
        },
      },
    });

    const result = await getLyric({ params: { songmid: '001' } });

    expect(mockAxiosPost).toHaveBeenCalledWith(
      'https://u.y.qq.com/cgi-bin/musicu.fcg',
      expect.objectContaining({
        req_1: expect.objectContaining({
          module: 'music.musichallSong.PlayLyricInfo',
          method: 'GetPlayLyricInfo',
          param: expect.objectContaining({ songMid: '001', crypt: 1 }),
        }),
      }),
      expect.objectContaining({
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
      }),
    );
    expect(mockLyricParse).not.toHaveBeenCalled();
    expect(result.status).toBe(200);
    const body = (result as { body: { response: Record<string, unknown> } }).body.response;
    expect(body.lyric).toBe('[00:01.00]HEX_LYRIC');
    expect(mockedLogger.info).toHaveBeenCalledWith(
      'service.requesting',
      expect.objectContaining({
        service: 'getLyric',
        formatLyric: false,
      }),
    );
    expect(mockedLogger.info).toHaveBeenCalledWith(
      'service.succeeded',
      expect.objectContaining({
        service: 'getLyric',
      }),
    );
  });

  it('应在 isFormat=true 时调用 lyricParse 格式化歌词', async () => {
    const parsedLyric = {
      lines: [{ time: 1000, txt: 'world' }],
    };
    mockQrcDecryptHex.mockReturnValue('<xml>HEX</xml>');
    mockQrcXmlToWordData.mockReturnValue({ lrc: '[00:01.00]world', words: { 0: [] } });
    mockQrcXmlToLrc.mockReturnValue('[00:01.00]world');
    mockLyricParse.mockReturnValue(parsedLyric);
    mockAxiosPost.mockResolvedValue({
      data: {
        req_1: {
          code: 0,
          data: { lyric: 'HEX', trans: '', roma: '' },
        },
      },
    });

    const result = await getLyric({
      isFormat: true,
      params: { songmid: '002' },
    });

    expect(mockQrcXmlToWordData).toHaveBeenCalledWith('<xml>HEX</xml>');
    expect(mockLyricParse).toHaveBeenCalledWith('[00:01.00]world');
    expect(result.status).toBe(200);
    const body = (result as { body: { response: Record<string, unknown> } }).body.response;
    expect(body.lyric).toEqual(parsedLyric);
    expect(mockedLogger.debug).toHaveBeenCalledWith(
      'service.branch_selected',
      expect.objectContaining({
        service: 'getLyric',
        branch: 'format',
      }),
    );
  });

  it('应在歌词为空时以空字符串执行格式化', async () => {
    mockQrcXmlToLrc.mockReturnValue('');
    mockLyricParse.mockReturnValue({ lines: [] });
    mockAxiosPost.mockResolvedValue({
      data: {
        req_1: {
          code: 0,
          data: { lyric: '', trans: '', roma: '' },
        },
      },
    });

    await getLyric({ isFormat: true, params: { songmid: '003' } });

    expect(mockLyricParse).toHaveBeenCalledWith('');
  });

  it('应在底层请求失败时返回 500', async () => {
    const error = new Error('lyric failed');
    mockAxiosPost.mockRejectedValue(error);

    const result = await getLyric({ params: { songmid: '004' } });

    expect(result).toEqual({
      status: 500,
      body: {
        error,
      },
    });
    expect(mockedLogger.error).toHaveBeenCalledWith(
      'service.failed',
      expect.objectContaining({
        service: 'getLyric',
      }),
    );
  });
});
