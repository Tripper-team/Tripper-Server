const { pool } = require("../../../config/database");
const { logger } = require("../../../config/winston");
const userDao = require("./userDao");

// 이메일 체크
exports.retrieveKakaoIdCheck = async function (kakaoId) {
  const connection = await pool.getConnection(async (conn) => conn);
  const kakaoIdCheckResult = await userDao.selectIsKakaoIdExist(connection, kakaoId);
  connection.release();
  return kakaoIdCheckResult;
};

// 사용자 정보 얻기
exports.getUserInfoByKakaoId = async function (kakaoId) {
  const connection = await pool.getConnection(async (conn) => conn);
  const userInfoResult = await userDao.selectUserInfoByKakaoId(connection, kakaoId);
  connection.release();
  return userInfoResult;
};

// 닉네임 중복체크
exports.retrieveUserNicknameCheck = async function (nickName) {
  const connection = await pool.getConnection(async (conn) => conn);
  const nickCheckResult = await userDao.selectIsNickExist(connection, nickName);
  connection.release();
  return nickCheckResult;
};

// 사용자 status 체크
exports.checkUserStatus = async function (userIdx) {
  const connection = await pool.getConnection(async (conn) => conn);
  const checkResult = await userDao.selectIsUserWithdraw(connection, userIdx);
  connection.release();
  return checkResult;
};

// 팔로워, 팔로잉 리스트 조회
exports.retrieveFollowList = async function (userIdx, isMe, search_option) {
  const connection = await pool.getConnection(async (conn) => conn);

  if (isMe === 'Y') {   // 본인일 경우
    const myFollowResult = await userDao.selectMyFollow(connection, [userIdx, search_option]);
    connection.release();
    return myFollowResult;
  }
  else {   // 상대방일 경우
    const otherFollowResult = await userDao.selectOtherFollow(connection, [userIdx[1], userIdx[0], search_option]);
    connection.release();
    return otherFollowResult;
  }
};

// 사용자 프로필 조회
exports.retrieveUserProfile = async function (userIdx) {
  const connection = await pool.getConnection(async (conn) => conn);
  const profileResult = await userDao.selectUserProfile(connection, userIdx);
  connection.release();
  return profileResult;
};

// 사용자 인덱스 체크하기
exports.retrieveUserIdxCheck = async function (userIdx) {
  const connection = await pool.getConnection(async (conn) => conn);
  const userIdxCheckResult = await userDao.selectIsUserExistByIdx(connection, userIdx);
  connection.release();
  return userIdxCheckResult;
};

exports.retrieveUserMyPage = async function (myIdx, userIdx, search_option) {
  const connection = await pool.getConnection(async (conn) => conn);
  connection.release();
};