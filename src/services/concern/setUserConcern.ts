import writeConcern, { ConcernWriteResponse } from './concernWrite';

/**
 * setUserConcern - 关注 / 取关普通用户（关注列表 / 粉丝列表里的行内按钮）
 *
 * 上游 `Concern.ConcernSystemServer / cgi_concern_user_v2`，param
 * `{ opertype: 0关注/1取关, source:0, userinfo:{ usertype:0, userid:<EncUin> } }`
 * —— 与歌手维度（usertype=1 + encrypt_singerid:1）唯一的差别：
 *    usertype 用 0，userid 传**加密 uin**（getRelationList 返回的 encuin），且**不带** encrypt_singerid。
 * 2026-10-21 可逆实验实测：关注列表里取关 → 4s 后 map_user_status 变 0 → 再关注 → 恢复 1，全部 code=0。
 *
 * 需要登录 cookie（多用户：随请求头下发，见 util/requestCredential.ts）。
 */

interface SetUserConcernParams {
  /** 目标用户加密 uin（EncUin，形如 oivioeol7i6P7c**；来自 getRelationList 的 encuin） */
  encuin?: string;
  /** 当前是否已关注：true → 取关（opertype=1），false → 关注（opertype=0） */
  isFollow?: boolean;
}

/** 统一响应结构（与写通道共用，便于控制器/测试访问） */
export type SetUserConcernResponse = ConcernWriteResponse;

export default async ({
  encuin = '',
  isFollow = false,
}: SetUserConcernParams = {}): Promise<{
  status: number;
  body: { response: SetUserConcernResponse };
}> => {
  const id = String(encuin || '').trim();
  if (!id) {
    return { status: 400, body: { response: { code: -1, message: 'encuin is required' } } };
  }
  return writeConcern({
    usertype: 0,
    userid: id,
    isFollow,
    encryptSingerid: false,
    logTag: 'setUserConcern',
  });
};
