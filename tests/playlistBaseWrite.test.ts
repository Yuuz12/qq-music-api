import request from 'supertest';

// 关键：mock 掉 services，避免测试真实调用上游改动用户歌单
jest.mock('../src/services', () => ({
  __esModule: true,
  default: {
    addPlaylist: jest.fn(),
    delPlaylist: jest.fn(),
  },
}));

import app from '../src/app';
import services from '../src/services';

const mocked = services as unknown as {
  addPlaylist: jest.Mock;
  delPlaylist: jest.Mock;
};

const server = app.callback();

describe('POST /addPlaylist', () => {
  beforeEach(() => {
    mocked.addPlaylist.mockReset();
    mocked.addPlaylist.mockResolvedValue({
      status: 200,
      body: {
        response: {
          code: 0,
          req_1: { code: 0, data: { result: { tid: 9771934528, dirId: 9, dirName: '新歌单' } } },
        },
      },
    });
  });

  it('正常流程: 携带 dirName 时调用服务并把 data.result 提升到 response.data', async () => {
    const response = await request(server).post('/addPlaylist').send({ dirName: '新歌单' });

    expect(response.status).toBe(200);
    expect(response.body.response.code).toBe(0);
    expect(response.body.response.data).toEqual({
      tid: 9771934528,
      dirId: 9,
      dirName: '新歌单',
    });
    expect(mocked.addPlaylist).toHaveBeenCalledWith({ dirName: '新歌单' });
  });

  it('边界条件: dirName 为空时返回 400，不调用服务', async () => {
    const response = await request(server).post('/addPlaylist').send({ dirName: '   ' });

    expect(response.status).toBe(400);
    expect(response.body.response.code).toBe(-1);
    expect(mocked.addPlaylist).not.toHaveBeenCalled();
  });

  it('上游失败（如 80105 会话失效）透出真实错误码', async () => {
    mocked.addPlaylist.mockResolvedValue({
      status: 200,
      body: { response: { code: 0, req_1: { code: 80105 } } },
    });

    const response = await request(server).post('/addPlaylist').send({ dirName: '新歌单' });

    expect(response.status).toBe(200);
    expect(response.body.response.code).toBe(80105);
  });
});

describe('POST /delPlaylist', () => {
  beforeEach(() => {
    mocked.delPlaylist.mockReset();
    mocked.delPlaylist.mockResolvedValue({
      status: 200,
      body: {
        response: { code: 0, req_1: { code: 0, data: { result: { tid: 9771934528, dirId: 9 } } } },
      },
    });
  });

  it('正常流程: 携带 dirId 时调用服务并返回结果', async () => {
    const response = await request(server).post('/delPlaylist').send({ dirId: 9 });

    expect(response.status).toBe(200);
    expect(response.body.response.code).toBe(0);
    expect(response.body.response.data).toEqual({ tid: 9771934528, dirId: 9 });
    expect(mocked.delPlaylist).toHaveBeenCalledWith({ dirId: 9 });
  });

  it('边界条件: dirId 缺失或非正数时返回 400', async () => {
    const missing = await request(server).post('/delPlaylist').send({});
    const zero = await request(server).post('/delPlaylist').send({ dirId: 0 });
    const nan = await request(server).post('/delPlaylist').send({ dirId: 'abc' });

    expect(missing.status).toBe(400);
    expect(zero.status).toBe(400);
    expect(nan.status).toBe(400);
    expect(mocked.delPlaylist).not.toHaveBeenCalled();
  });

  it('字符串 dirId 会被转成数字再下发', async () => {
    await request(server).post('/delPlaylist').send({ dirId: '9' });

    expect(mocked.delPlaylist).toHaveBeenCalledWith({ dirId: 9 });
  });
});
