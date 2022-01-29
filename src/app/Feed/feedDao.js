async function insertNewFeed(connection, [travelIdx, title, introduce, traffic, startDate, endDate]) {
    const insertNewFeedQuery = `
        INSERT INTO Travel(userIdx, title, introduce, traffic, startDate, endDate)
        VALUES (?, ?, ?, ?, ?, ?);
    `;
    return await connection.query(insertNewFeedQuery, [travelIdx, title, introduce, traffic, startDate, endDate]);
}

async function selectFeedIdxByAll(connection, [travelIdx, title, traffic, startDate, endDate]) {
    const selectFeedIdxByAllQuery = `
        SELECT idx
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

async function selectDayAreaIdx(connection, dayIdx) {
    const selectDayAreaIdxQuery = `
        SELECT idx AS dayAreaIdx
        FROM DayArea
        WHERE dayIdx = ?;
    `;
    const [selectDayAreaIdxRow] = await connection.query(selectDayAreaIdxQuery, dayIdx);
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
    selectIsScoreExist
};