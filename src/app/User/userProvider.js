const { pool } = require("../../../config/database");
const { logger } = require("../../../config/winston");
const userDao = require("./userDao");

// 이메일 체크
exports.emailCheck = async function (email) {
  const connection = await pool.getConnection(async (conn) => conn);
  const emailCheckResult = await userDao.selectIsEmailExist(connection, email);
  connection.release();
  return emailCheckResult;
};

// 사용자 정보 얻기
exports.getUserInfo = async function (email) {
  const connection = await pool.getConnection(async (conn) => conn);
  const userInfoResult = await userDao.selectUserInfo(connection, email);
  connection.release();
  return userInfoResult;
};