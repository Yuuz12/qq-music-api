import request from 'supertest';

// 关键：mock 掉 services，避免测试真实请求上游
jest.mock('../src/services', () => ({
  __esModule: true,
  default: {
    getIsPlaylistFan: jest.fn(),
  },
}));

import app from '../src/app';
import services from '../src/services';

const mockedGetIsPlaylistFan = (services as unknown as { getIsPlaylistFan: jest.Mock })
  .getIsPlaylistFan;

const server = app.callback();

describe('POST /getIsPlaylistFan', () => {
  beforeEach(() => {
    mockedGetIsPlaylistFan.mockReset();
    mockedGetIsPlaylistFan.mockResolvedValue({
      status: 200,
      body: {
        response: {
          code: 0,
          req_0: { code: 0, data: { m_fan: { '7011264340': 1 } } },
        },
      },
    });
  });

  it('正常流程: 携带 disstids 时调用服务并把 req_0 提升到 response.data', async () => {
    const response = await request(server)
      .post('/getIsPlaylistFan')
      .send({ disstids: ['7011264340'] });
    expect(response.status).toBe(200);
    expect(response.body.response.code).toBe(0);
    expect(response.body.response.data).toEqual({ m_fan: { '7011264340': 1 } });
    expect(mockedGetIsPlaylistFan).toHaveBeenCalledWith({
      disstids: ['7011264340'],
    });
  });

  it('边界条件: disstids 为空数组时返回 400', async () => {
    const response = await request(server).post('/getIsPlaylistFan').send({ disstids: [] });
    expect(response.status).toBe(400);
    expect(response.body.response.code).toBe(-1);
    expect(mockedGetIsPlaylistFan).not.toHaveBeenCalled();
  });

  it('异常输入: 缺少 body 时返回 400', async () => {
    const response = await request(server).post('/getIsPlaylistFan').send({});
    expect(response.status).toBe(400);
  });

  it('服务层失败时透出 message', async () => {
    mockedGetIsPlaylistFan.mockResolvedValue({
      status: 500,
      body: { response: { code: -1, message: 'network down' } },
    });
    const response = await request(server)
      .post('/getIsPlaylistFan')
      .send({ disstids: ['7011264340'] });
    expect(response.status).toBe(500);
    expect(response.body.response.code).toBe(-1);
    expect(response.body.response.message).toBe('network down');
  });
});
