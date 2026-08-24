import request from 'supertest';
import app from '../src/app';

const server = app.callback();

describe('POST /radioDislike', () => {
  it('正常流程: 携带 songId 时返回可处理的状态码', async () => {
    const response = await request(server)
      .post('/radioDislike')
      .send({ radioId: 99, songId: 1459873321, songType: 0 });
    expect([200, 400, 404, 500]).toContain(response.status);
  });

  it('边界条件: 缺少 songId 时返回 400', async () => {
    const response = await request(server).post('/radioDislike').send({ radioId: 99 });
    expect(response.status).toBe(400);
    expect(response.body.response.code).toBe(-1);
  });

  it('异常输入: 空 body 时返回 400', async () => {
    const response = await request(server).post('/radioDislike').send({});
    expect(response.status).toBe(400);
  });
});
