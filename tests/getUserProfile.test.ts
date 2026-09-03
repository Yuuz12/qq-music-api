import request from 'supertest';

// 关键：mock 掉 services，避免测试真实请求上游（他人主页通道的分支只能造数据验证）
jest.mock('../src/services', () => ({
  __esModule: true,
  default: {
    getUserProfile: jest.fn(),
    getUserCreatedDiss: jest.fn(),
  },
}));

import app from '../src/app';
import services from '../src/services';

const mockedProfile = (services as unknown as { getUserProfile: jest.Mock }).getUserProfile;
const mockedCreatedDiss = (services as unknown as { getUserCreatedDiss: jest.Mock })
  .getUserCreatedDiss;

const server = app.callback();

/** 主页聚合接口（fcg_get_profile_homepage）成功响应 */
const homepage = (data: unknown) => ({ status: 200, body: { response: { code: 0, data } } });

/** 创建歌单兜底接口（fcg_user_created_diss）成功响应 */
const createdDiss = (lst: unknown[]) => ({
  status: 200,
  body: { response: { code: 0, data: { lst } } },
});

describe('GET /getUserProfile', () => {
  beforeEach(() => {
    mockedProfile.mockReset();
    mockedCreatedDiss.mockReset();
  });

  it('正常流程: 不带 uin 查自己，整理为前端友好结构', async () => {
    mockedProfile.mockResolvedValue(
      homepage({
        creator: {
          nick: '我自己',
          headpic: 'https://pic/me.png',
          encrypt_uin: 'ENC_SELF',
          nums: { fansnum: 3, follownum: 5 },
        },
        mymusic: [
          {
            type: 1,
            id: 201,
            title: '我喜欢',
            picurl: 'https://pic/like.png',
            num0: 99,
            num1: 8,
            num2: 7,
          },
        ],
        mydiss: {
          list: [{ dissid: 7011264340, dirid: 4, title: '自建', picurl: 'p', subtitle: '10 首' }],
        },
      }),
    );
    const response = await request(server).get('/getUserProfile');
    expect(response.status).toBe(200);
    expect(mockedProfile).toHaveBeenCalledWith({ uin: '' });
    const d = response.body.response.data;
    expect(d.nick).toBe('我自己');
    expect(d.encryptUin).toBe('ENC_SELF');
    expect(d.fansnum).toBe(3);
    expect(d.follownum).toBe(5);
    expect(d.like).toEqual({
      id: '201',
      title: '我喜欢',
      picurl: 'https://pic/like.png',
      songnum: 99,
      albumnum: 8,
      dirnum: 7,
    });
    expect(d.disslist).toEqual([
      { dissid: '7011264340', dirId: 4, title: '自建', picurl: 'p', subtitle: '10 首' },
    ]);
    expect(d.source).toBe('homepage');
  });

  it('正常流程: 带 uin 查他人，上游返回同一用户时直接采用', async () => {
    mockedProfile.mockResolvedValue(
      homepage({
        creator: { nick: '路人甲', encrypt_uin: 'ENC_OTHER', nums: { fansnum: 20, follownum: 10 } },
        mydiss: { list: [] },
      }),
    );
    const response = await request(server).get('/getUserProfile?uin=ENC_OTHER');
    expect(response.status).toBe(200);
    expect(mockedProfile).toHaveBeenCalledWith({ uin: 'ENC_OTHER' });
    expect(response.body.response.data.nick).toBe('路人甲');
    expect(mockedCreatedDiss).not.toHaveBeenCalled();
  });

  it('防串号: 上游回落到登录用户自己的资料时改用创建歌单兜底通道', async () => {
    mockedProfile.mockResolvedValue(
      homepage({ creator: { nick: '我自己', encrypt_uin: 'ENC_SELF' }, mydiss: { list: [] } }),
    );
    mockedCreatedDiss.mockResolvedValue(
      createdDiss([
        {
          dissid: 111,
          title: 'TA 的歌单',
          picurl: 'https://pic/1.png',
          song_count: 12,
          nick: '路人乙',
          avatar: 'https://pic/乙.png',
          encrypt_uin: 'ENC_OTHER',
        },
      ]),
    );
    const response = await request(server).get('/getUserProfile?uin=ENC_OTHER');
    expect(response.status).toBe(200);
    expect(mockedCreatedDiss).toHaveBeenCalledWith({ uin: 'ENC_OTHER' });
    const d = response.body.response.data;
    expect(d.nick).toBe('路人乙');
    expect(d.source).toBe('created_diss');
    expect(d.disslist).toEqual([
      {
        dissid: '111',
        dirId: undefined,
        title: 'TA 的歌单',
        picurl: 'https://pic/1.png',
        subtitle: '12 首',
      },
    ]);
  });

  it('防串号: 兜底通道返回的创建者与请求 uin 不符时不予采用', async () => {
    mockedProfile.mockResolvedValue(
      homepage({ creator: { nick: '我自己', encrypt_uin: 'ENC_SELF' }, mydiss: { list: [] } }),
    );
    mockedCreatedDiss.mockResolvedValue(
      createdDiss([{ dissid: 1, title: 'T', nick: '不相干的人', encrypt_uin: 'ENC_THIRD' }]),
    );
    const response = await request(server).get('/getUserProfile?uin=ENC_OTHER');
    expect(response.body.response.data.nick).toBe('');
    expect(response.body.response.data.disslist).toEqual([]);
  });

  it('异常输入: 上游业务码非 0 且无兜底数据时透出原 code', async () => {
    mockedProfile.mockResolvedValue({ status: 200, body: { response: { code: 1000, data: {} } } });
    mockedCreatedDiss.mockResolvedValue({ status: 200, body: { response: { code: 1000 } } });
    const response = await request(server).get('/getUserProfile?uin=ENC_OTHER');
    expect(response.status).toBe(200);
    expect(response.body.response.code).toBe(1000);
    expect(response.body.response.data.encryptUin).toBe('ENC_OTHER');
  });

  it('边界条件: uin 两侧空白被裁剪，空串按查自己处理', async () => {
    mockedProfile.mockResolvedValue(
      homepage({ creator: { nick: '我自己' }, mydiss: { list: [] } }),
    );
    await request(server).get('/getUserProfile?uin=%20%20');
    expect(mockedProfile).toHaveBeenCalledWith({ uin: '' });
  });
});
