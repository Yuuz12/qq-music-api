import { Context } from 'koa';
import services from '../services';

const { getUserProfile, getUserCreatedDiss } = services;

/**
 * getUserProfile - 用户主页信息（自己或他人）
 * GET /getUserProfile            当前登录用户自己
 * GET /getUserProfile?uin=<EncUin> 他人（uin 为目标用户加密 uin，见 getRelationList.encuin）
 * 整理为前端友好结构：昵称/头像/粉丝/关注/我喜欢/创建的歌单
 */

/** 上游 creator 节点 */
interface HomepageCreator {
  nick?: string;
  headpic?: string;
  encrypt_uin?: string;
  nums?: { fansnum?: number; follownum?: number };
  [key: string]: unknown;
}

/** 上游「我创建的歌单」条目 */
interface HomepageDiss {
  dissid?: number | string;
  dirid?: number;
  title?: string;
  picurl?: string;
  subtitle?: string;
  [key: string]: unknown;
}

/** 上游「我喜欢」等聚合歌单条目（type=1 为我喜欢） */
interface HomepageMusic {
  type?: number;
  id?: number | string;
  title?: string;
  picurl?: string;
  num0?: number;
  num1?: number;
  num2?: number;
  [key: string]: unknown;
}

/** 上游 fcg_get_profile_homepage 的 data 节点 */
interface HomepageData {
  creator?: HomepageCreator;
  mydiss?: { list?: HomepageDiss[] };
  mymusic?: HomepageMusic[];
  [key: string]: unknown;
}

/** 上游 fcg_user_created_diss 的单条歌单（创建者信息冗余在每一行里） */
interface CreatedDissItem {
  dissid?: number | string;
  dirid?: number;
  title?: string;
  picurl?: string;
  imgurl?: string;
  song_count?: number;
  total_song_count?: number;
  nick?: string;
  avatar?: string;
  encrypt_uin?: string;
  [key: string]: unknown;
}

/** 前端统一结构（两条上游通道整形后共用，前端无感） */
interface ProfilePayload {
  nick: string;
  headpic: string;
  encryptUin: string;
  fansnum: number;
  follownum: number;
  like: {
    id: string;
    title: string;
    picurl: string;
    songnum: number;
    albumnum: number;
    dirnum: number;
  } | null;
  disslist: {
    dissid: string;
    dirId?: number;
    title: string;
    picurl: string;
    subtitle: string;
  }[];
  /** 数据来源：homepage=主页聚合接口（计数完整）/ created_diss=创建歌单兜底通道（无计数） */
  source: 'homepage' | 'created_diss';
}

const EMPTY_PROFILE: ProfilePayload = {
  nick: '',
  headpic: '',
  encryptUin: '',
  fansnum: 0,
  follownum: 0,
  like: null,
  disslist: [],
  source: 'homepage',
};

/** 主页聚合接口 data → 前端结构 */
function fromHomepage(d: HomepageData): ProfilePayload {
  const like = (d.mymusic || []).find((m) => m.type === 1) || null;
  return {
    nick: d.creator?.nick || '',
    headpic: d.creator?.headpic || '',
    encryptUin: d.creator?.encrypt_uin || '',
    fansnum: d.creator?.nums?.fansnum ?? 0,
    follownum: d.creator?.nums?.follownum ?? 0,
    like: like
      ? {
          id: String(like.id || ''),
          title: like.title || '我喜欢',
          picurl: like.picurl || '',
          songnum: like.num0 ?? 0,
          albumnum: like.num1 ?? 0,
          dirnum: like.num2 ?? 0,
        }
      : null,
    disslist: (d.mydiss?.list || []).map((s) => ({
      dissid: String(s.dissid || ''),
      // 写接口（添加到歌单 PlaylistDetailWrite.AddSonglist）必须用内部 dirId
      // （201=我喜欢；自建歌单为内部序号如 4），不能用 dissid/tid（会返回 80092）
      dirId: s.dirid ? Number(s.dirid) : undefined,
      title: s.title || '',
      picurl: s.picurl || '',
      subtitle: s.subtitle || '',
    })),
    source: 'homepage',
  };
}

/** 兜底通道的 data 节点（歌单数组各版本命名不一：lst / disslist / list） */
interface CreatedDissData {
  lst?: CreatedDissItem[];
  disslist?: CreatedDissItem[];
  list?: CreatedDissItem[];
}

/** 创建歌单兜底通道 data → 前端结构（拿不到数据时返回 null） */
function fromCreatedDiss(data: unknown, uin: string): ProfilePayload | null {
  const d = (data || {}) as CreatedDissData;
  const list = ([d.lst, d.disslist, d.list].find(Array.isArray) || []) as CreatedDissItem[];
  const first = list[0];
  // 该通道把创建者信息冗余在每一行里；昵称缺失即视为没取到目标用户
  if (!first?.nick) return null;
  if (first.encrypt_uin && first.encrypt_uin !== uin) return null;
  return {
    ...EMPTY_PROFILE,
    nick: first.nick,
    headpic: first.avatar || '',
    encryptUin: first.encrypt_uin || uin,
    disslist: list.map((s) => {
      const count = s.song_count ?? s.total_song_count ?? 0;
      return {
        dissid: String(s.dissid || ''),
        dirId: s.dirid ? Number(s.dirid) : undefined,
        title: s.title || '',
        picurl: s.picurl || s.imgurl || '',
        subtitle: count ? `${count} 首` : '',
      };
    }),
    source: 'created_diss',
  };
}

export default async (ctx: Context) => {
  const uin = String(ctx.query.uin || '').trim();
  const { status, body } = await getUserProfile({ uin });
  const code = body.response?.code ?? -1;
  const data = body.response?.data as HomepageData | undefined;
  // 查他人时上游可能静默回落成登录用户自己的资料：用返回的 encrypt_uin 与请求 uin 比对识别
  const isTargetUser = !uin || !data?.creator?.encrypt_uin || data.creator.encrypt_uin === uin;
  const usable = code === 0 && !!data?.creator?.nick && isTargetUser;

  if (usable && data) {
    ctx.status = 200;
    ctx.body = { response: { code, data: fromHomepage(data) } };
    return;
  }
  if (!uin) {
    // 查自己：维持原行为（失败也返回同结构空数据，前端据此提示凭据失效）
    ctx.status = status;
    ctx.body = { response: { code, data: fromHomepage(data || {}) } };
    return;
  }
  // 查他人且主页聚合接口不可用（隐私限制/未登录/上游不识别 hostUin）→ 兜底只取公开歌单
  const fallback = await getUserCreatedDiss({ uin });
  const created = fromCreatedDiss(fallback.body.response?.data, uin);
  if (created) {
    ctx.status = 200;
    ctx.body = { response: { code: 0, data: created } };
    return;
  }
  ctx.status = 200;
  ctx.body = {
    response: { code: code === 0 ? -1 : code, data: { ...EMPTY_PROFILE, encryptUin: uin } },
  };
};
