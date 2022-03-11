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
      WHERE Follow.fromIdx = ? AND User.isWithdraw = 'N' AND Follow.status = 'Y';
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
      SELECT F.toIdx, nickName, profileImgUrl,
             CASE
               WHEN F.toIdx = ? THEN '자기 자신'
               WHEN (M.status IS NULL) OR (M.status = 'N') THEN '팔로잉 비활성화중'
               WHEN M.status = 'Y' THEN '팔로잉 활성화중'
               END AS followStatus
      FROM Follow AS F
             INNER JOIN User AS U ON F.toIdx = U.idx AND U.isWithdraw = 'N'
             LEFT JOIN (
        SELECT toIdx, status
        FROM Follow
        WHERE Follow.fromIdx = ?
      ) AS M ON M.toIdx = F.toIdx
      WHERE F.fromIdx = ? AND F.status = 'Y';
    `;
    params = [myIdx, myIdx, userIdx];
  } else {
    selectOtherFollowQuery = `
      SELECT fromIdx, nickName, profileImgUrl,
             CASE
               WHEN F.fromIdx = ? THEN '자기 자신'
               WHEN (M.status IS NULL) OR (M.status = 'N') THEN '팔로잉 비활성화중'
               WHEN M.status = 'Y' THEN '팔로잉 활성화중'
               END AS followStatus
      FROM Follow AS F
             INNER JOIN User AS U ON F.fromIdx = U.idx AND U.isWithdraw = 'N'
             LEFT JOIN (
        SELECT toIdx, status
        FROM Follow
        WHERE Follow.fromIdx = ?
      ) AS M ON M.toIdx = F.fromIdx
      WHERE F.toIdx = ? AND F.status = 'Y';
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

async function selectUserFeedInMyPageByOption(connection, [userIdx, option, start, pageSize]) {
  let selectUserFeedInMyPageByOptionQuery = '';

  if (option === "내여행") {
    selectUserFeedInMyPageByOptionQuery = `
      SELECT travelIdx, userIdx, travelTitle, travelIntroduce,
             travelStatus, travelThumnail,
             travelScore, travelHashtag, travelCreatedAt
      FROM (
             SELECT Travel.idx AS travelIdx, userIdx,
                    title AS travelTitle, introduce AS travelIntroduce,
                    CASE
                      WHEN Travel.status = 'PUBLIC' THEN '공개'
                      WHEN Travel.status = 'PRIVATE' THEN '비공개'
                      ELSE '삭제됨'
                      END AS travelStatus,
                    IF(TH.thumImgUrl IS NULL, '썸네일 없음', TH.thumImgUrl) AS travelThumnail,
                    CASE
                      WHEN TS.score IS NULL THEN "점수 없음"
                      WHEN TS.score < 2.0 THEN "별로에요"
                      WHEN TS.score < 3.0 THEN "도움되지 않았어요"
                      WHEN TS.score < 4.0 THEN "그저 그래요"
                      WHEN TS.score < 4.5 THEN "도움되었어요!"
                      ELSE "최고의 여행!"
                      END AS travelScore, IF(TG.content IS NULL, '해시태그 없음', GROUP_CONCAT(CONCAT('#', TG.content) SEPARATOR ' ')) AS travelHashtag,
                    CASE
                      WHEN TIMESTAMPDIFF(SECOND, Travel.createdAt, NOW()) <= 0 THEN CONCAT(TIMESTAMPDIFF(SECOND, Travel.createdAt, NOW()), '방금 전')
                      WHEN TIMESTAMPDIFF(SECOND, Travel.createdAt, NOW()) < 60 THEN CONCAT(TIMESTAMPDIFF(SECOND, Travel.createdAt, NOW()), '초 전')
                      WHEN TIMESTAMPDIFF(MINUTE, Travel.createdAt, NOW()) < 60 THEN CONCAT(TIMESTAMPDIFF(MINUTE, Travel.createdAt, NOW()), '분 전')
                      WHEN TIMESTAMPDIFF(HOUR, Travel.createdAt, NOW()) < 24 THEN CONCAT(TIMESTAMPDIFF(HOUR, Travel.createdAt, NOW()), '시간 전')
                      WHEN TIMESTAMPDIFF(DAY, Travel.createdAt, NOW()) < 30 THEN CONCAT(TIMESTAMPDIFF(DAY, Travel.createdAt, NOW()), '일 전')
                      WHEN TIMESTAMPDIFF(MONTH, Travel.createdAt, NOW()) < 12 THEN CONCAT(TIMESTAMPDIFF(MONTH, Travel.createdAt, NOW()), '달 전')
                      ELSE CONCAT(TIMESTAMPDIFF(YEAR, Travel.createdAt, NOW()), '년 전')
                      END AS travelCreatedAt, Travel.createdAt AS tc
             FROM Travel
                    LEFT JOIN (
               SELECT TravelScore.travelIdx, AVG(score) AS score
               FROM TravelScore
                      INNER JOIN Travel ON TravelScore.travelIdx = Travel.idx AND Travel.status != 'DELETED'
            INNER JOIN User ON TravelScore.userIdx = User.idx AND User.isWithdraw = 'N'
               GROUP BY TravelScore.travelIdx
             ) AS TS ON TS.travelIdx = Travel.idx
                    LEFT JOIN (
               SELECT travelIdx, thumImgUrl
               FROM TravelThumnail
               GROUP BY TravelIdx
               HAVING MIN(TravelThumnail.idx)
             ) AS TH ON TH.travelIdx = Travel.idx
                    LEFT JOIN (
               SELECT travelIdx, hashtagIdx, content
               FROM TravelHashtag
                      INNER JOIN Hashtag ON TravelHashtag.hashtagIdx = Hashtag.idx
               WHERE TravelHashtag.status = 'Y'
             ) AS TG ON TG.travelIdx = Travel.idx
             WHERE Travel.userIdx = ? AND Travel.status != 'DELETED'
             GROUP BY Travel.idx
           ) AS A
      ORDER BY A.tc DESC
      LIMIT ?, ?;
    `;
    const [selectUserFeedInMyPageByOptionRow] = await connection.query(selectUserFeedInMyPageByOptionQuery, [userIdx, start, pageSize]);
    return selectUserFeedInMyPageByOptionRow;
  }
  else if (option === "좋아요") {
    selectUserFeedInMyPageByOptionQuery = `
      SELECT travelIdx, userIdx, travelLikeStatus, travelTitle, travelIntroduce,
             travelThumnail, travelScore, travelHashtag, travelCreatedAt
      FROM (
             SELECT TravelLike.travelIdx, T.userIdx,
                    TravelLike.status AS travelLikeStatus, T.title AS travelTitle,
                    T.introduce AS travelIntroduce, IF(TH.thumImgUrl IS NULL, '썸네일 없음', TH.thumImgUrl) AS travelThumnail,
                    CASE
                      WHEN TS.score IS NULL THEN "점수 없음"
                      WHEN TS.score < 2.0 THEN "별로에요"
                      WHEN TS.score < 3.0 THEN "도움되지 않았어요"
                      WHEN TS.score < 4.0 THEN "그저 그래요"
                      WHEN TS.score < 4.5 THEN "도움되었어요!"
                      ELSE "최고의 여행!"
                      END AS travelScore,  IF(TG.content IS NULL, '해시태그 없음', GROUP_CONCAT(CONCAT('#', TG.content) SEPARATOR ' ')) AS travelHashtag,
                    CASE
                      WHEN TIMESTAMPDIFF(SECOND, T.createdAt, NOW()) <= 0 THEN CONCAT(TIMESTAMPDIFF(SECOND, T.createdAt, NOW()), '방금 전')
                      WHEN TIMESTAMPDIFF(SECOND, T.createdAt, NOW()) < 60 THEN CONCAT(TIMESTAMPDIFF(SECOND, T.createdAt, NOW()), '초 전')
                      WHEN TIMESTAMPDIFF(MINUTE, T.createdAt, NOW()) < 60 THEN CONCAT(TIMESTAMPDIFF(MINUTE, T.createdAt, NOW()), '분 전')
                      WHEN TIMESTAMPDIFF(HOUR, T.createdAt, NOW()) < 24 THEN CONCAT(TIMESTAMPDIFF(HOUR, T.createdAt, NOW()), '시간 전')
                      WHEN TIMESTAMPDIFF(DAY, T.createdAt, NOW()) < 30 THEN CONCAT(TIMESTAMPDIFF(DAY, T.createdAt, NOW()), '일 전')
                      WHEN TIMESTAMPDIFF(MONTH, T.createdAt, NOW()) < 12 THEN CONCAT(TIMESTAMPDIFF(MONTH, T.createdAt, NOW()), '달 전')
                      ELSE CONCAT(TIMESTAMPDIFF(YEAR, T.createdAt, NOW()), '년 전')
                      END AS travelCreatedAt, TravelLike.createdAt AS likeCreatedAt
             FROM TravelLike
                    INNER JOIN Travel AS T ON TravelLike.travelIdx = T.idx AND T.status = 'PUBLIC'
                    LEFT JOIN (
               SELECT TravelScore.travelIdx, AVG(score) AS score
               FROM TravelScore
                      INNER JOIN Travel ON TravelScore.travelIdx = Travel.idx AND Travel.status != 'DELETED'
            INNER JOIN User ON TravelScore.userIdx = User.idx AND User.isWithdraw = 'N'
               GROUP BY TravelScore.travelIdx
             ) AS TS ON TS.travelIdx = TravelLike.travelIdx
                    LEFT JOIN (
               SELECT travelIdx, thumImgUrl
               FROM TravelThumnail
               GROUP BY TravelIdx
               HAVING MIN(TravelThumnail.idx)
             ) AS TH ON TH.travelIdx = TravelLike.travelIdx
                    LEFT JOIN (
               SELECT travelIdx, hashtagIdx, content
               FROM TravelHashtag
                      INNER JOIN Hashtag ON TravelHashtag.hashtagIdx = Hashtag.idx
               WHERE TravelHashtag.status = 'Y'
             ) AS TG ON TG.travelIdx = TravelLike.travelIdx
             WHERE TravelLike.userIdx = ? AND TravelLike.status = 'Y'
             GROUP BY TravelLike.travelIdx
           ) AS A
      ORDER BY A.likeCreatedAt DESC
      LIMIT ?, ?;  
      `;
    const [selectUserFeedInMyPageByOptionRow] = await connection.query(selectUserFeedInMyPageByOptionQuery, [userIdx, start, pageSize]);
    return selectUserFeedInMyPageByOptionRow;
  }
}

async function selectTotalUserFeedInMyPageByOption(connection, [userIdx, option]) {
  let selectTotalUserFeedInMyPageByOptionQuery = "";

  if (option === "내여행") {
    selectTotalUserFeedInMyPageByOptionQuery = `
      SELECT COUNT(idx) AS totalCount
      FROM Travel
      WHERE userIdx = ? AND status != 'DELETED'
    `;
  }
  else if (option === "좋아요") {
    selectTotalUserFeedInMyPageByOptionQuery = `
      SELECT COUNT(travelIdx) AS totalCount
      FROM TravelLike
             INNER JOIN Travel ON TravelLike.travelIdx = Travel.idx AND Travel.status = 'PUBLIC'
             INNER JOIN User ON TravelLike.userIdx = User.idx AND User.isWithdraw = 'N'
      WHERE TravelLike.userIdx = ? AND TravelLike.status = 'Y';
    `;
  }
  const [selectTotalUserFeedInMyPageByOptionRow] = await connection.query(selectTotalUserFeedInMyPageByOptionQuery, userIdx);
  return selectTotalUserFeedInMyPageByOptionRow;
}

async function selectOtherInfoInProfile(connection, [myIdx, userIdx]) {
  const selectOtherInfoInProfileQuery = `
    SELECT profileImgUrl, nickName, followingCount, followerCount,
           IF(followStatus = 'Y', '팔로우 하는중', '팔로우 안하는중') AS followStatus
    FROM (
           SELECT profileImgUrl, nickName,
                  (SELECT COUNT(toIdx)
                   FROM Follow
                          INNER JOIN User ON Follow.toIdx = User.idx AND Follow.fromIdx = ? AND User.isWithdraw = 'N' AND Follow.status = 'Y') AS followingCount,
                  (SELECT COUNT(fromIdx)
                   FROM Follow
                          INNER JOIN User ON Follow.fromIdx = User.idx AND Follow.toIdx = ? AND User.isWithdraw = 'N' AND Follow.status = 'Y') AS followerCount,
                  (SELECT status
                   FROM Follow
                   WHERE fromIdx = ? AND toIdx = ?) AS followStatus
           FROM User
           WHERE User.idx = ? AND User.isWithdraw = 'N'
         ) AS A;
  `;
  const [selectOtherInfoInProfileRow] = await connection.query(selectOtherInfoInProfileQuery, [userIdx, userIdx, myIdx, userIdx, userIdx]);
  return selectOtherInfoInProfileRow;
}

async function selectTotalUserFeed(connection, userIdx) {
  const selectTotalUserFeedQuery = `
    SELECT COUNT(idx) AS totalCount
    FROM Travel
    WHERE userIdx = ? AND status = 'PUBLIC';
  `;
  const [selectTotalUserFeedRow] = await connection.query(selectTotalUserFeedQuery, userIdx);
  return selectTotalUserFeedRow;
}

async function selectOtherFeedInProfile(connection, [myIdx, userIdx, start, pageSize]) {
  const selectOtherFeedInProfileQuery = `
    SELECT travelIdx, userIdx, travelTitle,
           travelIntroduce, travelHashtag, likeStatus,
           thumImgUrl, travelScore,
           CASE
             WHEN TIMESTAMPDIFF(SECOND, createdAt, NOW()) <= 0 THEN CONCAT(TIMESTAMPDIFF(SECOND, createdAt, NOW()), '방금 전')
             WHEN TIMESTAMPDIFF(SECOND, createdAt, NOW()) < 60 THEN CONCAT(TIMESTAMPDIFF(SECOND, createdAt, NOW()), '초 전')
             WHEN TIMESTAMPDIFF(MINUTE, createdAt, NOW()) < 60 THEN CONCAT(TIMESTAMPDIFF(MINUTE, createdAt, NOW()), '분 전')
             WHEN TIMESTAMPDIFF(HOUR, createdAt, NOW()) < 24 THEN CONCAT(TIMESTAMPDIFF(HOUR, createdAt, NOW()), '시간 전')
             WHEN TIMESTAMPDIFF(DAY, createdAt, NOW()) < 30 THEN CONCAT(TIMESTAMPDIFF(DAY, createdAt, NOW()), '일 전')
             WHEN TIMESTAMPDIFF(MONTH, createdAt, NOW()) < 12 THEN CONCAT(TIMESTAMPDIFF(MONTH, createdAt, NOW()), '달 전')
             ELSE CONCAT(TIMESTAMPDIFF(YEAR, createdAt, NOW()), '년 전')
             END AS travelCreatedAt
    FROM (
           SELECT Travel.idx AS travelIdx, Travel.userIdx,
                  title AS travelTitle, introduce AS travelIntroduce,
                  IF(TG.content IS NULL, '해시태그 없음', GROUP_CONCAT(CONCAT('#', TG.content) SEPARATOR ' ')) AS travelHashtag,
                  Travel.createdAt AS createdAt, IF(likeStatus = 'Y', '좋아요 하는중', '좋아요 안하는중') AS likeStatus,
                  thumImgUrl,
                  CASE
                    WHEN TS.score IS NULL THEN "점수 없음"
                    WHEN TS.score < 2.0 THEN "별로에요"
                    WHEN TS.score < 3.0 THEN "도움되지 않았어요"
                    WHEN TS.score < 4.0 THEN "그저 그래요"
                    WHEN TS.score < 4.5 THEN "도움되었어요!"
                    ELSE "최고의 여행!"
                    END AS travelScore
           FROM Travel
                  LEFT JOIN (
             SELECT travelIdx, hashtagIdx, content
             FROM TravelHashtag
                    INNER JOIN Hashtag ON TravelHashtag.hashtagIdx = Hashtag.idx
             WHERE TravelHashtag.status = 'Y'
           ) AS TG ON TG.travelIdx = Travel.idx
                  LEFT JOIN (
             SELECT travelIdx, TravelLike.userIdx, TravelLike.status AS likeStatus
             FROM TravelLike
                    INNER JOIN Travel ON Travel.idx = TravelLike.travelIdx AND Travel.status = 'PUBLIC'
                    INNER JOIN User ON User.idx = TravelLike.userIdx AND User.isWithdraw = 'N'
             WHERE TravelLike.userIdx = ?
           ) AS TL ON Travel.idx = TL.travelIdx
                  LEFT JOIN (
             SELECT travelIdx, thumImgUrl
             FROM TravelThumnail
             GROUP BY TravelIdx
             HAVING MIN(TravelThumnail.idx)
           ) AS TH ON TH.travelIdx = Travel.idx
                  LEFT JOIN (
             SELECT TravelScore.travelIdx, AVG(score) AS score
             FROM TravelScore
                    INNER JOIN Travel ON TravelScore.travelIdx = Travel.idx AND Travel.status != 'DELETED'
            INNER JOIN User ON TravelScore.userIdx = User.idx AND User.isWithdraw = 'N'
             GROUP BY TravelScore.travelIdx
           ) AS TS ON TS.travelIdx = Travel.idx
           WHERE Travel.userIdx = ? AND Travel.status = 'PUBLIC'
           GROUP BY Travel.idx
         ) AS A
    ORDER BY A.createdAt DESC
    LIMIT ?, ?;
  `;
  const [selectOtherFeedInProfileRow] = await connection.query(selectOtherFeedInProfileQuery, [myIdx, userIdx, start, pageSize]);
  return selectOtherFeedInProfileRow;
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
  selectUserFeedInMyPageByOption,
  selectTotalUserFeedInMyPageByOption,
  selectOtherInfoInProfile,
  selectTotalUserFeed,
  selectOtherFeedInProfile
};