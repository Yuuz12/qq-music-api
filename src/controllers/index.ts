import { withControllerLogging } from '../util/observability';
import batchGetSongInfo from './batchGetSongInfo';
import batchGetSongLists from './batchGetSongLists';
import cookies from './cookies';
import deletePlayRecently from './deletePlayRecently';
import getAlbumInfo from './getAlbumInfo';
import getComments from './getComments';
import getDailyPlaylist from './getDailyPlaylist';
import getDigitalAlbumLists from './getDigitalAlbumLists';
import getDownloadQQMusic from './getDownloadQQMusic';
import getHotKey from './getHotkey';
import getImageUrl from './getImageUrl';
import getIsAlbumFan from './getIsAlbumFan';
import getIsPlaylistFan from './getIsPlaylistFan';
import getIsSongFan from './getIsSongFan';
import getLyric from './getLyric';
import getMusicPlay from './getMusicPlay';
import getMv from './getMv';
import getMvByTag from './getMvByTag';
import getMvPlay from './getMvPlay';
import getNewDisks from './getNewDisks';
import getPlayRecently from './getPlayRecently';
import getRadioLists from './getRadioLists';
import getRadioTrack from './getRadioTrack';
import getRanks from './getRanks';
import getRecommend from './getRecommend';
import getRecommendFeed from './getRecommendFeed';
import getRelationList from './getRelationList';
import getSearchByKey from './getSearchByKey';
import getSearchByType from './getSearchByType';
import getSimilarSinger from './getSimilarSinger';
import getSingerAlbum from './getSingerAlbum';
import getSingerDesc from './getSingerDesc';
import getSingerHotsong from './getSingerHotsong';
import getSingerList from './getSingerList';
import getSingerMv from './getSingerMv';
import getSingerStarNum from './getSingerStarNum';
import getSmartbox from './getSmartbox';
import getSongInfo from './getSongInfo';
import getSongListCategories from './getSongListCategories';
import getSongListDetail from './getSongListDetail';
import getSongLists from './getSongLists';
import getTicketInfo from './getTicketInfo';
import getTopLists from './getTopLists';
import getUserFavAlbum from './getUserFavAlbum';
import getUserFavDiss from './getUserFavDiss';
import getUserProfile from './getUserProfile';
import radioDislike from './radioDislike';
import refreshCredential from './refreshCredential';
import reportPlayRecently from './reportPlayRecently';
import setAlbumFav from './setAlbumFav';
import setFav from './setFav';
import setPlaylistFav from './setPlaylistFav';

const { get: getCookie, set: setCookie } = cookies;

export default {
  getCookie: withControllerLogging('getCookie', getCookie),
  setCookie: withControllerLogging('setCookie', setCookie),
  getDownloadQQMusic: withControllerLogging('getDownloadQQMusic', getDownloadQQMusic),
  getHotKey: withControllerLogging('getHotKey', getHotKey),
  getSearchByKey: withControllerLogging('getSearchByKey', getSearchByKey),
  getSearchByType: withControllerLogging('getSearchByType', getSearchByType),
  getSmartbox: withControllerLogging('getSmartbox', getSmartbox),
  getSongListCategories: withControllerLogging('getSongListCategories', getSongListCategories),
  getSongLists: withControllerLogging('getSongLists', getSongLists),
  batchGetSongLists: withControllerLogging('batchGetSongLists', batchGetSongLists),
  getSongInfo: withControllerLogging('getSongInfo', getSongInfo),
  batchGetSongInfo: withControllerLogging('batchGetSongInfo', batchGetSongInfo),
  getSongListDetail: withControllerLogging('getSongListDetail', getSongListDetail),
  getNewDisks: withControllerLogging('getNewDisks', getNewDisks),
  getMvByTag: withControllerLogging('getMvByTag', getMvByTag),
  getMv: withControllerLogging('getMv', getMv),
  getSingerList: withControllerLogging('getSingerList', getSingerList),
  getSimilarSinger: withControllerLogging('getSimilarSinger', getSimilarSinger),
  getSingerAlbum: withControllerLogging('getSingerAlbum', getSingerAlbum),
  getSingerHotsong: withControllerLogging('getSingerHotsong', getSingerHotsong),
  getSingerMv: withControllerLogging('getSingerMv', getSingerMv),
  getSingerDesc: withControllerLogging('getSingerDesc', getSingerDesc),
  getSingerStarNum: withControllerLogging('getSingerStarNum', getSingerStarNum),
  getRadioLists: withControllerLogging('getRadioLists', getRadioLists),
  getRadioTrack: withControllerLogging('getRadioTrack', getRadioTrack),
  radioDislike: withControllerLogging('radioDislike', radioDislike),
  setFav: withControllerLogging('setFav', setFav),
  setAlbumFav: withControllerLogging('setAlbumFav', setAlbumFav),
  setPlaylistFav: withControllerLogging('setPlaylistFav', setPlaylistFav),
  getIsAlbumFan: withControllerLogging('getIsAlbumFan', getIsAlbumFan),
  getIsPlaylistFan: withControllerLogging('getIsPlaylistFan', getIsPlaylistFan),
  getIsSongFan: withControllerLogging('getIsSongFan', getIsSongFan),
  getDigitalAlbumLists: withControllerLogging('getDigitalAlbumLists', getDigitalAlbumLists),
  getLyric: withControllerLogging('getLyric', getLyric),
  getMusicPlay: withControllerLogging('getMusicPlay', getMusicPlay),
  getAlbumInfo: withControllerLogging('getAlbumInfo', getAlbumInfo),
  getComments: withControllerLogging('getComments', getComments),
  getDailyPlaylist: withControllerLogging('getDailyPlaylist', getDailyPlaylist),
  getRecommend: withControllerLogging('getRecommend', getRecommend),
  getRecommendFeed: withControllerLogging('getRecommendFeed', getRecommendFeed),
  getMvPlay: withControllerLogging('getMvPlay', getMvPlay),
  getTopLists: withControllerLogging('getTopLists', getTopLists),
  getRanks: withControllerLogging('getRanks', getRanks),
  getTicketInfo: withControllerLogging('getTicketInfo', getTicketInfo),
  getImageUrl: withControllerLogging('getImageUrl', getImageUrl),
  getUserProfile: withControllerLogging('getUserProfile', getUserProfile),
  getPlayRecently: withControllerLogging('getPlayRecently', getPlayRecently),
  reportPlayRecently: withControllerLogging('reportPlayRecently', reportPlayRecently),
  deletePlayRecently: withControllerLogging('deletePlayRecently', deletePlayRecently),
  getUserFavDiss: withControllerLogging('getUserFavDiss', getUserFavDiss),
  getUserFavAlbum: withControllerLogging('getUserFavAlbum', getUserFavAlbum),
  getRelationList: withControllerLogging('getRelationList', getRelationList),
  refreshCredential: withControllerLogging('refreshCredential', refreshCredential),
};
