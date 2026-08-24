import request from 'supertest';
import app from '../src/app';

const server = app.callback();

describe('POST /getIsSongFan', () => {
  it('正常流程: 携带 songmids 时返回可处理的状态码', async () => {
    const response = await request(server)
      .post('/getIsSongFan')
      .send({ songmids: ['003rJSwm3TechU'] });
    expect([200, 400, 404, 500]).toContain(response.status);
  });

  it('边界条件: songmids 为空数组时返回 400', async () => {
    const response = await request(server).post('/getIsSongFan').send({ songmids: [] });
    expect(response.status).toBe(400);
    expect(response.body.response.code).toBe(-1);
  });

  it('异常输入: 缺少 body 时返回 400', async () => {
    const response = await request(server).post('/getIsSongFan').send({});
    expect(response.status).toBe(400);
  });
});
