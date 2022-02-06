async function insertNewFeed(connection, [travelIdx, title, introduce, traffic, startDate, endDate]) {
    const insertNewFeedQuery = `
        INSERT INTO Travel(userIdx, title, introduce, traffic, startDate, endDate)
        VALUES (?, ?, ?, ?, ?, ?);
    `;
    return await connection.query(insertNewFeedQuery, [travelIdx, title, introduce, traffic, startDate, endDate]);
}

async function selectFeedIdxByAll(connection, [travelIdx, title, traffic, startDate, endDate]) {
    const selectFeedIdxByAllQuery = `
        SELECT MAX(idx) AS idx
        FROM Travel
        WHERE userIdx = ? AND title = ? AND traffic = ? AND startDate = ? AND endDate = ?;
    `;
    const [selectFeedIdxByAllRow] = await connection.query(selectFeedIdxByAllQuery, [travelIdx, title, traffic, startDate, endDate]);
    return selectFeedIdxByAllRow;
}

async function insertNewDay(connection, [travelIdx, i]) {
    const insertNewDayQuery = `
        INSERT INTO Day(travelIdx, dayNumber)
        VALUES (?, ?);
    `;
    return await connection.query(insertNewDayQuery, [travelIdx, i]);
}

async function selectDayIdxOfTravel(connection, travelIdx) {
    const selectDayIdxOfTravelQuery = `
        SELECT idx AS dayIdx
        FROM Day 
        WHERE travelIdx = ?;
    `;
    const [selectDayIdxOfTravelRow] = await connection.query(selectDayIdxOfTravelQuery, travelIdx);
    return selectDayIdxOfTravelRow;
}

async function insertDayArea(connection, [dayIdx, category, latitude, longitude, name, address]) {
    const insertDayAreaQuery = `
        INSERT INTO DayArea(dayIdx, areaCategory, areaLatitude, areaLongitude, areaName, areaAddress)
        VALUES (?, ?, ?, ?, ?, ?);
    `;
    return await connection.query(insertDayAreaQuery, [dayIdx, category, latitude, longitude, name, address]);
}

async function selectDayAreaIdx(connection, [dayIdx, category, latitude, longitude, name]) {
    const selectDayAreaIdxQuery = `
        SELECT MAX(idx) AS dayAreaIdx
        FROM DayArea
        WHERE dayIdx = ? AND areaCategory = ? AND areaName = ? AND areaLatitude = ? AND areaLongitude = ?;
    `;
    const [selectDayAreaIdxRow] = await connection.query(selectDayAreaIdxQuery, [dayIdx, category, name, latitude, longitude]);
    return selectDayAreaIdxRow;
}

async function insertDayAreaReview(connection, [dayAreaIdx, comment]) {
    const insertDayAreaReviewQuery = `
        INSERT INTO DayAreaReview(dayAreaIdx, review)
        VALUES (?, ?);
    `;
    return await connection.query(insertDayAreaReviewQuery, [dayAreaIdx, comment]);
}

async function insertDayAreaImage(connection, dayAreaIdx, reviewImage) {
    const insertDayAreaImageQuery = `
        INSERT INTO DayAreaImage(dayAreaIdx, travelImageUrl)
        VALUES (?, ?);
    `;
    return await connection.query(insertDayAreaImageQuery, [dayAreaIdx, reviewImage]);
}

async function insertThumnails(connection, [travelIdx, timg]) {
    const insertThumnailQuery = `
        INSERT INTO TravelThumnail(travelIdx, thumImgUrl)
        VALUES (?, ?);
    `;
    return await connection.query(insertThumnailQuery, [travelIdx, timg]);
}

async function selectIsTagExist(connection, tag) {
    const selectIsTagExistQuery = `
        SELECT EXISTS(SELECT content FROM Hashtag WHERE content = ?) AS isTagExist;
    `;
    const [selectIsTagExistRow] = await connection.query(selectIsTagExistQuery, tag);
    return selectIsTagExistRow;
}

async function selectTagIdx(connection, tag) {
    const selecTagQuery = `
        SELECT idx AS tagIdx
        FROM Hashtag
        WHERE content = ?;
    `;
    const [selectTagRow] = await connection.query(selecTagQuery, tag);
    return selectTagRow;
}

async function insertTravelHashtag(connection, [travelIdx, tagIdx]) {
    const insertTravelHashQuery = `
        INSERT INTO TravelHashtag(travelIdx, hashtagIdx)
        VALUES (?, ?);
    `;
    return await connection.query(insertTravelHashQuery, [travelIdx, tagIdx]);
}

async function insertHashtag(connection, tag) {
    const insertHashtagQuery = `
        INSERT INTO Hashtag(content)
        VALUES (?);
    `;
    return await connection.query(insertHashtagQuery, tag);
}

async function selectIsTravelExist(connection, travelIdx) {
    const selectIsTravelExistQuery = `
        SELECT EXISTS(SELECT idx FROM Travel WHERE idx = ?) AS isTravelExist;
    `;
    const [selectIsTravelExistRow] = await connection.query(selectIsTravelExistQuery, travelIdx);
    return selectIsTravelExistRow;
}

async function selectTravelStatus(connection, travelIdx) {
    const selectTravelStatusQuery = `
        SELECT status AS travelStatus
        FROM Travel
        WHERE Travel.idx = ?;
    `;
    const [selectTravelStatusRow] = await connection.query(selectTravelStatusQuery, travelIdx);
    return selectTravelStatusRow;
}

async function selectTravelUserLike(connection, [userIdx, travelIdx]) {
    const selectTravelUserLikeQuery = `
        SELECT status AS likeStatus
        FROM TravelLike
        WHERE userIdx = ? AND travelIdx = ?;
    `;
    const [selectTravelUserLikeRow] = await connection.query(selectTravelUserLikeQuery, [userIdx, travelIdx]);
    return selectTravelUserLikeRow;
}

async function insertTravelLike(connection, [userIdx, travelIdx]) {
    const insertTravelLikeQuery = `
        INSERT INTO TravelLike(userIdx, travelIdx, status)
        VALUES (?, ?, 'Y');
    `;
    return await connection.query(insertTravelLikeQuery, [userIdx, travelIdx]);
}

async function updateTravelLike(connection, [userIdx, travelIdx, status]) {
    let updateTravelLikeQuery = '';

    if (status === 'Y') {
        updateTravelLikeQuery = `
            UPDATE TravelLike
            SET status = 'Y'
            WHERE userIdx = ? AND travelIdx = ?;
        `;
    } else {
        updateTravelLikeQuery = `
            UPDATE TravelLike
            SET status = 'N'
            WHERE userIdx = ? AND travelIdx = ?;
        `;
    }
    return await connection.query(updateTravelLikeQuery, [userIdx, travelIdx]);
}

async function insertTravelScore(connection, [userIdx, travelIdx, score]) {
    const insertTravelScoreQuery = `
        INSERT INTO TravelScore(userIdx, travelIdx, score)
        VALUES (?, ?, ?);
    `;
    return await connection.query(insertTravelScoreQuery, [userIdx, travelIdx, score]);
}

async function selectIsScoreExist(connection, [userIdx, travelIdx]) {
    const selectIsScoreExistQuery = `
        SELECT EXISTS(SELECT score FROM TravelScore WHERE userIdx = ? AND travelIdx = ?) AS isScoreExist;
    `;
    const [selectIsScoreExistRow] = await connection.query(selectIsScoreExistQuery, [userIdx, travelIdx]);
    return selectIsScoreExistRow;
}

async function updateTravelScore(connection, [userIdx, travelIdx, score]) {
    const updateTravelScoreQuery = `
        UPDATE TravelScore
        SET score = ?
        WHERE userIdx = ? AND travelIdx = ?;
    `;
    return await connection.query(updateTravelScoreQuery, [score, userIdx, travelIdx]);
}

async function selectFeedWriterIdx(connection, travelIdx) {
    const selectFeedWriterIdxQuery = `
        SELECT userIdx
        FROM Travel
        WHERE Travel.idx = ?;
    `;
    const [selectFeedWriterIdxRow] = await connection.query(selectFeedWriterIdxQuery, travelIdx);
    return selectFeedWriterIdxRow;
}

async function updateTravelStatus(connection, [userIdx, travelIdx, status]) {
    const updateTravelStatusQuery = `
        UPDATE Travel
        SET status = ?
        WHERE userIdx = ? AND Travel.idx = ?;
    `;
    return await connection.query(updateTravelStatusQuery, [status, userIdx, travelIdx]);
}

async function selectIsParentCommentExist(connection, isParent) {
    const selectIsParentCommentExistQuery = `
        SELECT EXISTS(SELECT idx FROM TravelComment WHERE idx = ? AND isParent = 0) AS isParentCommentExist;
    `;
    const [selectIsParentCommentExistRow] = await connection.query(selectIsParentCommentExistQuery, isParent);
    return selectIsParentCommentExistRow;
}

async function selectTravelCommentCount(connection, travelIdx) {
    const selectTravelCommentCountQuery = `
        SELECT COUNT(idx) AS commentCount
        FROM TravelComment
        WHERE travelIdx = ?;
    `;
    const [selectTravelCommentCountRow] = await connection.query(selectTravelCommentCountQuery, travelIdx);
    return selectTravelCommentCountRow;
}

async function insertTravelComment(connection, [travelIdx, userIdx, comment, isParent]) {
    const insertTravelCommentQuery = `
        INSERT INTO TravelComment(travelIdx, userIdx, comment, isParent)
        VALUES (?, ?, ?, ?);
    `;
    return await connection.query(insertTravelCommentQuery, [travelIdx, userIdx, comment, isParent]);
}

async function selectTravelCommentIdx(connection, [travelIdx, userIdx, comment, isParent]) {
    const selectTravelCommentIdxQuery = `
        SELECT idx AS commentIdx
        FROM TravelComment
        WHERE travelIdx = ? AND userIdx = ? AND comment = ? AND isParent = ?
                AND createdAt = (SELECT MAX(createdAt) FROM TravelComment WHERE travelIdx = ? AND userIdx = ? AND comment = ? AND isParent = ?);
    `;
    const [selectTravelCommentIdxRow] = await connection.query(selectTravelCommentIdxQuery, [travelIdx, userIdx, comment, isParent, travelIdx, userIdx, comment, isParent]);
    return selectTravelCommentIdxRow;
}

async function updateTravelComment(connection, [userIdx, travelIdx, commentIdx, comment]) {
    const updateTravelCommentQuery = `
        UPDATE TravelComment
        SET comment = ?
        WHERE userIdx = ? AND travelIdx = ? AND TravelComment.idx = ?;
    `;
    return await connection.query(updateTravelCommentQuery, [comment, userIdx, travelIdx, commentIdx]);
}

async function updateTravelCommentStatus(connection, [userIdx, travelIdx, commentIdx]) {
    const updateTravelCommentStatusQuery = `
        UPDATE TravelComment
        SET status = 'M'
        WHERE userIdx = ? AND travelIdx = ? AND TravelComment.idx = ?;
    `;
    return await connection.query(updateTravelCommentStatusQuery, [userIdx, travelIdx, commentIdx]);
}

async function selectIsCommentExist(connection, [travelIdx, commentIdx]) {
    const selectIsCommentExistQuery = `
        SELECT EXISTS(SELECT idx FROM TravelComment WHERE idx = ? AND travelIdx = ?) AS isCommentExist;
    `;
    const [selectIsCommentExistRow] = await connection.query(selectIsCommentExistQuery, [commentIdx, travelIdx]);
    return selectIsCommentExistRow;
}

async function selectIsMyComment(connection, [userIdx, commentIdx]) {
    const selectIsMyCommentQuery = `
        SELECT EXISTS(SELECT userIdx FROM TravelComment WHERE userIdx = ? AND idx = ?) AS isMyCommentCheck;
    `;
    const [selectIsMyCommentRow] = await connection.query(selectIsMyCommentQuery, [userIdx, commentIdx]);
    return selectIsMyCommentRow;
}

async function selectCommentStatus(connection, commentIdx) {
    const selectCommentStatusQuery = `
        SELECT status
        FROM TravelComment
        WHERE TravelComment.idx = ?;
    `;
    const [selectCommentStatusRow] = await connection.query(selectCommentStatusQuery, commentIdx);
    return selectCommentStatusRow;
}

async function selectTravelComment(connection, commentIdx) {
    const selectTravelCommentQuery = `
        SELECT comment
        FROM TravelComment
        WHERE TravelComment.idx = ?;
    `;
    const [selectTravelCommentRow] = await connection.query(selectTravelCommentQuery, commentIdx);
    return selectTravelCommentRow;
}

async function selectTravelCommentList(connection, travelIdx) {
    const selectTravelCommentListQuery = `
        SELECT C.idx AS commentIdx, C.userIdx,
               nickName AS userNickname, profileImgUrl AS userProfileImage,
               comment, C.isParent AS isParent, C.status AS commentStatus, T.count AS commentCount, C.createdAt
        FROM TravelComment AS C
                 INNER JOIN User AS U ON U.idx = C.userIdx AND U.isWithdraw != 'Y'
    INNER JOIN Travel ON Travel.idx = C.travelIdx AND Travel.status != 'DELETED'
            LEFT JOIN (
            SELECT isParent, COUNT(isParent) AS count
            FROM TravelComment
            GROUP BY isParent
            ) AS T ON C.idx = T.isParent
        WHERE C.travelIdx = ? AND C.status != 'N'
        ORDER BY IF(C.isParent = 0, commentIdx, C.isParent);    
    `;
    const [selectTravelCommentListRow] = await connection.query(selectTravelCommentListQuery, travelIdx);
    return selectTravelCommentListRow;
}

async function selectTotalCommentCount(connection, travelIdx) {
    const selectTotalCommentCountQuery = `
        SELECT COUNT(idx) AS totalCount
        FROM TravelComment;
    `;
    const [selectTotalCommentCountRow] = await connection.query(selectTotalCommentCountQuery, travelIdx);
    return selectTotalCommentCountRow;
}

module.exports = {
    insertNewFeed,
    selectFeedIdxByAll,
    insertNewDay,
    selectDayIdxOfTravel,
    insertDayArea,
    selectDayAreaIdx,
    insertDayAreaReview,
    insertDayAreaImage,
    insertThumnails,
    selectIsTagExist,
    selectTagIdx,
    insertTravelHashtag,
    insertHashtag,
    selectIsTravelExist,
    selectTravelStatus,
    selectTravelUserLike,
    insertTravelLike,
    updateTravelLike,
    insertTravelScore,
    selectIsScoreExist,
    updateTravelScore,
    selectFeedWriterIdx,
    updateTravelStatus,
    selectIsParentCommentExist,
    selectTravelCommentCount,
    insertTravelComment,
    selectTravelCommentIdx,
    updateTravelComment,
    selectIsCommentExist,
    selectIsMyComment,
    selectCommentStatus,
    selectTravelComment,
    updateTravelCommentStatus,
    selectTravelCommentList,
    selectTotalCommentCount
};