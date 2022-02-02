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

async function selectUserInfoInMyPage(connection, userIdx) {
  const selectUserInfoInMyPageQuery = `
    SELECT profileImgUrl, nickName,
           (SELECT COUNT(toIdx)
            FROM Follow
                   INNER JOIN User ON Follow.toIdx = User.idx AND Follow.fromIdx = ? AND User.isWithdraw = 'N' AND Follow.status = 'Y') AS followingCount,
           (SELECT COUNT(fromIdx)
            FROM Follow
                   INNER JOIN User ON Follow.fromIdx = User.idx AND Follow.toIdx = ? AND User.isWithdraw = 'N' AND Follow.status = 'Y') AS followerCount
    FROM User
    WHERE User.idx = ? AND User.isWithdraw = 'N';
  `;
  const [selectUserInfoInMyPageRow] = await connection.query(selectUserInfoInMyPageQuery, [userIdx, userIdx, userIdx]);
  return selectUserInfoInMyPageRow;
}

async function selectUserFeedInMyPageByOption(connection, [userIdx, option]) {
  let selectUserFeedInMyPageByOptionQuery = '';

  if (option === "내여행") {
    selectUserFeedInMyPageByOptionQuery = `
      SELECT travelIdx, travelTitle, travelIntroduce, travelStatus, travelHashtag, travelScore, thumImgUrl, temp.createdAt AS createdAt
      FROM (
             SELECT T.idx AS travelIdx, T.title AS travelTitle, T.introduce AS travelIntroduce, T.createdAt,
                    IF(T.status = 'PUBLIC', '공개', '비공개') AS travelStatus,
                    GROUP_CONCAT(CONCAT('#', H.content) SEPARATOR ' ') AS travelHashtag,
                    CASE
                      WHEN S.score IS NULL THEN "점수 없음"
                      WHEN S.score < 2.0 THEN "별로에요"
                      WHEN S.score < 3.0 THEN "도움되지 않았어요"
                      WHEN S.score < 4.0 THEN "그저 그래요"
                      WHEN S.score < 4.5 THEN "도움되었어요!"
                      ELSE "최고의 여행!"
                      END AS travelScore, thumImgUrl
             FROM Travel AS T
                    LEFT JOIN (
               SELECT travelIdx, content
               FROM TravelHashtag
                      INNER JOIN Hashtag ON Hashtag.idx = TravelHashtag.hashtagIdx
               WHERE TravelHashtag.status = 'Y'
             ) AS H ON T.idx = H.travelIdx
                    LEFT JOIN (
               SELECT TravelScore.travelIdx AS scoreTravelIdx, AVG(score) AS score
               FROM TravelScore
                      LEFT JOIN Travel ON Travel.idx = TravelScore.travelIdx
               GROUP BY TravelScore.travelIdx
             ) AS S ON H.travelIdx = S.scoreTravelIdx
                    LEFT JOIN (
               SELECT TravelThumnail.idx, TravelThumnail.travelIdx AS thumTravelIdx, thumImgUrl
               FROM TravelThumnail
                      LEFT JOIN Travel ON TravelThumnail.travelIdx = Travel.idx
               GROUP BY TravelThumnail.travelIdx HAVING MIN(TravelThumnail.idx)
             ) AS TH ON S.scoreTravelIdx = TH.thumTravelIdx
             WHERE T.userIdx = ? AND T.status != 'DELETED'
             GROUP BY T.idx
           ) AS temp
      ORDER BY temp.createdAt DESC;
    `;
    const [selectUserFeedInMyPageByOptionRow] = await connection.query(selectUserFeedInMyPageByOptionQuery, userIdx);
    return selectUserFeedInMyPageByOptionRow;
  }
  else if (option === "좋아요") {
    selectUserFeedInMyPageByOptionQuery = `
      SELECT travelIdx, likeStatus, travelTitle, travelIntroduce, travelHashtag, travelScore, thumImgUrl, temp.createdAt AS createdAt
      FROM (
             SELECT T.userIdx, travelIdx, IF(TravelLike.status = 'Y', '좋아요 활성화', '좋아요 비활성화') AS likeStatus, T.title AS travelTitle,
                    T.introduce AS travelIntroduce, GROUP_CONCAT(CONCAT('#', H.content) SEPARATOR ' ') AS travelHashtag,
                    CASE
                      WHEN S.score IS NULL THEN null
                      WHEN S.score < 2.0 THEN "별로에요"
                      WHEN S.score < 3.0 THEN "도움되지 않았어요"
                      WHEN S.score < 4.0 THEN "그저 그래요"
                      WHEN S.score < 4.5 THEN "도움되었어요!"
                      ELSE "최고의 여행!"
                      END AS travelScore, thumImgUrl, TravelLike.createdAt AS createdAt
             FROM TravelLike
                    INNER JOIN Travel AS T ON TravelLike.travelIdx = T.idx AND T.status != 'DELETED' AND T.status != 'PRIVATE'
        LEFT JOIN (
            SELECT TravelHashtag.travelIdx AS hashTravelIdx, content
            FROM TravelHashtag
                INNER JOIN Hashtag ON Hashtag.idx = TravelHashtag.hashtagIdx
            WHERE TravelHashtag.status = 'Y'
        ) AS H ON T.idx = H.hashTravelIdx
               LEFT JOIN (
               SELECT TravelScore.travelIdx AS scoreTravelIdx, AVG(score) AS score
               FROM TravelScore
               LEFT JOIN TravelLike ON TravelLike.travelIdx = TravelScore.travelIdx
               GROUP BY TravelScore.travelIdx
               ) AS S ON H.hashTravelIdx = S.scoreTravelIdx
               LEFT JOIN (
               SELECT TravelThumnail.idx, TravelThumnail.travelIdx AS thumTravelIdx, thumImgUrl
               FROM TravelThumnail
               LEFT JOIN TravelLike ON TravelThumnail.travelIdx = TravelLike.travelIdx
               GROUP BY TravelThumnail.travelIdx HAVING MIN(TravelThumnail.idx)
               ) AS TH ON S.scoreTravelIdx = TH.thumTravelIdx
               INNER JOIN User ON User.idx = T.userIdx AND User.isWithdraw = 'N'
             WHERE TravelLike.userIdx = 1 AND TravelLike.status = 'Y'
             GROUP BY TravelLike.travelIdx
           ) AS temp
      ORDER BY temp.createdAt DESC;    `;
    const [selectUserFeedInMyPageByOptionRow] = await connection.query(selectUserFeedInMyPageByOptionQuery, userIdx);
    return selectUserFeedInMyPageByOptionRow;
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
  updateUserProfile,
  selectUserInfoInMyPage,
  selectUserFeedInMyPageByOption
};