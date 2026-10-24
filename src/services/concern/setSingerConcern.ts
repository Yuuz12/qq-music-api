import writeConcern, { ConcernWriteResponse } from './concernWrite';

/**
 * setSingerConcern - 关注 / 取关歌手
 *
 * 上游 `Concern.ConcernSystemServer / cgi_concern_user_v2`，param
 * `{ opertype: 0关注/1取关, source:0, userinfo:{ usertype:1, userid:<singerMid> }, encrypt_singerid:1 }`。
 * 公共 comm / g_tk / 错误码处理见 services/concern/concernWrite.ts。
 *
 * 需要登录 cookie（多用户：随请求头下发，见 util/requestCredential.ts）。
 */

interface SetSingerConcernParams {
  /** 歌手 mid（加密 id，如 0025NhlN2yWrP4） */
  singermid?: string;
  /** 当前是否已关注：true → 取关（opertype=1），false → 关注（opertype=0） */
  isFollow?: boolean;
}

/** 统一响应结构（与写通道共用，便于控制器/测试访问） */
export type SetSingerConcernResponse = ConcernWriteResponse;

export default async ({
  singermid = '',
  isFollow = false,
}: SetSingerConcernParams = {}): Promise<{
  status: number;
  body: { response: SetSingerConcernResponse };
}> => {
  const mid = String(singermid || '').trim();
  if (!mid) {
    return { status: 400, body: { response: { code: -1, message: 'singermid is required' } } };
  }
  return writeConcern({
    usertype: 1,
    userid: mid,
    isFollow,
    encryptSingerid: true,
    logTag: 'setSingerConcern',
  });
};
