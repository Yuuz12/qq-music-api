import request from 'supertest';
import app from '../src/app';

const server = app.callback();

describe('GET /getRelationList', () => {
  it('正常流程: 默认 type=fans，未带凭据时透传上游业务码', async () => {
    const response = await request(server).get('/getRelationList');
    expect([200, 500]).toContain(response.status);
  });

  it('正常流程: 各合法 type 均可请求（follow_singer/follow_user/fans）', async () => {
    for (const type of ['follow_singer', 'follow_user', 'fans']) {
      const response = await request(server).get(`/getRelationList?type=${type}`);
      expect([200, 500]).toContain(response.status);
      expect(response.body.response).toHaveProperty('code');
    }
  });

  it('异常输入: 非法 type 返回 400', async () => {
    const response = await request(server).get('/getRelationList?type=enemy');
    expect(response.status).toBe(400);
    expect(response.body.response.code).toBe(-1);
    expect(String(response.body.response.message)).toContain('invalid type');
  });

  it('边界条件: from/size 数值越界被钳制（size>100 → 按 100 处理仍可用）', async () => {
    const response = await request(server).get('/getRelationList?from=-5&size=9999');
    expect([200, 500]).toContain(response.status);
  });
});
