"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// album
const getAlbumInfo_1 = __importDefault(require("./album/getAlbumInfo"));
// comments
const getComments_1 = __importDefault(require("./comments/getComments"));
// DigitalAlbum
const getDigitalAlbumLists_1 = __importDefault(require("./digitalAlbum/getDigitalAlbumLists"));
const downloadQQMusic_1 = __importDefault(require("./downloadQQMusic"));
// fav
const getIsAlbumFan_1 = __importDefault(require("./fav/getIsAlbumFan"));
const getIsPlaylistFan_1 = __importDefault(require("./fav/getIsPlaylistFan"));
const getIsSongFan_1 = __importDefault(require("./fav/getIsSongFan"));
const setAlbumFav_1 = __importDefault(require("./fav/setAlbumFav"));
const setFav_1 = __importDefault(require("./fav/setFav"));
const setPlaylistFav_1 = __importDefault(require("./fav/setPlaylistFav"));
// music
const getLyric_1 = __importDefault(require("./music/getLyric"));
// MV
const getMvByTag_1 = __importDefault(require("./mv/getMvByTag"));
// radio
const getRadioLists_1 = __importDefault(require("./radio/getRadioLists"));
const getRadioTrack_1 = __importDefault(require("./radio/getRadioTrack"));
const radioDislike_1 = __importDefault(require("./radio/radioDislike"));
// getTopLists
const getTopLists_1 = __importDefault(require("./rank/getTopLists"));
// recommend
const getRecommendFeed_1 = __importDefault(require("./recommend/getRecommendFeed"));
// search
const getHotKey_1 = __importDefault(require("./search/getHotKey"));
const getSearchByKey_1 = __importDefault(require("./search/getSearchByKey"));
const getSearchByType_1 = __importDefault(require("./search/getSearchByType"));
const getSmartbox_1 = __importDefault(require("./search/getSmartbox"));
// singer
const getSimilarSinger_1 = __importDefault(require("./singers/getSimilarSinger"));
const getSingerDesc_1 = __importDefault(require("./singers/getSingerDesc"));
const getSingerMv_1 = __importDefault(require("./singers/getSingerMv"));
const getSingerStarNum_1 = __importDefault(require("./singers/getSingerStarNum"));
const songListCategories_1 = __importDefault(require("./songLists/songListCategories"));
const songListDetail_1 = __importDefault(require("./songLists/songListDetail"));
// 官方 AI 歌单（百万收藏 211111 / 新歌推荐 211207 等专属通道）
const aiSongListDetail_1 = __importDefault(require("./songLists/aiSongListDetail"));
// song list
const songLists_1 = __importDefault(require("./songLists/songLists"));
// UCommon
const UCommon_1 = __importDefault(require("./UCommon/UCommon"));
const feedbackBlack_1 = require("./user/feedbackBlack");
const getPlayRecently_1 = __importDefault(require("./user/getPlayRecently"));
// user
const getRelationList_1 = __importDefault(require("./user/getRelationList"));
const getUserCreatedDiss_1 = __importDefault(require("./user/getUserCreatedDiss"));
const getUserFavAlbum_1 = __importDefault(require("./user/getUserFavAlbum"));
const getUserFavDiss_1 = __importDefault(require("./user/getUserFavDiss"));
const getUserProfile_1 = __importDefault(require("./user/getUserProfile"));
const playRecentlyWrite_1 = require("./user/playRecentlyWrite");
const refreshCredential_1 = __importDefault(require("./user/refreshCredential"));
exports.default = {
    downloadQQMusic: downloadQQMusic_1.default,
    // search
    getHotKey: getHotKey_1.default,
    getSearchByKey: getSearchByKey_1.default,
    getSearchByType: getSearchByType_1.default,
    getSmartbox: getSmartbox_1.default,
    // song lists
    songLists: songLists_1.default,
    songListCategories: songListCategories_1.default,
    songListDetail: songListDetail_1.default,
    aiSongListDetail: aiSongListDetail_1.default,
    // MV
    getMvByTag: getMvByTag_1.default,
    // singer
    getSimilarSinger: getSimilarSinger_1.default,
    getSingerMv: getSingerMv_1.default,
    getSingerDesc: getSingerDesc_1.default,
    getSingerStarNum: getSingerStarNum_1.default,
    // radio
    getRadioLists: getRadioLists_1.default,
    getRadioTrack: getRadioTrack_1.default,
    radioDislike: radioDislike_1.default,
    // fav（喜欢/红心）
    getIsSongFan: getIsSongFan_1.default,
    setFav: setFav_1.default,
    // fav（专辑收藏）
    getIsAlbumFan: getIsAlbumFan_1.default,
    setAlbumFav: setAlbumFav_1.default,
    // fav（歌单收藏）
    getIsPlaylistFan: getIsPlaylistFan_1.default,
    setPlaylistFav: setPlaylistFav_1.default,
    // DigitalAlbum
    getDigitalAlbumLists: getDigitalAlbumLists_1.default,
    // music
    getLyric: getLyric_1.default,
    // album
    getAlbumInfo: getAlbumInfo_1.default,
    // comments
    getComments: getComments_1.default,
    // UCommon
    UCommon: UCommon_1.default,
    // user
    getUserProfile: getUserProfile_1.default,
    getUserCreatedDiss: getUserCreatedDiss_1.default,
    getPlayRecently: getPlayRecently_1.default,
    reportPlayRecently: playRecentlyWrite_1.reportPlayRecently,
    deletePlayRecently: playRecentlyWrite_1.deletePlayRecently,
    getUserFavDiss: getUserFavDiss_1.default,
    getUserFavAlbum: getUserFavAlbum_1.default,
    getRelationList: getRelationList_1.default,
    refreshCredential: refreshCredential_1.default,
    // getTopLists
    getTopLists: getTopLists_1.default,
    // recommend（为你推荐·个性化歌单流）
    getRecommendFeed: getRecommendFeed_1.default,
    // 不喜欢/黑名单（FeedbackBlack，猜你喜欢等「删除这首歌曲」按钮）
    addDislike: feedbackBlack_1.addDislike,
    cancelDislike: feedbackBlack_1.cancelDislike,
    getDislikeList: feedbackBlack_1.getDislikeList,
};
