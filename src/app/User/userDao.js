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

async function selectIsUserWithdraw(connection, toIdx) {
  const selectUserWithdrawQuery = `
    SELECT isWithdraw
    FROM User
    WHERE User.idx = ?;
  `;
  const [selectUserWithdrawRow] = await connection.query(selectUserWithdrawQuery, toIdx);
  return selectUserWithdrawRow;
}

async function selectMyFollow(connection, [userIdx, option]) {
  let selectMyFollowQuery = "";
  let params;

  if (option === 'following') {
    selectMyFollowQuery = `
      SELECT toIdx, nickName, profileImgUrl,
       CASE
           WHEN Follow.status = 'Y' THEN '팔로잉 활성화중'
           WHEN Follow.status = 'N' THEN '팔로잉 비활성화중'
       END AS followStatus
      From Follow
        INNER JOIN User
        ON Follow.toIdx = User.idx
      WHERE Follow.fromIdx = ? AND User.isWithdraw = 'N';
    `;
    params = userIdx;
  } else {
    selectMyFollowQuery = `
      SELECT fromIdx, nickName, profileImgUrl,
            CASE
                WHEN (A.status IS NULL) OR (A.status = 'N') THEN '팔로잉 비활성화중'
                WHEN A.status = 'Y' THEN '팔로잉 활성화중'
            END AS followStatus
      FROM Follow
            INNER JOIN User ON Follow.fromIdx = User.idx
            LEFT JOIN (
                SELECT toIdx, status
                FROM Follow
                WHERE Follow.fromIdx = ?
            ) AS A ON fromIdx = A.toIdx
      WHERE Follow.toIdx = ? AND User.isWithdraw = 'N';
    `;
    params = [userIdx, userIdx];
  }

  const [selectMyFollowRow] = await connection.query(selectMyFollowQuery, params);
  return selectMyFollowRow;
}

async function selectOtherFollow(connection, [myIdx, userIdx, option]) {
  let selectOtherFollowQuery = "";
  let params;

  if (option === 'following') {
    selectOtherFollowQuery = `
      SELECT Follow.toIdx, nickName, profileImgUrl,
             CASE
               WHEN Follow.toIdx = ? THEN '자기 자신'
               WHEN (A.status IS NULL) OR (A.status = 'N') THEN '팔로잉 비활성화중'
               WHEN A.status = 'Y' THEN '팔로잉 활성화중'
               END AS followStatus
      FROM Follow
             INNER JOIN User ON Follow.toIdx = User.idx
             LEFT JOIN (
        SELECT toIdx, status
        FROM Follow
        WHERE Follow.fromIdx = ?
      ) AS A ON A.toIdx = Follow.toIdx
      WHERE Follow.fromIdx = ? AND User.isWithdraw = 'N';
    `;
    params = [myIdx, myIdx, userIdx];
  } else {
    selectOtherFollowQuery = `
      SELECT fromIdx, nickName, profileImgUrl,
             CASE
               WHEN Follow.fromIdx = ? THEN '자기 자신'
               WHEN (A.status IS NULL) OR (A.status = 'N') THEN '팔로잉 비활성화중'
               WHEN A.status = 'Y' THEN '팔로잉 활성화중'
               END AS followStatus
      FROM Follow
             INNER JOIN User ON Follow.fromIdx = User.idx
             LEFT JOIN (
        SELECT toIdx, status
        FROM Follow
        WHERE Follow.fromIdx = ?
      ) AS A ON A.toIdx = Follow.fromIdx
      WHERE Follow.toIdx = ? AND User.isWithdraw = 'N';
    `;

    params = [myIdx, myIdx, userIdx];
  }

  const [selectOtherFollowRow] = await connection.query(selectOtherFollowQuery, params);
  return selectOtherFollowRow;
}

async function selectUserProfile(connection, userIdx) {
  const selectUserProfileQuery = `
    SELECT nickName, profileImgUrl
    FROM User
    WHERE User.idx = ?;
  `;
  const [selectUserProfileRow] = await connection.query(selectUserProfileQuery, userIdx);
  return selectUserProfileRow;
}

async function selectUserNickname(connection, userIdx) {
  const selectUserNickQuery = `
    SELECT nickName
    FROM User
    WHERE User.idx = ?;
  `;
  const [selectUserNickRow] = await connection.query(selectUserNickQuery, userIdx);
  return selectUserNickRow;
}

async function updateUserProfile(connection, [userIdx, profileImgUrl, nickName]) {
  let updateProfileQuery = "";

  if (profileImgUrl === undefined) {
    updateProfileQuery = `
      UPDATE User
      SET nickname = ?
      WHERE User.idx = ?;
    `;
    const updateProfileResult = await connection.query(updateProfileQuery, [nickName, userIdx]);
    return updateProfileResult;
  } else {
    updateProfileQuery = `
      UPDATE User
      SET nickname = ?, profileImgUrl = ?
      WHERE User.idx = ?;
    `;
    const updateProfileResult = await connection.query(updateProfileQuery, [nickName, profileImgUrl, userIdx]);
    return updateProfileResult;
  }
}

module.exports = {
  selectIsKakaoIdExist,
  selectUserInfoByKakaoId,
  selectIsNickExist,
  insertUser,
  selectIsUserExistByIdx,
  selectFollowStatus,
  insertNewFollow,
  updateFollow,
  selectIsUserWithdraw,
  selectMyFollow,
  selectOtherFollow,
  selectUserProfile,
  selectUserNickname,
  updateUserProfile
};
