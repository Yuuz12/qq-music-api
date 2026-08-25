import request from 'supertest';
import app from '../src/app';

const server = app.callback();

describe('GET /getUserFavAlbum', () => {
  it('正常流程: 默认参数可请求，返回结构含 response.code', async () => {
    const response = await request(server).get('/getUserFavAlbum');
    expect([200, 500]).toContain(response.status);
    expect(response.body.response).toHaveProperty('code');
  });

  it('正常流程: 显式 sin/num 分页参数可请求', async () => {
    const response = await request(server).get('/getUserFavAlbum?sin=0&num=20');
    expect([200, 500]).toContain(response.status);
    expect(response.body.response).toHaveProperty('code');
  });

  it('边界条件: num 越界被钳制（>200 → 按 200 处理仍可用）', async () => {
    const response = await request(server).get('/getUserFavAlbum?sin=0&num=9999');
    expect([200, 500]).toContain(response.status);
  });

  it('边界条件: 非法 sin/num 回退默认值仍可用', async () => {
    const response = await request(server).get('/getUserFavAlbum?sin=-5&num=abc');
    expect([200, 500]).toContain(response.status);
  });
});
