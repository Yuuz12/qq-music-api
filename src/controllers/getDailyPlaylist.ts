import axios from 'axios';
import { Context } from 'koa';
import { getRequestCookie, getRequestUin } from '../util/requestCredential';

/**
 * getDailyPlaylist - 每日30首（今日私享）歌单 ID
 *
 * 2026-08 新增（本播放器项目适配）：
 * 逆向自 QQ 音乐 PC 网页版推荐页（c.y.qq.com/node/musicmac/v6/index.html）：
 * 该页「为你推荐」区块（.mod_for_u）的第一张歌单即「今日私享」（每日 30 首），
 * 其 data-rid 属性就是歌单 disstid（如 7424827127）。
 * 需要登录 cookie（多用户：随请求头下发，见 util/requestCredential.ts）；
 * 未登录时页面不含「今日私享」，返回 code 1000。
 *
 * 用法：GET /getDailyPlaylist
 * 响应：{ response: { code: 0, data: { disstid, dissname, picurl } } }
 *   picurl：歌单封面图（取自页面歌单卡的 <img class="playlist__pic" src>，
 *   页面返回 http，统一升 https；解析不到时为 ''）
 */

const PAGE_URL = 'https://c.y.qq.com/node/musicmac/v6/index.html';

/** 从「今日私享」歌单卡 HTML 中提取封面图地址（优先带 playlist__pic 类的 <img>，兜底取第一个 <img>） */
function extractPicurl(item: string): string {
  const imgMatch =
    item.match(/<img[^>]+class="[^"]*playlist__pic[^"]*"[^>]*src="([^"]+)"/) ||
    item.match(/<img[^>]*src="([^"]+)"/);
  return imgMatch ? imgMatch[1].replace(/^http:\/\//i, 'https://') : '';
}

export default async (ctx: Context) => {
  const cookie = getRequestCookie();
  const uin = getRequestUin();
  try {
    const res = await axios.get(PAGE_URL, {
      headers: {
        Referer: 'https://c.y.qq.com/',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Cookie: cookie,
      },
      timeout: 10000,
      responseType: 'text',
      transformResponse: [(d: unknown) => d], // 保持原始 HTML，不交给 axios 默认 JSON 解析
    });
    const html: string = (res.data || '').toString();

    // 解析：找第一张名字为「今日私享」的歌单卡片，取其 data-rid 与封面图
    const items = html.match(/<li[^>]*class="[^"]*playlist__item[^"]*"[^>]*>[\s\S]*?<\/li>/g) || [];
    let disstid = '';
    let picurl = '';
    for (const item of items) {
      const nameMatch = item.match(
        /<h3[^>]*class="[^"]*playlist__name[^"]*"[^>]*>[\s\S]*?>([^<]*)<\/a>\s*<\/h3>/,
      );
      const name = nameMatch ? nameMatch[1].trim() : '';
      if (name !== '今日私享') continue;
      const rid = item.match(/data-rid="(\d+)"/);
      if (rid) disstid = rid[1];
      picurl = extractPicurl(item);
      break;
    }

    if (!disstid) {
      ctx.body = {
        response: {
          code: 1000,
          data: null,
          msg: '未登录或页面无「今日私享」歌单（需在个人主页配置有效登录凭据）',
        },
      };
      return;
    }
    ctx.body = {
      response: {
        code: 0,
        data: { disstid, dissname: '每日30首', picurl },
      },
    };
  } catch (error) {
    ctx.body = {
      response: {
        code: -1,
        data: null,
        error: String(error),
        uin,
      },
    };
  }
};
