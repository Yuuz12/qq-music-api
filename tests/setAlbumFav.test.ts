import request from 'supertest';

// 关键：mock 掉 services，避免测试真实调用官方通道代理改动用户收藏
jest.mock('../src/services', () => ({
  __esModule: true,
  default: {
    setAlbumFav: jest.fn(),
  },
}));

import app from '../src/app';
import services from '../src/services';

const mockedSetAlbumFav = (services as unknown as { setAlbumFav: jest.Mock }).setAlbumFav;

const server = app.callback();

describe('POST /setAlbumFav', () => {
  beforeEach(() => {
    mockedSetAlbumFav.mockReset();
    mockedSetAlbumFav.mockResolvedValue({
      status: 200,
      body: { response: { code: 0, message: undefined } },
    });
  });

  it('正常流程: 携带 albumMid 时调用服务并返回 code 0', async () => {
    const response = await request(server).post('/setAlbumFav').send({
      albumMid: '0016l2F430zMux',
      isFan: false,
    });
    expect(response.status).toBe(200);
    expect(response.body.response.code).toBe(0);
    expect(mockedSetAlbumFav).toHaveBeenCalledWith(
      expect.objectContaining({
        albumMid: '0016l2F430zMux',
        isFan: false,
      }),
    );
  });

  it('取消收藏: isFan=true 时传递删除语义', async () => {
    await request(server).post('/setAlbumFav').send({
      albumMid: '0016l2F430zMux',
      isFan: true,
    });
    expect(mockedSetAlbumFav).toHaveBeenCalledWith(expect.objectContaining({ isFan: true }));
  });

  it('边界条件: albumMid 为空时返回 400', async () => {
    const response = await request(server).post('/setAlbumFav').send({ albumMid: '' });
    expect(response.status).toBe(400);
    expect(response.body.response.code).toBe(-1);
    expect(mockedSetAlbumFav).not.toHaveBeenCalled();
  });

  it('异常输入: 缺少 body 时返回 400', async () => {
    const response = await request(server).post('/setAlbumFav').send({});
    expect(response.status).toBe(400);
  });

  it('服务失败时透出错误信息', async () => {
    mockedSetAlbumFav.mockResolvedValue({
      status: 500,
      body: {
        response: {
          code: -1,
          error: 'connect ECONNREFUSED（代理未启动）',
          message: 'connect ECONNREFUSED（代理未启动）',
        },
      },
    });
    const response = await request(server)
      .post('/setAlbumFav')
      .send({ albumMid: '0016l2F430zMux' });
    expect(response.status).toBe(500);
    expect(response.body.response.code).toBe(-1);
    expect(response.body.response.message).toContain('代理未启动');
  });
});
