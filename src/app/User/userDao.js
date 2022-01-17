async function selectIsKakaoIdExist(connection, kakaoId) {
  const selectKakaoIdExistQuery = `
    SELECT EXISTS(SELECT kakaoId FROM User WHERE kakaoId = ?) AS isKakaoIdExist;
  `;
  const [kakaoIdExistRow] = await connection.query(selectKakaoIdExistQuery, kakaoId);
  return kakaoIdExistRow;
}

async function selectUserInfoByKakaoId(connection, kakaoId) {
  const selectUserInfoQuery = `
    SELECT idx AS userIdx, email, nickName, profileImgUrl, kakaoId, ageGroup, gender
    FROM User
    WHERE User.kakaoId = ?;
  `;
  const [userInfoRow] = await connection.query(selectUserInfoQuery, kakaoId);
  return userInfoRow;
}

async function selectIsNickExist(connection, nickName) {
  const selectNickExistQuery = `
    SELECT EXISTS(SELECT nickName FROM User WHERE nickName = ?) as isNickResult;
  `;
  const [nickExistRow] = await connection.query(selectNickExistQuery, nickName);
  return nickExistRow;
}

async function insertUser(connection, [email, profileImgUrl, kakaoId, age, gender, nickName]) {
  const insertUserQuery = `
    INSERT INTO User(email, profileImgUrl, kakaoId, ageGroup, gender, nickName)
    VALUES (?, ?, ?, ?, ?, ?);
  `;
  const insertUserRow = await connection.query(insertUserQuery, [email, profileImgUrl, kakaoId, age, gender, nickName]);
  return insertUserRow;
}

async function selectIsUserExistByIdx(connection, userIdx) {
  const selectUserExistQuery = `
    SELECT EXISTS(SELECT idx FROM User WHERE idx = ?) AS isUserExist;
  `;
  const [userExistRow] = await connection.query(selectUserExistQuery, userIdx);
  return userExistRow;
}

async function selectFollowStatus(connection, [fromIdx, toIdx]) {
  const selectFollowStatusQuery = `
    SELECT status
    FROM Follow
    WHERE fromIdx = ? AND toIdx = ?;
  `;
  const [followStatusRow] = await connection.query(selectFollowStatusQuery, [fromIdx, toIdx]);
  return followStatusRow;
}

async function insertNewFollow(connection, [fromIdx, toIdx]) {
  const insertNewFollowQuery = `
    INSERT INTO Follow(fromIdx, toIdx)
    VALUES (?, ?);
  `;
  const newFollowRow = await connection.query(insertNewFollowQuery, [fromIdx, toIdx]);
  return newFollowRow;
}

async function updateFollow(connection, [status, fromIdx, toIdx]) {
  const updateFollowStatusQuery = `
    UPDATE Follow
    SET status = ?
    WHERE fromIdx = ? AND toIdx = ?;
  `;
  const updateFollowStatusRow = await connection.query(updateFollowStatusQuery, [status, fromIdx, toIdx]);
  return updateFollowStatusRow;
}

module.exports = {
  selectIsKakaoIdExist,
  selectUserInfoByKakaoId,
  selectIsNickExist,
  insertUser,
  selectIsUserExistByIdx,
  selectFollowStatus,
  insertNewFollow,
  updateFollow
};
