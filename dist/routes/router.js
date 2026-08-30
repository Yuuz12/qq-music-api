"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const koa_router_1 = __importDefault(require("koa-router"));
const router = new koa_router_1.default();
const controllers_1 = __importDefault(require("../controllers"));
// cookies
router.get('/user/getCookie', controllers_1.default.getCookie);
router.get('/user/setCookie', controllers_1.default.setCookie);
// downloadQQMusic
router.get('/downloadQQMusic', controllers_1.default.getDownloadQQMusic);
router.get('/getHotkey', controllers_1.default.getHotKey);
router.get('/getSearchByKey/:key?/:limit?/:page?/:catZhida?', controllers_1.default.getSearchByKey);
// 分类搜索（musicu.fcg）：t=1 歌手 / 2 专辑 / 3 歌单 / 8 用户
router.get('/getSearchByType/:key?/:limit?/:page?/:t?', controllers_1.default.getSearchByType);
// search smartbox
router.get('/getSmartbox/:key?', controllers_1.default.getSmartbox);
// 1
router.get('/getSongListCategories', controllers_1.default.getSongListCategories);
router.get('/getSongLists/:page?/:limit?/:categoryId?/:sortId?', controllers_1.default.getSongLists);
router.post('/batchGetSongLists', controllers_1.default.batchGetSongLists);
// getSongInfo
router.get('/getSongInfo/:songmid?/:songid?', controllers_1.default.getSongInfo);
router.post('/batchGetSongInfo', controllers_1.default.batchGetSongInfo);
// 4
// disstid=7011264340
router.get('/getSongListDetail/:disstid?', controllers_1.default.getSongListDetail);
// newDisk
router.get('/getNewDisks/:page?/:limit?', controllers_1.default.getNewDisks);
// getMvByTag
router.get('/getMvByTag', controllers_1.default.getMvByTag);
// MV
// area_id=15&version_id=7
router.get('/getMv/:area_id?/:version_id?/:limit?/:page?', controllers_1.default.getMv);
// getSingerList
router.get('/getSingerList/:area?/:sex?/:genre?/:index?/:page?', controllers_1.default.getSingerList);
// getSimilarSinger
// singermid=0025NhlN2yWrP4
router.get('/getSimilarSinger/:singermid?', controllers_1.default.getSimilarSinger);
// getSingerAlbum
// singermid=0025NhlN2yWrP4
router.get('/getSingerAlbum/:singermid?/:limit?/:page?', controllers_1.default.getSingerAlbum);
router.get('/getSingerHotsong/:singermid?/:limit?/:page?', controllers_1.default.getSingerHotsong);
/**
 * @description: getSingerMv
 * @param order: time(fan upload) || listen(singer all)
 */
router.get('/getSingerMv/:singermid?/:limit?/:order?', controllers_1.default.getSingerMv);
router.get('/getSingerDesc/:singermid?', controllers_1.default.getSingerDesc);
router.get('/getSingerStarNum/:singermid?', controllers_1.default.getSingerStarNum);
// radio
router.get('/getRadioLists', controllers_1.default.getRadioLists);
// radio track / 猜你喜欢（id=99）
router.get('/getRadioTrack/:id?/:num?/:firstplay?', controllers_1.default.getRadioTrack);
// fav（猜你喜欢页「喜欢」按钮：添加/取消喜欢到「我喜欢」列表）
router.post('/setFav', controllers_1.default.setFav);
// fav（收藏/取消收藏专辑，AlbumFavWrite；需登录 cookie）
router.post('/setAlbumFav', controllers_1.default.setAlbumFav);
// fav（批量查询专辑收藏状态，专辑页「收藏」按钮高亮；需登录 cookie）
router.post('/getIsAlbumFan', controllers_1.default.getIsAlbumFan);
// fav（收藏/取消收藏歌单，PlaylistFavWrite；需登录 cookie）
router.post('/setPlaylistFav', controllers_1.default.setPlaylistFav);
// fav（批量查询歌单收藏状态，歌单详情「收藏」按钮高亮；需登录 cookie）
router.post('/getIsPlaylistFan', controllers_1.default.getIsPlaylistFan);
// fav（批量查询歌曲喜欢状态，红心高亮）
router.post('/getIsSongFan', controllers_1.default.getIsSongFan);
// radio dislike（猜你喜欢页「删除」按钮：网页端仅统计上报，实际剔除歌曲在客户端本地完成）
router.post('/radioDislike', controllers_1.default.radioDislike);
// DigitalAlbum
router.get('/getDigitalAlbumLists', controllers_1.default.getDigitalAlbumLists);
// music
// getLyric
// songmid=003rJSwm3TechU
router.get('/getLyric/:songmid?/:isFormat?', controllers_1.default.getLyric);
// songmid=003rJSwm3TechU
router.get('/getMusicPlay/:songmid?', controllers_1.default.getMusicPlay);
// album
// albummid=0016l2F430zMux
router.get('/getAlbumInfo/:albummid?', controllers_1.default.getAlbumInfo);
router.get('/getComments/:id?/:rootcommentid?/:cid?/:pagesize?/:pagenum?/:cmd?/:reqtype?/:biztype?', controllers_1.default.getComments);
// recommend
router.get('/getRecommend', controllers_1.default.getRecommend);
// daily playlist（每日30首/今日私享 disstid，需登录 cookie）
router.get('/getDailyPlaylist', controllers_1.default.getDailyPlaylist);
// mv play
router.get('/getMvPlay/:vid?', controllers_1.default.getMvPlay);
// rankList: getTopLists
router.get('/getTopLists', controllers_1.default.getTopLists);
// ranks
router.get('/getRanks/:topId?/:limit?/:page?', controllers_1.default.getRanks);
// ticket
router.get('/getTicketInfo', controllers_1.default.getTicketInfo);
// getImageUrl
router.get('/getImageUrl', controllers_1.default.getImageUrl);
// user profile（个人主页聚合：昵称/头像/粉丝/关注/我喜欢/创建的歌单）
router.get('/getUserProfile', controllers_1.default.getUserProfile);
// user fav diss（收藏歌单列表，需登录 cookie）
router.get('/getUserFavDiss', controllers_1.default.getUserFavDiss);
// user fav album（收藏专辑列表，需登录 cookie）
router.get('/getUserFavAlbum', controllers_1.default.getUserFavAlbum);
// relation list（关注歌手/关注用户/粉丝列表，需登录 cookie）
router.get('/getRelationList', controllers_1.default.getRelationList);
exports.default = router;
