const { pool } = require("../../../config/database");
const { logger } = require("../../../config/winston");
const userDao = require("./userDao");

// 이메일 체크
exports.retrieveUserKakaoId = async function (kakaoId) {
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
exports.retrieveUserNickname = async function (nickName) {
  const connection = await pool.getConnection(async (conn) => conn);
  const nickCheckResult = await userDao.selectIsNickExist(connection, nickName);
  connection.release();
  return nickCheckResult;
};

// 팔로워, 팔로잉 리스트 조회
exports.retrieveFollowList = async function (userIdx, option) {
  const connection = await pool.getConnection(async (conn) => conn);
  const followListResult = await userDao.selectUserFollowList(connection, [userIdx, option]);
  connection.release();
  return followListResult;
};