import Router from 'koa-router';

const router = new Router();

import context from '../controllers';

// cookies
router.get('/user/getCookie', context.getCookie);
router.get('/user/setCookie', context.setCookie);

// downloadQQMusic
router.get('/downloadQQMusic', context.getDownloadQQMusic);

router.get('/getHotkey', context.getHotKey);

router.get('/getSearchByKey/:key?/:limit?/:page?/:catZhida?', context.getSearchByKey);

// 分类搜索（musicu.fcg）：t=1 歌手 / 2 专辑 / 3 歌单 / 8 用户
router.get('/getSearchByType/:key?/:limit?/:page?/:t?', context.getSearchByType);

// search smartbox
router.get('/getSmartbox/:key?', context.getSmartbox);

// 1
router.get('/getSongListCategories', context.getSongListCategories);

router.get('/getSongLists/:page?/:limit?/:categoryId?/:sortId?', context.getSongLists);

router.post('/batchGetSongLists', context.batchGetSongLists);

// getSongInfo
router.get('/getSongInfo/:songmid?/:songid?', context.getSongInfo);
router.post('/batchGetSongInfo', context.batchGetSongInfo);

// 4
// disstid=7011264340
router.get('/getSongListDetail/:disstid?', context.getSongListDetail);

// newDisk
router.get('/getNewDisks/:page?/:limit?', context.getNewDisks);

// getMvByTag
router.get('/getMvByTag', context.getMvByTag);

// MV
// area_id=15&version_id=7
router.get('/getMv/:area_id?/:version_id?/:limit?/:page?', context.getMv);

// getSingerList
router.get('/getSingerList/:area?/:sex?/:genre?/:index?/:page?', context.getSingerList);

// getSimilarSinger
// singermid=0025NhlN2yWrP4
router.get('/getSimilarSinger/:singermid?', context.getSimilarSinger);

// getSingerAlbum
// singermid=0025NhlN2yWrP4
router.get('/getSingerAlbum/:singermid?/:limit?/:page?', context.getSingerAlbum);

router.get('/getSingerHotsong/:singermid?/:limit?/:page?', context.getSingerHotsong);

/**
 * @description: getSingerMv
 * @param order: time(fan upload) || listen(singer all)
 */
router.get('/getSingerMv/:singermid?/:limit?/:order?', context.getSingerMv);

router.get('/getSingerDesc/:singermid?', context.getSingerDesc);

router.get('/getSingerStarNum/:singermid?', context.getSingerStarNum);

// radio
router.get('/getRadioLists', context.getRadioLists);

// radio track / 猜你喜欢（id=99）
router.get('/getRadioTrack/:id?/:num?/:firstplay?', context.getRadioTrack);

// fav（猜你喜欢页「喜欢」按钮：添加/取消喜欢到「我喜欢」列表）
router.post('/setFav', context.setFav);

// fav（收藏/取消收藏专辑，AlbumFavWrite；需登录 cookie）
router.post('/setAlbumFav', context.setAlbumFav);

// fav（批量查询专辑收藏状态，专辑页「收藏」按钮高亮；需登录 cookie）
router.post('/getIsAlbumFan', context.getIsAlbumFan);

// fav（收藏/取消收藏歌单，PlaylistFavWrite；需登录 cookie）
router.post('/setPlaylistFav', context.setPlaylistFav);

// fav（批量查询歌单收藏状态，歌单详情「收藏」按钮高亮；需登录 cookie）
router.post('/getIsPlaylistFan', context.getIsPlaylistFan);

// fav（批量查询歌曲喜欢状态，红心高亮）
router.post('/getIsSongFan', context.getIsSongFan);

// radio dislike（猜你喜欢页「删除」按钮：网页端仅统计上报，实际剔除歌曲在客户端本地完成）
router.post('/radioDislike', context.radioDislike);

// DigitalAlbum
router.get('/getDigitalAlbumLists', context.getDigitalAlbumLists);

// music
// getLyric
// songmid=003rJSwm3TechU
router.get('/getLyric/:songmid?/:isFormat?', context.getLyric);

// songmid=003rJSwm3TechU
router.get('/getMusicPlay/:songmid?', context.getMusicPlay);

// album
// albummid=0016l2F430zMux
router.get('/getAlbumInfo/:albummid?', context.getAlbumInfo);

router.get(
  '/getComments/:id?/:rootcommentid?/:cid?/:pagesize?/:pagenum?/:cmd?/:reqtype?/:biztype?',
  context.getComments,
);

// recommend
router.get('/getRecommend', context.getRecommend);

// recommend feed（首页「为你推荐」个性化歌单流，需登录 cookie 才个性化）
router.get('/getRecommendFeed', context.getRecommendFeed);

// daily playlist（每日30首/今日私享 disstid，需登录 cookie）
router.get('/getDailyPlaylist', context.getDailyPlaylist);

// mv play
router.get('/getMvPlay/:vid?', context.getMvPlay);

// rankList: getTopLists
router.get('/getTopLists', context.getTopLists);

// ranks
router.get('/getRanks/:topId?/:limit?/:page?', context.getRanks);

// ticket
router.get('/getTicketInfo', context.getTicketInfo);

// getImageUrl
router.get('/getImageUrl', context.getImageUrl);

// user profile（个人主页聚合：昵称/头像/粉丝/关注/我喜欢/创建的歌单）
router.get('/getUserProfile', context.getUserProfile);

// user refresh（刷新登录：用当前 musickey 换发新 key 延长有效期，对应 jsososo /user/refresh）
router.get('/user/refresh', context.refreshCredential);
// 同接口的 POST 别名（语义上属凭据维护操作）
router.post('/user/refresh', context.refreshCredential);

// user fav diss（收藏歌单列表，需登录 cookie）
router.get('/getUserFavDiss', context.getUserFavDiss);

// user fav album（收藏专辑列表，需登录 cookie）
router.get('/getUserFavAlbum', context.getUserFavAlbum);

// relation list（关注歌手/关注用户/粉丝列表，需登录 cookie）
router.get('/getRelationList', context.getRelationList);

// play recently（最近播放列表，云端同步接口 PlayRecentlyRead；需登录 cookie）
router.get('/getPlayRecently', context.getPlayRecently);

// play recently 写通道（客户端同款 PlayRecentlyWrite；需登录 cookie）
router.post('/reportPlayRecently', context.reportPlayRecently);
router.post('/deletePlayRecently', context.deletePlayRecently);

export default router;
