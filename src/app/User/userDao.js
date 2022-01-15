async function selectIsKakaoIdExist(connection, kakaoId) {
  const selectKakaoIdExistQuery = `
    SELECT EXISTS(SELECT kakaoId FROM User WHERE kakaoId = ?) as isKakaoIdExist;
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

module.exports = {
  selectIsKakaoIdExist,
  selectUserInfoByKakaoId,
  selectIsNickExist,
  insertUser
};
