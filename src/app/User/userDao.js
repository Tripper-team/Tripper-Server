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
      WHERE F.fromIdx = ? AND F.status = 'Y'
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
      ORDER BY temp.createdAt DESC
      LIMIT ?, ?;
    `;
    const [selectUserFeedInMyPageByOptionRow] = await connection.query(selectUserFeedInMyPageByOptionQuery, [userIdx, start, pageSize]);
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
             WHERE TravelLike.userIdx = ? AND TravelLike.status = 'Y'
             GROUP BY TravelLike.travelIdx
           ) AS temp
      ORDER BY temp.createdAt DESC 
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
      SELECT COUNT(*) AS totalCount
      FROM (
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
            ORDER BY temp.createdAt DESC
               ) AS A;
    `;
  }
  else if (option === "좋아요") {
    selectTotalUserFeedInMyPageByOptionQuery = `
      SELECT COUNT(*) AS totalCount
FROM (
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
                    INNER JOIN Travel AS T ON TravelLike.travelIdx = T.idx AND T.status = 'PUBLIC'
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
             WHERE TravelLike.userIdx = ? AND TravelLike.status = 'Y'
             GROUP BY TravelLike.travelIdx
           ) AS temp
      ORDER BY temp.createdAt DESC
         ) AS A;  
    `;
  }
  const [selectTotalUserFeedInMyPageByOptionRow] = await connection.query(selectTotalUserFeedInMyPageByOptionQuery, userIdx);
  return selectTotalUserFeedInMyPageByOptionRow;
}

async function selectOtherInfoInProfile(connection, [myIdx, userIdx]) {
  const selectOtherInfoInProfileQuery = `
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
    WHERE User.idx = ? AND User.isWithdraw = 'N';
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
    SELECT travelIdx, travelTitle, travelIntroduce, travelHashtag, travelScore, likeStatus, thumImgUrl, createdAt
    FROM (
           SELECT T.idx AS travelIdx,
                  T.title AS travelTitle, T.introduce AS travelIntroduce,
                  GROUP_CONCAT(CONCAT('#', TH.content) SEPARATOR ' ') AS travelHashtag,
                  CASE
                    WHEN TS.score IS NULL THEN null
                    WHEN TS.score < 2.0 THEN "별로에요"
                    WHEN TS.score < 3.0 THEN "도움되지 않았어요"
                    WHEN TS.score < 4.0 THEN "그저 그래요"
                    WHEN TS.score < 4.5 THEN "도움되었어요!"
                    ELSE "최고의 여행!"
                    END AS travelScore, IF(likeStatus = 'Y', "좋아요 중", "좋아요 안하는중") AS likeStatus, thumImgUrl, T.createdAt AS createdAt
           FROM Travel AS T
                  LEFT JOIN (
             SELECT TravelHashtag.travelIdx AS hashTravelIdx, content
             FROM TravelHashtag
                    INNER JOIN Hashtag ON Hashtag.idx = TravelHashtag.hashtagIdx
             WHERE TravelHashtag.status = 'Y'
           ) AS TH ON T.idx = TH.hashTravelIdx
                  LEFT JOIN (
             SELECT TravelScore.travelIdx, AVG(score) AS score
             FROM TravelScore
                    INNER JOIN User ON TravelScore.userIdx = User.idx AND User.isWithdraw = 'N'
             GROUP BY TravelScore.travelIdx
           ) AS TS ON TS.travelIdx = TH.hashTravelIdx
                  LEFT JOIN (
             SELECT TravelLike.travelIdx, status AS likeStatus
             FROM TravelLike
             WHERE userIdx = ?
           ) AS TL ON TL.travelIdx = TS.travelIdx
                  LEFT JOIN (
             SELECT TravelThumnail.idx, travelIdx, thumImgUrl
             FROM TravelThumnail
             GROUP BY travelIdx HAVING MIN(TravelThumnail.idx)
           ) AS TM ON TL.travelIdx = TM.travelIdx
           WHERE T.userIdx = ? AND T.status = 'PUBLIC'
           GROUP BY T.idx
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