import request from 'supertest';

// 关键：mock 掉 services，避免测试真实调用官方通道代理改动用户收藏
jest.mock('../src/services', () => ({
  __esModule: true,
  default: {
    setPlaylistFav: jest.fn(),
  },
}));

import app from '../src/app';
import services from '../src/services';

const mockedSetPlaylistFav = (services as unknown as { setPlaylistFav: jest.Mock }).setPlaylistFav;

const server = app.callback();

describe('POST /setPlaylistFav', () => {
  beforeEach(() => {
    mockedSetPlaylistFav.mockReset();
    mockedSetPlaylistFav.mockResolvedValue({
      status: 200,
      body: { response: { code: 0, message: undefined } },
    });
  });

  it('正常流程: 携带 disstid 时调用服务并返回 code 0', async () => {
    const response = await request(server).post('/setPlaylistFav').send({
      disstid: '7011264340',
      isFan: false,
    });
    expect(response.status).toBe(200);
    expect(response.body.response.code).toBe(0);
    expect(mockedSetPlaylistFav).toHaveBeenCalledWith(
      expect.objectContaining({
        disstid: '7011264340',
        isFan: false,
      }),
    );
  });

  it('取消收藏: isFan=true 时传递删除语义', async () => {
    await request(server).post('/setPlaylistFav').send({
      disstid: '7011264340',
      isFan: true,
    });
    expect(mockedSetPlaylistFav).toHaveBeenCalledWith(expect.objectContaining({ isFan: true }));
  });

  it('边界条件: disstid 为空时返回 400', async () => {
    const response = await request(server).post('/setPlaylistFav').send({ disstid: '' });
    expect(response.status).toBe(400);
    expect(response.body.response.code).toBe(-1);
    expect(mockedSetPlaylistFav).not.toHaveBeenCalled();
  });

  it('异常输入: 缺少 body 时返回 400', async () => {
    const response = await request(server).post('/setPlaylistFav').send({});
    expect(response.status).toBe(400);
  });

  it('服务失败时透出错误信息', async () => {
    mockedSetPlaylistFav.mockResolvedValue({
      status: 500,
      body: {
        response: {
          code: -1,
          error: 'connect ECONNREFUSED（代理未启动）',
          message: 'connect ECONNREFUSED（代理未启动）',
        },
      },
    });
    const response = await request(server).post('/setPlaylistFav').send({ disstid: '7011264340' });
    expect(response.status).toBe(500);
    expect(response.body.response.code).toBe(-1);
    expect(response.body.response.message).toContain('代理未启动');
  });
});
