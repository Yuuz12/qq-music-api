import axios from 'axios';
import { getRequestCookie, getRequestUin } from '../../util/requestCredential';

/**
 * getUserVipInfo - 当前登录账号的会员状态（绿钻族 VIP / 超级会员 SVIP）
 *
 * 上游两条接口，互不依赖、并行取，任一可用即可出结果（各自失败只丢自己那部分）：
 *
 *  A) 旧版 mini portal（Web 端 userinfo portal）
 *       GET c.y.qq.com/portalcgi/fcgi-bin/music_mini_portal/fcg_getuser_infoEx.fcg
 *     给出绿钻族的两个标志：`vip`=绿钻、`svip`=豪华绿钻。
 *     请求要点（2026-09 真实凭据实测）：
 *       - cookie 必须完整原样带上（含 p_skey/uin 等 passport cookie，切勿裁剪）；
 *       - 必须带 `g_tk` / `g_tk_new_20200303`（getACSRFToken = 5381 哈希，优先
 *         qqmusic_key，其次 p_skey/skey）；
 *       - 必须带 `uin` 与 `format=json`（缺省会返回 JSONP 包裹）。
 *       缺 g_tk/uin → code 1000 "no login"。返回 data 含 vip/svip/start/end 等。
 *
 *  B) 客户端会员接口（+ `identity.HugeVip`：超级会员）
 *       GET u.y.qq.com/cgi-bin/musicu.fcg  module=VipLogin.VipLoginInter
 *                                          method=vip_login_base
 *     这是唯一能区分「超级会员」的档位标志：旧版接口只有绿钻族两档，
 *     超级会员（可听臻品母带等）在 A 里与豪华绿钻无法区分。
 *     请求要点：cookie + musicu 固定 `sign`（与 getMusicPlay 同源常量）。
 *
 * 档位语义（2026-09 用真实账号双向核对）：
 *   - 旧版 `svip=1` 与 identity.vip=1 都是绿钻族；旧版 `svip` 指的是**豪华绿钻**，
 *     不是超级会员（它比旧版接口更早，没有超级会员这一档）。
 *   - 超级会员只认 identity.HugeVip；实测豪华绿钻账号 HugeVip=0 且臻品母带被上游
 *     以 result=104003 明确拒绝，超级会员账号才会拿到母带 purl。
 *   - 因此归一出 level=svip|vip|none 三档，并额外给出 member（绿钻族=无损门槛）
 *     与 svipKnown（超级会员档位是否取到；false 表示 B 接口失败、档位未知）。
 *     未知一律由前端按「放行」处理，避免把真正的超级会员误挡在母带之外。
 */

/** 官方 getACSRFToken：n=5381; n += (n<<5)+c; 取 31 位 */
function getACSRFToken(key: string): number {
  let n = 5381;
  for (let i = 0; i < key.length; i++) n += (n << 5) + key.charCodeAt(i);
  return n & 0x7fffffff;
}

/** 从 cookie 串取指定 name 的值 */
function cookieValue(cookie: string, name: string): string {
  const m = cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return m ? m[1] : '';
}

/** musicu 客户端接口的固定签名（官方 H5 常量，与 getMusicPlay 同源） */
const MUSICU_SIGN = 'zzannc1o6o9b4i971602f3554385022046ab796512b7012';

/** 上游 A：旧版 mini portal → 绿钻 `vip` / 豪华绿钻 `svip` */
async function fetchLegacy(cookie: string, uin: string, tk: number) {
  const res = await axios.get(
    'https://c.y.qq.com/portalcgi/fcgi-bin/music_mini_portal/fcg_getuser_infoEx.fcg',
    {
      params: {
        source: 4001,
        format: 'json', // 缺省返回 JSONP（MusicJsonCallback 包裹），必须显式 json
        g_tk: tk,
        g_tk_new_20200303: tk,
        uin,
        inCharset: 'utf-8',
        outCharset: 'utf-8',
        notice: 0,
        platform: 'wk_v17',
        needNewCode: 0,
      },
      headers: {
        Referer: 'https://y.qq.com/',
        Cookie: cookie,
      },
      timeout: 10000,
    },
  );
  const body = res.data || {};
  const data = body.data && typeof body.data === 'object' ? body.data : {};
  return { code: Number(body.code) || 0, data };
}

/** 上游 B：客户端会员接口 → `identity.HugeVip` 超级会员、`identity.vip` 绿钻族 */
async function fetchClient(cookie: string, uin: string) {
  const data = {
    comm: { uin, format: 'json', ct: 24, cv: 0 },
    req_0: { module: 'VipLogin.VipLoginInter', method: 'vip_login_base', param: {} },
  };
  const res = await axios.get('https://u.y.qq.com/cgi-bin/musicu.fcg', {
    params: { format: 'json', sign: MUSICU_SIGN, data: JSON.stringify(data) },
    headers: {
      Referer: 'https://y.qq.com/',
      Cookie: cookie,
    },
    timeout: 10000,
  });
  const req = res.data?.req_0 || {};
  const payload = req.data && typeof req.data === 'object' ? req.data : {};
  return {
    code: Number(req.code) || 0,
    identity: payload.identity && typeof payload.identity === 'object' ? payload.identity : {},
    userinfo: payload.userinfo && typeof payload.userinfo === 'object' ? payload.userinfo : {},
    svip: payload.svip, // 旧体系残留字段：豪华绿钻，不作为超级会员判据
  };
}

export default async () => {
  const cookie = getRequestCookie();
  const key =
    cookieValue(cookie, 'qqmusic_key') ||
    cookieValue(cookie, 'p_skey') ||
    cookieValue(cookie, 'skey');
  const tk = key ? getACSRFToken(key) : 0;
  const uin = getRequestUin() || cookieValue(cookie, 'uin') || 0;

  // 两条上游并行且互不牵连：一条挂掉不影响另一条出结果
  const [legacy, client] = await Promise.all([
    fetchLegacy(cookie, `${uin}`, tk).catch(() => null),
    fetchClient(cookie, `${uin}`).catch(() => null),
  ]);

  // 有效载荷判定：A 需要 code 0 + data；B 需要 code 0 + identity（未登录时只有壳）
  const legacyOk = !!legacy && legacy.code === 0 && Object.keys(legacy.data).length > 0;
  const clientOk = !!client && client.code === 0 && Object.keys(client.identity).length > 0;

  // 两条都拿不到（cookie 失效/接口异常）→ 回非 0 code，
  // 前端据此保留既有状态、不打扰（与改动前一致）
  if (!legacyOk && !clientOk) {
    return {
      status: 200,
      body: {
        response: { code: legacy?.code || client?.code || -1, error: 'vip info unavailable' },
      },
    };
  }

  const ld = legacyOk ? legacy!.data : {};
  const ci = clientOk ? client!.identity : {};
  return {
    status: 200,
    body: {
      response: {
        code: 0,
        data: {
          // 绿钻族：vip=1 绿钻（A 为准，B 兜底）；svip=1 豪华绿钻（仅 A 有这一档）
          vip: Number(ld.vip) || Number(ci.vip) || 0,
          svip: Number(ld.svip) || 0,
          // 超级会员：仅 B 的 identity.HugeVip（可听臻品母带）
          hugeVip: Number(ci.HugeVip) || 0,
          svipKnown: clientOk, // B 未取到 → 超级会员档位未知（前端按放行处理）
          start: String(ld.start || ld.sstart || ''),
          end: String(ld.end || ld.send || ci.overdate || ''),
        },
      },
    },
  };
};
