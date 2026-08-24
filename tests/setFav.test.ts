import request from 'supertest';

// 关键：mock 掉 services，避免测试真实调用官方通道代理改动用户列表
jest.mock('../src/services', () => ({
  __esModule: true,
  default: {
    setFav: jest.fn(),
  },
}));

import app from '../src/app';
import services from '../src/services';

const mockedSetFav = (services as unknown as { setFav: jest.Mock }).setFav;

const server = app.callback();

describe('POST /setFav', () => {
  beforeEach(() => {
    mockedSetFav.mockReset();
    mockedSetFav.mockResolvedValue({
      status: 200,
      body: { response: { code: 0, message: undefined } },
    });
  });

  it('正常流程: 携带 songs 时调用服务并返回 code 0', async () => {
    const response = await request(server)
      .post('/setFav')
      .send({
        dirId: 201,
        songs: [{ songId: 1459873321, songType: 0 }],
        isFan: false,
      });
    expect(response.status).toBe(200);
    expect(response.body.response.code).toBe(0);
    expect(mockedSetFav).toHaveBeenCalledWith(
      expect.objectContaining({
        dirId: 201,
        isFan: false,
        songs: [{ songId: 1459873321, songType: 0 }],
      }),
    );
  });

  it('取消喜欢: isFan=true 时传递删除语义', async () => {
    await request(server)
      .post('/setFav')
      .send({
        dirId: 201,
        songs: [{ songId: 1459873321, songType: 0 }],
        isFan: true,
      });
    expect(mockedSetFav).toHaveBeenCalledWith(expect.objectContaining({ isFan: true }));
  });

  it('边界条件: songs 为空数组时返回 400', async () => {
    const response = await request(server).post('/setFav').send({ dirId: 201, songs: [] });
    expect(response.status).toBe(400);
    expect(response.body.response.code).toBe(-1);
  });

  it('异常输入: 缺少 body 时返回 400', async () => {
    const response = await request(server).post('/setFav').send({});
    expect(response.status).toBe(400);
  });

  it('服务失败时透出错误信息', async () => {
    mockedSetFav.mockResolvedValue({
      status: 200,
      body: {
        response: {
          code: -1,
          error: 'connect ECONNREFUSED（代理未启动）',
          message: 'connect ECONNREFUSED（代理未启动）',
        },
      },
    });
    const response = await request(server)
      .post('/setFav')
      .send({ songs: [{ songId: 1 }] });
    expect(response.status).toBe(200);
    expect(response.body.response.code).toBe(-1);
    expect(response.body.response.message).toContain('代理未启动');
  });
});
