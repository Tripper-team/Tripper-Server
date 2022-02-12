async function selectMainPageByOption(connection, [userIdx, option, start, pageSize]) {
    let selectMainPageByOptionQuery;

    switch(option)
    {
        case '최신순':
            selectMainPageByOptionQuery = `
                SELECT travelIdx, userIdx, nickName, profileImgUrl, title, introduce,
       myLikeStatus, travelHashtag, travelScore, thumImgUrl, createdAt
FROM (
        SELECT T.idx AS travelIdx, T.userIdx,
       nickName, profileImgUrl,
       title, introduce,
       IF(TL.status = 'Y', '좋아요 하는중', '좋아요 안하는중') AS myLikeStatus,
       IF(TH.content = '', NULL, GROUP_CONCAT(CONCAT('#', TH.content) SEPARATOR ' ')) AS travelHashtag,
       CASE
        WHEN travelScore IS NULL THEN "점수 없음"
        WHEN travelScore < 2.0 THEN "별로에요"
        WHEN travelScore < 3.0 THEN "도움되지 않았어요"
        WHEN travelScore < 4.0 THEN "그저 그래요"
        WHEN travelScore < 4.5 THEN "도움되었어요!"
        ELSE "최고의 여행!"
        END AS travelScore, thumImgUrl,
       CASE
        WHEN TIMESTAMPDIFF(SECOND, T.createdAt, NOW()) <= 0 THEN CONCAT(TIMESTAMPDIFF(SECOND, T.createdAt, NOW()), '방금 전')
        WHEN TIMESTAMPDIFF(SECOND, T.createdAt, NOW()) < 60 THEN CONCAT(TIMESTAMPDIFF(SECOND, T.createdAt, NOW()), '초 전')
        WHEN TIMESTAMPDIFF(MINUTE, T.createdAt, NOW()) < 60 THEN CONCAT(TIMESTAMPDIFF(MINUTE, T.createdAt, NOW()), '분 전')
        WHEN TIMESTAMPDIFF(HOUR, T.createdAt, NOW()) < 24 THEN CONCAT(TIMESTAMPDIFF(HOUR, T.createdAt, NOW()), '시간 전')
        WHEN TIMESTAMPDIFF(DAY, T.createdAt, NOW()) < 30 THEN CONCAT(TIMESTAMPDIFF(DAY, T.createdAt, NOW()), '일 전')
        WHEN TIMESTAMPDIFF(MONTH, T.createdAt, NOW()) < 12 THEN CONCAT(TIMESTAMPDIFF(MONTH, T.createdAt, NOW()), '달 전')
        ELSE CONCAT(TIMESTAMPDIFF(YEAR, T.createdAt, NOW()), '년 전')
        END AS createdAt
FROM Travel AS T
    INNER JOIN User ON T.userIdx = User.idx AND User.isWithdraw = 'N'
    LEFT JOIN (
        SELECT travelIdx, userIdx, status
        FROM TravelLike
        WHERE userIdx = ?
    ) AS TL ON TL.travelIdx = T.idx
    LEFT JOIN (
       SELECT travelIdx, AVG(score) AS travelScore
       FROM TravelScore
        INNER JOIN User
        ON TravelScore.userIdx = User.idx AND User.isWithdraw = 'N'
       GROUP BY travelIdx
    ) AS TS ON T.idx = TS.travelIdx
    LEFT JOIN (
        SELECT travelIdx, content
        FROM TravelHashtag
            INNER JOIN Hashtag
            ON Hashtag.idx = TravelHashtag.hashtagIdx
        WHERE TravelHashtag.status = 'Y'
    ) AS TH ON T.idx = TH.travelIdx
    LEFT JOIN (
        SELECT travelIdx, thumImgUrl
        FROM TravelThumnail
            LEFT JOIN Travel
            ON Travel.idx = TravelThumnail.travelIdx AND Travel.status = 'PUBLIC'
        GROUP BY travelIdx HAVING MIN(TravelThumnail.createdAt)
    ) AS TI ON TI.travelIdx = T.idx
WHERE T.status = 'PUBLIC'
GROUP BY T.idx
) AS A
ORDER BY A.createdAt DESC
LIMIT ?, ?;
            `;
            const [selectMainPageByRecentRow] = await connection.query(selectMainPageByOptionQuery, [userIdx, start, pageSize]);
            return selectMainPageByRecentRow;
        case '인기순':
            selectMainPageByOptionQuery = `
                
            `;
            break;
        case '팔로우':
            selectMainPageByOptionQuery = `
                SELECT *
FROM (
    SELECT T.idx AS travelIdx, F.toIdx AS userIdx, nickName,
       profileImgUrl, title, introduce,
       IF(TL.status = 'Y', '좋아요 하는중', '좋아요 안하는중') AS myLikeStatus,
       IF(TH.content = '', NULL, GROUP_CONCAT(CONCAT('#', TH.content) SEPARATOR ' ')) AS travelHashtag,
       CASE
        WHEN travelScore IS NULL THEN "점수 없음"
        WHEN travelScore < 2.0 THEN "별로에요"
        WHEN travelScore < 3.0 THEN "도움되지 않았어요"
        WHEN travelScore < 4.0 THEN "그저 그래요"
        WHEN travelScore < 4.5 THEN "도움되었어요!"
        ELSE "최고의 여행!"
        END AS travelScore, thumImgUrl,
       CASE
        WHEN TIMESTAMPDIFF(SECOND, T.createdAt, NOW()) <= 0 THEN CONCAT(TIMESTAMPDIFF(SECOND, T.createdAt, NOW()), '방금 전')
        WHEN TIMESTAMPDIFF(SECOND, T.createdAt, NOW()) < 60 THEN CONCAT(TIMESTAMPDIFF(SECOND, T.createdAt, NOW()), '초 전')
        WHEN TIMESTAMPDIFF(MINUTE, T.createdAt, NOW()) < 60 THEN CONCAT(TIMESTAMPDIFF(MINUTE, T.createdAt, NOW()), '분 전')
        WHEN TIMESTAMPDIFF(HOUR, T.createdAt, NOW()) < 24 THEN CONCAT(TIMESTAMPDIFF(HOUR, T.createdAt, NOW()), '시간 전')
        WHEN TIMESTAMPDIFF(DAY, T.createdAt, NOW()) < 30 THEN CONCAT(TIMESTAMPDIFF(DAY, T.createdAt, NOW()), '일 전')
        WHEN TIMESTAMPDIFF(MONTH, T.createdAt, NOW()) < 12 THEN CONCAT(TIMESTAMPDIFF(MONTH, T.createdAt, NOW()), '달 전')
        ELSE CONCAT(TIMESTAMPDIFF(YEAR, T.createdAt, NOW()), '년 전')
        END AS createdAt
FROM Follow AS F
    INNER JOIN User
        ON F.toIdx = User.idx AND User.isWithdraw = 'N'
    INNER JOIN Travel AS T
        ON T.userIdx = F.toIdx AND T.status = 'PUBLIC'
    LEFT JOIN (
        SELECT travelIdx, userIdx, status
        FROM TravelLike
        WHERE userIdx = ?
    ) AS TL ON TL.travelIdx = T.idx
    LEFT JOIN (
        SELECT travelIdx, content
        FROM TravelHashtag
            INNER JOIN Hashtag
            ON Hashtag.idx = TravelHashtag.hashtagIdx
        WHERE TravelHashtag.status = 'Y'
    ) AS TH ON T.idx = TH.travelIdx
    LEFT JOIN (
       SELECT travelIdx, AVG(score) AS travelScore
       FROM TravelScore
        INNER JOIN User
        ON TravelScore.userIdx = User.idx AND User.isWithdraw = 'N'
       GROUP BY travelIdx
    ) AS TS ON T.idx = TS.travelIdx
    LEFT JOIN (
        SELECT travelIdx, thumImgUrl
        FROM TravelThumnail
            LEFT JOIN Travel
            ON Travel.idx = TravelThumnail.travelIdx AND Travel.status = 'PUBLIC'
        GROUP BY travelIdx HAVING MIN(TravelThumnail.createdAt)
    ) AS TI ON TI.travelIdx = T.idx
WHERE fromIdx = ? AND F.status = 'Y'
GROUP BY travelIdx
) AS A
ORDER BY createdAt
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
                         SELECT travelIdx, userIdx, nickName, profileImgUrl, title, introduce,
                                myLikeStatus, travelHashtag, travelScore, thumImgUrl, createdAt
                         FROM (
                                  SELECT T.idx AS travelIdx, T.userIdx,
                                         nickName, profileImgUrl,
                                         title, introduce,
                                         IF(TL.status = 'Y', '좋아요 하는중', '좋아요 안하는중') AS myLikeStatus,
                                         IF(TH.content = '', NULL, GROUP_CONCAT(CONCAT('#', TH.content) SEPARATOR ' ')) AS travelHashtag,
                                         CASE
                                             WHEN travelScore IS NULL THEN "점수 없음"
                                             WHEN travelScore < 2.0 THEN "별로에요"
                                             WHEN travelScore < 3.0 THEN "도움되지 않았어요"
                                             WHEN travelScore < 4.0 THEN "그저 그래요"
                                             WHEN travelScore < 4.5 THEN "도움되었어요!"
                                             ELSE "최고의 여행!"
                                             END AS travelScore, thumImgUrl,
                                         CASE
                                             WHEN TIMESTAMPDIFF(SECOND, T.createdAt, NOW()) <= 0 THEN CONCAT(TIMESTAMPDIFF(SECOND, T.createdAt, NOW()), '방금 전')
                                             WHEN TIMESTAMPDIFF(SECOND, T.createdAt, NOW()) < 60 THEN CONCAT(TIMESTAMPDIFF(SECOND, T.createdAt, NOW()), '초 전')
                                             WHEN TIMESTAMPDIFF(MINUTE, T.createdAt, NOW()) < 60 THEN CONCAT(TIMESTAMPDIFF(MINUTE, T.createdAt, NOW()), '분 전')
                                             WHEN TIMESTAMPDIFF(HOUR, T.createdAt, NOW()) < 24 THEN CONCAT(TIMESTAMPDIFF(HOUR, T.createdAt, NOW()), '시간 전')
                                             WHEN TIMESTAMPDIFF(DAY, T.createdAt, NOW()) < 30 THEN CONCAT(TIMESTAMPDIFF(DAY, T.createdAt, NOW()), '일 전')
                                             WHEN TIMESTAMPDIFF(MONTH, T.createdAt, NOW()) < 12 THEN CONCAT(TIMESTAMPDIFF(MONTH, T.createdAt, NOW()), '달 전')
                                             ELSE CONCAT(TIMESTAMPDIFF(YEAR, T.createdAt, NOW()), '년 전')
                                             END AS createdAt
                                  FROM Travel AS T
                                           INNER JOIN User ON T.userIdx = User.idx AND User.isWithdraw = 'N'
                                           LEFT JOIN (
                                      SELECT travelIdx, userIdx, status
                                      FROM TravelLike
                                      WHERE userIdx = ?
                                  ) AS TL ON TL.travelIdx = T.idx
                                           LEFT JOIN (
                                      SELECT travelIdx, AVG(score) AS travelScore
                                      FROM TravelScore
                                               INNER JOIN User
                                                          ON TravelScore.userIdx = User.idx AND User.isWithdraw = 'N'
                                      GROUP BY travelIdx
                                  ) AS TS ON T.idx = TS.travelIdx
                                           LEFT JOIN (
                                      SELECT travelIdx, content
                                      FROM TravelHashtag
                                               INNER JOIN Hashtag
                                                          ON Hashtag.idx = TravelHashtag.hashtagIdx
                                      WHERE TravelHashtag.status = 'Y'
                                  ) AS TH ON T.idx = TH.travelIdx
                                           LEFT JOIN (
                                      SELECT travelIdx, thumImgUrl
                                      FROM TravelThumnail
                                               LEFT JOIN Travel
                                                         ON Travel.idx = TravelThumnail.travelIdx AND Travel.status = 'PUBLIC'
                                      GROUP BY travelIdx HAVING MIN(TravelThumnail.createdAt)
                                  ) AS TI ON TI.travelIdx = T.idx
                                  WHERE T.status = 'PUBLIC'
                                  GROUP BY T.idx
                              ) AS A
                         ORDER BY A.createdAt DESC         
                ) AS A;
            `;
            const [selectMainPageResultCountRowByRecent] = await connection.query(selectMainPageResultCountQuery, userIdx);
            return selectMainPageResultCountRowByRecent;
        case '팔로우':
            selectMainPageResultCountQuery = `
                SELECT COUNT(*) AS totalCount
                FROM (
                         SELECT *
                         FROM (
                                  SELECT T.idx AS travelIdx, F.toIdx AS userIdx, nickName,
                                         profileImgUrl, title, introduce,
                                         IF(TL.status = 'Y', '좋아요 하는중', '좋아요 안하는중') AS myLikeStatus,
                                         IF(TH.content = '', NULL, GROUP_CONCAT(CONCAT('#', TH.content) SEPARATOR ' ')) AS travelHashtag,
                                         CASE
                                             WHEN travelScore IS NULL THEN "점수 없음"
                                             WHEN travelScore < 2.0 THEN "별로에요"
                                             WHEN travelScore < 3.0 THEN "도움되지 않았어요"
                                             WHEN travelScore < 4.0 THEN "그저 그래요"
                                             WHEN travelScore < 4.5 THEN "도움되었어요!"
                                             ELSE "최고의 여행!"
                                             END AS travelScore, thumImgUrl,
                                         CASE
                                             WHEN TIMESTAMPDIFF(SECOND, T.createdAt, NOW()) <= 0 THEN CONCAT(TIMESTAMPDIFF(SECOND, T.createdAt, NOW()), '방금 전')
                                             WHEN TIMESTAMPDIFF(SECOND, T.createdAt, NOW()) < 60 THEN CONCAT(TIMESTAMPDIFF(SECOND, T.createdAt, NOW()), '초 전')
                                             WHEN TIMESTAMPDIFF(MINUTE, T.createdAt, NOW()) < 60 THEN CONCAT(TIMESTAMPDIFF(MINUTE, T.createdAt, NOW()), '분 전')
                                             WHEN TIMESTAMPDIFF(HOUR, T.createdAt, NOW()) < 24 THEN CONCAT(TIMESTAMPDIFF(HOUR, T.createdAt, NOW()), '시간 전')
                                             WHEN TIMESTAMPDIFF(DAY, T.createdAt, NOW()) < 30 THEN CONCAT(TIMESTAMPDIFF(DAY, T.createdAt, NOW()), '일 전')
                                             WHEN TIMESTAMPDIFF(MONTH, T.createdAt, NOW()) < 12 THEN CONCAT(TIMESTAMPDIFF(MONTH, T.createdAt, NOW()), '달 전')
                                             ELSE CONCAT(TIMESTAMPDIFF(YEAR, T.createdAt, NOW()), '년 전')
                                             END AS createdAt
                                  FROM Follow AS F
                                           INNER JOIN User
                                                      ON F.toIdx = User.idx AND User.isWithdraw = 'N'
                                           INNER JOIN Travel AS T
                                                      ON T.userIdx = F.toIdx AND T.status = 'PUBLIC'
                                           LEFT JOIN (
                                      SELECT travelIdx, userIdx, status
                                      FROM TravelLike
                                      WHERE userIdx = ?
                                  ) AS TL ON TL.travelIdx = T.idx
                                           LEFT JOIN (
                                      SELECT travelIdx, content
                                      FROM TravelHashtag
                                               INNER JOIN Hashtag
                                                          ON Hashtag.idx = TravelHashtag.hashtagIdx
                                      WHERE TravelHashtag.status = 'Y'
                                  ) AS TH ON T.idx = TH.travelIdx
                                           LEFT JOIN (
                                      SELECT travelIdx, AVG(score) AS travelScore
                                      FROM TravelScore
                                               INNER JOIN User
                                                          ON TravelScore.userIdx = User.idx AND User.isWithdraw = 'N'
                                      GROUP BY travelIdx
                                  ) AS TS ON T.idx = TS.travelIdx
                                           LEFT JOIN (
                                      SELECT travelIdx, thumImgUrl
                                      FROM TravelThumnail
                                               LEFT JOIN Travel
                                                         ON Travel.idx = TravelThumnail.travelIdx AND Travel.status = 'PUBLIC'
                                      GROUP BY travelIdx HAVING MIN(TravelThumnail.createdAt)
                                  ) AS TI ON TI.travelIdx = T.idx
                                  WHERE fromIdx = ? AND F.status = 'Y'
                                  GROUP BY travelIdx
                              ) AS A
                         ORDER BY createdAt         
                ) AS A;
            `;
            const [selectMainPageResultCountRowByFollow] = await connection.query(selectMainPageResultCountQuery, [userIdx, userIdx]);
            return selectMainPageResultCountRowByFollow;
    }
}

module.exports = {
    selectMainPageByOption,
    selectMainPageResultCount
};