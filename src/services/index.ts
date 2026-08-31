// album
import getAlbumInfo from './album/getAlbumInfo';
// comments
import getComments from './comments/getComments';
// DigitalAlbum
import getDigitalAlbumLists from './digitalAlbum/getDigitalAlbumLists';
import downloadQQMusic from './downloadQQMusic';
// fav
import getIsAlbumFan from './fav/getIsAlbumFan';
import getIsPlaylistFan from './fav/getIsPlaylistFan';
import getIsSongFan from './fav/getIsSongFan';
import setAlbumFav from './fav/setAlbumFav';
import setFav from './fav/setFav';
import setPlaylistFav from './fav/setPlaylistFav';
// music
import getLyric from './music/getLyric';
// MV
import getMvByTag from './mv/getMvByTag';
// radio
import getRadioLists from './radio/getRadioLists';
import getRadioTrack from './radio/getRadioTrack';
import radioDislike from './radio/radioDislike';
// getTopLists
import getTopLists from './rank/getTopLists';
// recommend
import getRecommendFeed from './recommend/getRecommendFeed';
// search
import getHotKey from './search/getHotKey';
import getSearchByKey from './search/getSearchByKey';
import getSearchByType from './search/getSearchByType';
import getSmartbox from './search/getSmartbox';
// singer
import getSimilarSinger from './singers/getSimilarSinger';
import getSingerDesc from './singers/getSingerDesc';
import getSingerMv from './singers/getSingerMv';
import getSingerStarNum from './singers/getSingerStarNum';
import songListCategories from './songLists/songListCategories';
import songListDetail from './songLists/songListDetail';
// song list
import songLists from './songLists/songLists';
// UCommon
import UCommon from './UCommon/UCommon';
import { addDislike, cancelDislike, getDislikeList } from './user/feedbackBlack';
import getPlayRecently from './user/getPlayRecently';
// user
import getRelationList from './user/getRelationList';
import getUserFavAlbum from './user/getUserFavAlbum';
import getUserFavDiss from './user/getUserFavDiss';
import getUserProfile from './user/getUserProfile';
import { deletePlayRecently, reportPlayRecently } from './user/playRecentlyWrite';
import refreshCredential from './user/refreshCredential';

export default {
  downloadQQMusic,
  // search
  getHotKey,
  getSearchByKey,
  getSearchByType,
  getSmartbox,
  // song lists
  songLists,
  songListCategories,
  songListDetail,
  // MV
  getMvByTag,
  // singer
  getSimilarSinger,
  getSingerMv,
  getSingerDesc,
  getSingerStarNum,
  // radio
  getRadioLists,
  getRadioTrack,
  radioDislike,
  // fav（喜欢/红心）
  getIsSongFan,
  setFav,
  // fav（专辑收藏）
  getIsAlbumFan,
  setAlbumFav,
  // fav（歌单收藏）
  getIsPlaylistFan,
  setPlaylistFav,
  // DigitalAlbum
  getDigitalAlbumLists,
  // music
  getLyric,
  // album
  getAlbumInfo,
  // comments
  getComments,
  // UCommon
  UCommon,
  // user
  getUserProfile,
  getPlayRecently,
  reportPlayRecently,
  deletePlayRecently,
  getUserFavDiss,
  getUserFavAlbum,
  getRelationList,
  refreshCredential,
  // getTopLists
  getTopLists,
  // recommend（为你推荐·个性化歌单流）
  getRecommendFeed,
  // 不喜欢/黑名单（FeedbackBlack，猜你喜欢等「删除这首歌曲」按钮）
  addDislike,
  cancelDislike,
  getDislikeList,
};
