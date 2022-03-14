async function selectMainPageByOption(connection, [userIdx, option, start, pageSize]) {
    let selectMainPageByOptionQuery;

    switch(option)
    {
        case '최신순':
            selectMainPageByOptionQuery = `
                SELECT travelIdx, userIdx, nickName,
                       profileImgUrl, title, introduce,
                       myLikeStatus, thumImgUrl, travelScore,
                       CASE
                           WHEN TIMESTAMPDIFF(SECOND, travelCreatedAt, NOW()) <= 0 THEN CONCAT(TIMESTAMPDIFF(SECOND, travelCreatedAt, NOW()), '방금 전')
                           WHEN TIMESTAMPDIFF(SECOND, travelCreatedAt, NOW()) < 60 THEN CONCAT(TIMESTAMPDIFF(SECOND, travelCreatedAt, NOW()), '초 전')
                           WHEN TIMESTAMPDIFF(MINUTE, travelCreatedAt, NOW()) < 60 THEN CONCAT(TIMESTAMPDIFF(MINUTE, travelCreatedAt, NOW()), '분 전')
                           WHEN TIMESTAMPDIFF(HOUR, travelCreatedAt, NOW()) < 24 THEN CONCAT(TIMESTAMPDIFF(HOUR, travelCreatedAt, NOW()), '시간 전')
                           WHEN TIMESTAMPDIFF(DAY, travelCreatedAt, NOW()) < 30 THEN CONCAT(TIMESTAMPDIFF(DAY, travelCreatedAt, NOW()), '일 전')
                           WHEN TIMESTAMPDIFF(MONTH, travelCreatedAt, NOW()) < 12 THEN CONCAT(TIMESTAMPDIFF(MONTH, travelCreatedAt, NOW()), '달 전')
                           ELSE CONCAT(TIMESTAMPDIFF(YEAR, travelCreatedAt, NOW()), '년 전')
                           END AS travelCreatedAt, travelHashtag
                FROM (
                         SELECT T.idx AS travelIdx, T.userIdx,
                                nickName, profileImgUrl, title, introduce,
                                IF(L.status = 'Y', '좋아요 하는중', '좋아요 안하는중') AS myLikeStatus, thumImgUrl,
                                CASE
                                    WHEN travelScore IS NULL THEN "점수 없음"
                                    WHEN travelScore < 2.0 THEN "별로에요"
                                    WHEN travelScore < 3.0 THEN "도움되지 않았어요"
                                    WHEN travelScore < 4.0 THEN "그저 그래요"
                                    WHEN travelScore < 4.5 THEN "도움되었어요!"
                                    ELSE "최고의 여행!"
                                    END AS travelScore, T.createdAt AS travelCreatedAt, T.createdAt AS tcreatedAt,
                                IF(H.content IS NULL, '해시태그 없음', GROUP_CONCAT(CONCAT('#', H.content) SEPARATOR ' ')) AS travelHashtag
                         FROM Travel AS T
                                  INNER JOIN User ON T.userIdx = User.idx AND User.isWithdraw = 'N'
                                  LEFT JOIN (
                             SELECT travelIdx, TravelLike.userIdx, TravelLike.status
                             FROM TravelLike
                                      INNER JOIN Travel ON TravelLike.travelIdx = Travel.idx AND Travel.status = 'PUBLIC'
                             WHERE TravelLike.userIdx = ?
                         ) AS L ON L.travelIdx = T.idx
                                  LEFT JOIN (
                             SELECT travelIdx, thumImgUrl
                             FROM TravelThumnail
                                      INNER JOIN Travel ON Travel.idx = TravelThumnail.travelIdx
                             GROUP BY TravelIdx
                             HAVING MIN(TravelThumnail.idx)
                         ) AS TH ON TH.travelIdx = T.idx
                                  LEFT JOIN (
                             SELECT TravelScore.travelIdx, AVG(score) AS travelScore
                             FROM TravelScore
                                      INNER JOIN Travel ON TravelScore.travelIdx = Travel.idx AND Travel.status != 'DELETED'
            INNER JOIN User ON TravelScore.userIdx = User.idx AND User.isWithdraw = 'N'
                             GROUP BY TravelScore.travelIdx
                         ) AS S ON S.travelIdx = T.idx
                                  LEFT JOIN (
                             SELECT travelIdx, hashtagIdx, content
                             FROM TravelHashtag
                                      INNER JOIN Hashtag ON TravelHashtag.hashtagIdx = Hashtag.idx
                             WHERE TravelHashtag.status = 'Y'
                         ) AS H ON H.travelIdx = T.idx
                         WHERE T.status = 'PUBLIC'
                         GROUP BY T.idx
                     ) AS A
                ORDER BY tcreatedAt DESC
                LIMIT ?, ?;
            `;
            const [selectMainPageByRecentRow] = await connection.query(selectMainPageByOptionQuery, [userIdx, start, pageSize]);
            return selectMainPageByRecentRow;
        case '인기순':
            selectMainPageByOptionQuery = `
                SELECT travelIdx, userIdx, nickName,
       profileImgUrl, title, introduce, travelScore,
       thumImgUrl, myLikeStatus, travelHashtag,
       CASE
         WHEN TIMESTAMPDIFF(SECOND, travelCreatedAt, NOW()) <= 0 THEN CONCAT(TIMESTAMPDIFF(SECOND, travelCreatedAt, NOW()), '방금 전')
         WHEN TIMESTAMPDIFF(SECOND, travelCreatedAt, NOW()) < 60 THEN CONCAT(TIMESTAMPDIFF(SECOND, travelCreatedAt, NOW()), '초 전')
         WHEN TIMESTAMPDIFF(MINUTE, travelCreatedAt, NOW()) < 60 THEN CONCAT(TIMESTAMPDIFF(MINUTE, travelCreatedAt, NOW()), '분 전')
         WHEN TIMESTAMPDIFF(HOUR, travelCreatedAt, NOW()) < 24 THEN CONCAT(TIMESTAMPDIFF(HOUR, travelCreatedAt, NOW()), '시간 전')
         WHEN TIMESTAMPDIFF(DAY, travelCreatedAt, NOW()) < 30 THEN CONCAT(TIMESTAMPDIFF(DAY, travelCreatedAt, NOW()), '일 전')
         WHEN TIMESTAMPDIFF(MONTH, travelCreatedAt, NOW()) < 12 THEN CONCAT(TIMESTAMPDIFF(MONTH, travelCreatedAt, NOW()), '달 전')
         ELSE CONCAT(TIMESTAMPDIFF(YEAR, travelCreatedAt, NOW()), '년 전')
         END AS travelCreatedAt
FROM (
     SELECT T.idx AS travelIdx, T.userIdx, nickName,
       profileImgUrl, title, introduce,
       IF(travelLikeCount IS NULL, 0, travelLikeCount) AS travelLikeCount,
       CASE
        WHEN travelScore IS NULL THEN "점수 없음"
        WHEN travelScore < 2.0 THEN "별로에요"
        WHEN travelScore < 3.0 THEN "도움되지 않았어요"
        WHEN travelScore < 4.0 THEN "그저 그래요"
        WHEN travelScore < 4.5 THEN "도움되었어요!"
        ELSE "최고의 여행!"
        END AS travelScore, thumImgUrl, IF(L.status = 'Y', '좋아요 하는중', '좋아요 안하는중') AS myLikeStatus,
       IF(H.content IS NULL, '해시태그 없음', GROUP_CONCAT(CONCAT('#', H.content) SEPARATOR ' ')) AS travelHashtag,
       T.createdAt AS travelCreatedAt, T.createdAt AS tcreatedAt
FROM Travel AS T
    INNER JOIN User ON T.userIdx = User.idx AND User.isWithdraw = 'N'
    LEFT JOIN (
        SELECT travelIdx, COUNT(userIdx) AS travelLikeCount
        FROM TravelLike
        WHERE TravelLike.status = 'Y'
        GROUP BY travelIdx
    ) AS LC ON T.idx = LC.travelIdx
    LEFT JOIN (
        SELECT travelIdx, hashtagIdx, content
        FROM TravelHashtag
            INNER JOIN Hashtag ON TravelHashtag.hashtagIdx = Hashtag.idx
        WHERE TravelHashtag.status = 'Y'
    ) AS H ON H.travelIdx = T.idx
    LEFT JOIN (
        SELECT TravelScore.travelIdx, AVG(score) AS travelScore
        FROM TravelScore
            INNER JOIN Travel ON TravelScore.travelIdx = Travel.idx AND Travel.status != 'DELETED'
            INNER JOIN User ON TravelScore.userIdx = User.idx AND User.isWithdraw = 'N'
        GROUP BY TravelScore.travelIdx
    ) AS S ON S.travelIdx = T.idx
    LEFT JOIN (
        SELECT travelIdx, thumImgUrl
        FROM TravelThumnail
            INNER JOIN Travel ON Travel.idx = TravelThumnail.travelIdx
        GROUP BY TravelIdx
        HAVING MIN(TravelThumnail.idx)
    ) AS TH ON TH.travelIdx = T.idx
    LEFT JOIN (
        SELECT travelIdx, TravelLike.userIdx, TravelLike.status
        FROM TravelLike
            INNER JOIN Travel ON TravelLike.travelIdx = Travel.idx AND Travel.status = 'PUBLIC'
        WHERE TravelLike.userIdx = ?
    ) AS L ON L.travelIdx = T.idx
WHERE T.status = 'PUBLIC'
GROUP BY T.idx
         ) AS A
ORDER BY travelLikeCount DESC, tcreatedAt DESC
LIMIT ?, ?;    
            `;
            const [selectMainPageByLikeRow] = await connection.query(selectMainPageByOptionQuery, [userIdx, start, pageSize]);
            return selectMainPageByLikeRow;
        case '팔로우':
            selectMainPageByOptionQuery = `
                SELECT travelIdx, userIdx, nickName,
                       profileImgUrl, title, introduce, travelScore,
                       thumImgUrl, myLikeStatus, travelHashtag,
                       CASE
                           WHEN TIMESTAMPDIFF(SECOND, travelCreatedAt, NOW()) <= 0 THEN CONCAT(TIMESTAMPDIFF(SECOND, travelCreatedAt, NOW()), '방금 전')
                           WHEN TIMESTAMPDIFF(SECOND, travelCreatedAt, NOW()) < 60 THEN CONCAT(TIMESTAMPDIFF(SECOND, travelCreatedAt, NOW()), '초 전')
                           WHEN TIMESTAMPDIFF(MINUTE, travelCreatedAt, NOW()) < 60 THEN CONCAT(TIMESTAMPDIFF(MINUTE, travelCreatedAt, NOW()), '분 전')
                           WHEN TIMESTAMPDIFF(HOUR, travelCreatedAt, NOW()) < 24 THEN CONCAT(TIMESTAMPDIFF(HOUR, travelCreatedAt, NOW()), '시간 전')
                           WHEN TIMESTAMPDIFF(DAY, travelCreatedAt, NOW()) < 30 THEN CONCAT(TIMESTAMPDIFF(DAY, travelCreatedAt, NOW()), '일 전')
                           WHEN TIMESTAMPDIFF(MONTH, travelCreatedAt, NOW()) < 12 THEN CONCAT(TIMESTAMPDIFF(MONTH, travelCreatedAt, NOW()), '달 전')
                           ELSE CONCAT(TIMESTAMPDIFF(YEAR, travelCreatedAt, NOW()), '년 전')
                           END AS travelCreatedAt
                FROM (
                         SELECT T.idx AS travelIdx, T.userIdx, nickName,
                                profileImgUrl, title, introduce,
                                CASE
                                    WHEN travelScore IS NULL THEN "점수 없음"
                                    WHEN travelScore < 2.0 THEN "별로에요"
                                    WHEN travelScore < 3.0 THEN "도움되지 않았어요"
                                    WHEN travelScore < 4.0 THEN "그저 그래요"
                                    WHEN travelScore < 4.5 THEN "도움되었어요!"
                                    ELSE "최고의 여행!"
                                    END AS travelScore, thumImgUrl, IF(L.status = 'Y', '좋아요 하는중', '좋아요 안하는중') AS myLikeStatus,
                                IF(H.content IS NULL, '해시태그 없음', GROUP_CONCAT(CONCAT('#', H.content) SEPARATOR ' ')) AS travelHashtag,
                                T.createdAt AS travelCreatedAt, T.createdAt AS tcreatedAt
                         FROM Follow AS F
                                  INNER JOIN User ON User.idx = F.toIdx AND User.isWithdraw = 'N'
                                  LEFT JOIN Travel AS T ON T.userIdx = F.toIdx AND T.status = 'PUBLIC'
                                  LEFT JOIN (
                             SELECT travelIdx, thumImgUrl
                             FROM TravelThumnail
                                      INNER JOIN Travel ON Travel.idx = TravelThumnail.travelIdx
                             GROUP BY TravelIdx
                             HAVING MIN(TravelThumnail.idx)
                         ) AS TH ON TH.travelIdx = T.idx
                                  LEFT JOIN (
                             SELECT TravelScore.travelIdx, AVG(score) AS travelScore
                             FROM TravelScore
                                      INNER JOIN Travel ON TravelScore.travelIdx = Travel.idx AND Travel.status != 'DELETED'
            INNER JOIN User ON TravelScore.userIdx = User.idx AND User.isWithdraw = 'N'
                             GROUP BY TravelScore.travelIdx
                         ) AS S ON S.travelIdx = T.idx
                                  LEFT JOIN (
                             SELECT travelIdx, TravelLike.userIdx, TravelLike.status
                             FROM TravelLike
                                      INNER JOIN Travel ON TravelLike.travelIdx = Travel.idx AND Travel.status = 'PUBLIC'
                             WHERE TravelLike.userIdx = ?
                         ) AS L ON L.travelIdx = T.idx
                                  LEFT JOIN (
                             SELECT travelIdx, hashtagIdx, content
                             FROM TravelHashtag
                                      INNER JOIN Hashtag ON TravelHashtag.hashtagIdx = Hashtag.idx
                             WHERE TravelHashtag.status = 'Y'
                         ) AS H ON H.travelIdx = T.idx
                         WHERE F.fromIdx = ? AND F.status = 'Y'
                         GROUP BY T.idx
                     ) AS A
                ORDER BY tcreatedAt DESC
                LIMIT ?, ?;
            `;
            const [selectMainPageByFollowRow] = await connection.query(selectMainPageByOptionQuery, [userIdx, userIdx, start, pageSize]);
            return selectMainPageByFollowRow;
        default:
            break;
    }
}

async function selectMainPageResultCount(connection, [userIdx, option]) {
    let selectMainPageResultCountQuery = '';

    switch(option)
    {
        case '최신순':
            selectMainPageResultCountQuery = `
                SELECT COUNT(*) AS totalCount
                FROM (
                         SELECT travelIdx, userIdx, nickName,
                                profileImgUrl, title, introduce,
                                myLikeStatus, thumImgUrl, travelScore,
                                CASE
                                    WHEN TIMESTAMPDIFF(SECOND, travelCreatedAt, NOW()) <= 0 THEN CONCAT(TIMESTAMPDIFF(SECOND, travelCreatedAt, NOW()), '방금 전')
                                    WHEN TIMESTAMPDIFF(SECOND, travelCreatedAt, NOW()) < 60 THEN CONCAT(TIMESTAMPDIFF(SECOND, travelCreatedAt, NOW()), '초 전')
                                    WHEN TIMESTAMPDIFF(MINUTE, travelCreatedAt, NOW()) < 60 THEN CONCAT(TIMESTAMPDIFF(MINUTE, travelCreatedAt, NOW()), '분 전')
                                    WHEN TIMESTAMPDIFF(HOUR, travelCreatedAt, NOW()) < 24 THEN CONCAT(TIMESTAMPDIFF(HOUR, travelCreatedAt, NOW()), '시간 전')
                                    WHEN TIMESTAMPDIFF(DAY, travelCreatedAt, NOW()) < 30 THEN CONCAT(TIMESTAMPDIFF(DAY, travelCreatedAt, NOW()), '일 전')
                                    WHEN TIMESTAMPDIFF(MONTH, travelCreatedAt, NOW()) < 12 THEN CONCAT(TIMESTAMPDIFF(MONTH, travelCreatedAt, NOW()), '달 전')
                                    ELSE CONCAT(TIMESTAMPDIFF(YEAR, travelCreatedAt, NOW()), '년 전')
                                    END AS travelCreatedAt, travelHashtag
                         FROM (
                                  SELECT T.idx AS travelIdx, T.userIdx,
                                         nickName, profileImgUrl, title, introduce,
                                         IF(L.status = 'Y', '좋아요 하는중', '좋아요 안하는중') AS myLikeStatus, thumImgUrl,
                                         CASE
                                             WHEN travelScore IS NULL THEN "점수 없음"
                                             WHEN travelScore < 2.0 THEN "별로에요"
                                             WHEN travelScore < 3.0 THEN "도움되지 않았어요"
                                             WHEN travelScore < 4.0 THEN "그저 그래요"
                                             WHEN travelScore < 4.5 THEN "도움되었어요!"
                                             ELSE "최고의 여행!"
                                             END AS travelScore, T.createdAt AS travelCreatedAt, T.createdAt AS tcreatedAt,
                                         IF(H.content IS NULL, '해시태그 없음', GROUP_CONCAT(CONCAT('#', H.content) SEPARATOR ' ')) AS travelHashtag
                                  FROM Travel AS T
                                           INNER JOIN User ON T.userIdx = User.idx AND User.isWithdraw = 'N'
                                           LEFT JOIN (
                                      SELECT travelIdx, TravelLike.userIdx, TravelLike.status
                                      FROM TravelLike
                                               INNER JOIN Travel ON TravelLike.travelIdx = Travel.idx AND Travel.status = 'PUBLIC'
                                      WHERE TravelLike.userIdx = ?
                                  ) AS L ON L.travelIdx = T.idx
                                           LEFT JOIN (
                                      SELECT travelIdx, thumImgUrl
                                      FROM TravelThumnail
                                               INNER JOIN Travel ON Travel.idx = TravelThumnail.travelIdx
                                      GROUP BY TravelIdx
                                      HAVING MIN(TravelThumnail.idx)
                                  ) AS TH ON TH.travelIdx = T.idx
                                           LEFT JOIN (
                                      SELECT TravelScore.travelIdx, AVG(score) AS travelScore
                                      FROM TravelScore
                                               INNER JOIN Travel ON TravelScore.travelIdx = Travel.idx AND Travel.status != 'DELETED'
            INNER JOIN User ON TravelScore.userIdx = User.idx AND User.isWithdraw = 'N'
                                      GROUP BY TravelScore.travelIdx
                                  ) AS S ON S.travelIdx = T.idx
                                           LEFT JOIN (
                                      SELECT travelIdx, hashtagIdx, content
                                      FROM TravelHashtag
                                               INNER JOIN Hashtag ON TravelHashtag.hashtagIdx = Hashtag.idx
                                      WHERE TravelHashtag.status = 'Y'
                                  ) AS H ON H.travelIdx = T.idx
                                  WHERE T.status = 'PUBLIC'
                                  GROUP BY T.idx
                              ) AS A
                         ORDER BY tcreatedAt DESC
                         ) AS B;
            `;
            const [selectMainPageResultRecentCountRow] = await connection.query(selectMainPageResultCountQuery, userIdx);
            return selectMainPageResultRecentCountRow;
        case '인기순':
            selectMainPageResultCountQuery = `
                SELECT COUNT(*) AS totalCount
                FROM (
                         SELECT travelIdx, userIdx, nickName,
                                profileImgUrl, title, introduce, travelScore,
                                thumImgUrl, myLikeStatus, travelHashtag,
                                CASE
                                    WHEN TIMESTAMPDIFF(SECOND, travelCreatedAt, NOW()) <= 0 THEN CONCAT(TIMESTAMPDIFF(SECOND, travelCreatedAt, NOW()), '방금 전')
                                    WHEN TIMESTAMPDIFF(SECOND, travelCreatedAt, NOW()) < 60 THEN CONCAT(TIMESTAMPDIFF(SECOND, travelCreatedAt, NOW()), '초 전')
                                    WHEN TIMESTAMPDIFF(MINUTE, travelCreatedAt, NOW()) < 60 THEN CONCAT(TIMESTAMPDIFF(MINUTE, travelCreatedAt, NOW()), '분 전')
                                    WHEN TIMESTAMPDIFF(HOUR, travelCreatedAt, NOW()) < 24 THEN CONCAT(TIMESTAMPDIFF(HOUR, travelCreatedAt, NOW()), '시간 전')
                                    WHEN TIMESTAMPDIFF(DAY, travelCreatedAt, NOW()) < 30 THEN CONCAT(TIMESTAMPDIFF(DAY, travelCreatedAt, NOW()), '일 전')
                                    WHEN TIMESTAMPDIFF(MONTH, travelCreatedAt, NOW()) < 12 THEN CONCAT(TIMESTAMPDIFF(MONTH, travelCreatedAt, NOW()), '달 전')
                                    ELSE CONCAT(TIMESTAMPDIFF(YEAR, travelCreatedAt, NOW()), '년 전')
                                    END AS travelCreatedAt
                         FROM (
                                  SELECT T.idx AS travelIdx, T.userIdx, nickName,
                                         profileImgUrl, title, introduce,
                                         IF(travelLikeCount IS NULL, 0, travelLikeCount) AS travelLikeCount,
                                         CASE
                                             WHEN travelScore IS NULL THEN "점수 없음"
                                             WHEN travelScore < 2.0 THEN "별로에요"
                                             WHEN travelScore < 3.0 THEN "도움되지 않았어요"
                                             WHEN travelScore < 4.0 THEN "그저 그래요"
                                             WHEN travelScore < 4.5 THEN "도움되었어요!"
                                             ELSE "최고의 여행!"
                                             END AS travelScore, thumImgUrl, IF(L.status = 'Y', '좋아요 하는중', '좋아요 안하는중') AS myLikeStatus,
                                         IF(H.content IS NULL, '해시태그 없음', GROUP_CONCAT(CONCAT('#', H.content) SEPARATOR ' ')) AS travelHashtag,
                                         T.createdAt AS travelCreatedAt, T.createdAt AS tcreatedAt
                                  FROM Travel AS T
                                           INNER JOIN User ON T.userIdx = User.idx AND User.isWithdraw = 'N'
                                           LEFT JOIN (
                                      SELECT travelIdx, COUNT(userIdx) AS travelLikeCount
                                      FROM TravelLike
                                      WHERE TravelLike.status = 'Y'
                                      GROUP BY travelIdx
                                  ) AS LC ON T.idx = LC.travelIdx
                                           LEFT JOIN (
                                      SELECT travelIdx, hashtagIdx, content
                                      FROM TravelHashtag
                                               INNER JOIN Hashtag ON TravelHashtag.hashtagIdx = Hashtag.idx
                                      WHERE TravelHashtag.status = 'Y'
                                  ) AS H ON H.travelIdx = T.idx
                                           LEFT JOIN (
                                      SELECT TravelScore.travelIdx, AVG(score) AS travelScore
                                      FROM TravelScore
                                               INNER JOIN Travel ON TravelScore.travelIdx = Travel.idx AND Travel.status != 'DELETED'
            INNER JOIN User ON TravelScore.userIdx = User.idx AND User.isWithdraw = 'N'
                                      GROUP BY TravelScore.travelIdx
                                  ) AS S ON S.travelIdx = T.idx
                                           LEFT JOIN (
                                      SELECT travelIdx, thumImgUrl
                                      FROM TravelThumnail
                                               INNER JOIN Travel ON Travel.idx = TravelThumnail.travelIdx
                                      GROUP BY TravelIdx
                                      HAVING MIN(TravelThumnail.idx)
                                  ) AS TH ON TH.travelIdx = T.idx
                                           LEFT JOIN (
                                      SELECT travelIdx, TravelLike.userIdx, TravelLike.status
                                      FROM TravelLike
                                               INNER JOIN Travel ON TravelLike.travelIdx = Travel.idx AND Travel.status = 'PUBLIC'
                                      WHERE TravelLike.userIdx = ?
                                  ) AS L ON L.travelIdx = T.idx
                                  WHERE T.status = 'PUBLIC'
                                  GROUP BY T.idx
                              ) AS A
                         ORDER BY travelLikeCount DESC, tcreatedAt DESC
                         ) AS B;
            `;
            const [selectMainPageResultLikeCountRow] = await connection.query(selectMainPageResultCountQuery, userIdx);
            return selectMainPageResultLikeCountRow;
        case '팔로우':
            selectMainPageResultCountQuery = `
                SELECT travelIdx, userIdx, nickName,
                       profileImgUrl, title, introduce, travelScore,
                       thumImgUrl, myLikeStatus, travelHashtag,
                       CASE
                           WHEN TIMESTAMPDIFF(SECOND, travelCreatedAt, NOW()) <= 0 THEN CONCAT(TIMESTAMPDIFF(SECOND, travelCreatedAt, NOW()), '방금 전')
                           WHEN TIMESTAMPDIFF(SECOND, travelCreatedAt, NOW()) < 60 THEN CONCAT(TIMESTAMPDIFF(SECOND, travelCreatedAt, NOW()), '초 전')
                           WHEN TIMESTAMPDIFF(MINUTE, travelCreatedAt, NOW()) < 60 THEN CONCAT(TIMESTAMPDIFF(MINUTE, travelCreatedAt, NOW()), '분 전')
                           WHEN TIMESTAMPDIFF(HOUR, travelCreatedAt, NOW()) < 24 THEN CONCAT(TIMESTAMPDIFF(HOUR, travelCreatedAt, NOW()), '시간 전')
                           WHEN TIMESTAMPDIFF(DAY, travelCreatedAt, NOW()) < 30 THEN CONCAT(TIMESTAMPDIFF(DAY, travelCreatedAt, NOW()), '일 전')
                           WHEN TIMESTAMPDIFF(MONTH, travelCreatedAt, NOW()) < 12 THEN CONCAT(TIMESTAMPDIFF(MONTH, travelCreatedAt, NOW()), '달 전')
                           ELSE CONCAT(TIMESTAMPDIFF(YEAR, travelCreatedAt, NOW()), '년 전')
                           END AS travelCreatedAt
                FROM (
                         SELECT T.idx AS travelIdx, T.userIdx, nickName,
                                profileImgUrl, title, introduce,
                                CASE
                                    WHEN travelScore IS NULL THEN "점수 없음"
                                    WHEN travelScore < 2.0 THEN "별로에요"
                                    WHEN travelScore < 3.0 THEN "도움되지 않았어요"
                                    WHEN travelScore < 4.0 THEN "그저 그래요"
                                    WHEN travelScore < 4.5 THEN "도움되었어요!"
                                    ELSE "최고의 여행!"
                                    END AS travelScore, thumImgUrl, IF(L.status = 'Y', '좋아요 하는중', '좋아요 안하는중') AS myLikeStatus,
                                IF(H.content IS NULL, '해시태그 없음', GROUP_CONCAT(CONCAT('#', H.content) SEPARATOR ' ')) AS travelHashtag,
                                T.createdAt AS travelCreatedAt, T.createdAt AS tcreatedAt
                         FROM Follow AS F
                                  INNER JOIN User ON User.idx = F.toIdx AND User.isWithdraw = 'N'
                                  LEFT JOIN Travel AS T ON T.userIdx = F.toIdx AND T.status = 'PUBLIC'
                                  LEFT JOIN (
                             SELECT travelIdx, thumImgUrl
                             FROM TravelThumnail
                                      INNER JOIN Travel ON Travel.idx = TravelThumnail.travelIdx
                             GROUP BY TravelIdx
                             HAVING MIN(TravelThumnail.idx)
                         ) AS TH ON TH.travelIdx = T.idx
                                  LEFT JOIN (
                             SELECT TravelScore.travelIdx, AVG(score) AS travelScore
                             FROM TravelScore
                                      INNER JOIN Travel ON TravelScore.travelIdx = Travel.idx AND Travel.status != 'DELETED'
            INNER JOIN User ON TravelScore.userIdx = User.idx AND User.isWithdraw = 'N'
                             GROUP BY TravelScore.travelIdx
                         ) AS S ON S.travelIdx = T.idx
                                  LEFT JOIN (
                             SELECT travelIdx, TravelLike.userIdx, TravelLike.status
                             FROM TravelLike
                                      INNER JOIN Travel ON TravelLike.travelIdx = Travel.idx AND Travel.status = 'PUBLIC'
                             WHERE TravelLike.userIdx = ?
                         ) AS L ON L.travelIdx = T.idx
                                  LEFT JOIN (
                             SELECT travelIdx, hashtagIdx, content
                             FROM TravelHashtag
                                      INNER JOIN Hashtag ON TravelHashtag.hashtagIdx = Hashtag.idx
                             WHERE TravelHashtag.status = 'Y'
                         ) AS H ON H.travelIdx = T.idx
                         WHERE F.fromIdx = ? AND F.status = 'Y'
                         GROUP BY T.idx
                     ) AS A
                ORDER BY tcreatedAt DESC;
            `;
            const [selectMainPageResultFollowCountRow] = await connection.query(selectMainPageResultCountQuery, [userIdx, userIdx]);
            return selectMainPageResultFollowCountRow;
    }
}

module.exports = {
    selectMainPageByOption,
    selectMainPageResultCount
};