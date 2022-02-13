const { pool } = require("../../../config/database");
const { logger } = require("../../../config/winston");
const feedDao = require("./feedDao");

exports.retrieveTravelWriter = async function (travelIdx) {
    const connection = await pool.getConnection(async (conn) => conn);
    const feedWriterIdx = (await feedDao.selectFeedWriterIdx(connection, travelIdx))[0].userIdx;
    connection.release();
    return feedWriterIdx;
};

exports.retrieveTravelStatus = async function (travelIdx) {
    const connection = await pool.getConnection(async (conn) => conn);
    const travelStatus = (await feedDao.selectTravelStatus(connection, travelIdx))[0].travelStatus;
    connection.release();
    return travelStatus;
};

exports.retrieveFeedInfo = async function (userIdx, travelWriterIdx, travelIdx, day, isMine) {
    const connection = await pool.getConnection(async (conn) => conn);
    let travelThumnailArr = [];
    let travelDayArr = [];
    let travelInfo;

    if (isMine === 0) {   // 상대방의 게시물일 경우
        // (1) 썸네일 사진
        const otherTravelThumnail = await feedDao.selectFeedThumnail(connection, [travelIdx, isMine]);
        otherTravelThumnail.forEach((thumnail) => {
            travelThumnailArr.push(thumnail.thumImgUrl);
        });

        // (2) 게시물 정보들
        travelInfo = (await feedDao.selectOtherTravelInfo(connection, [travelIdx, userIdx, travelWriterIdx]))[0];

        // (3) 여행의 day 정보들
        const otherTravelDayInfo = await feedDao.selectFeedDay(connection, [travelIdx, isMine]);
        otherTravelDayInfo.forEach((dayIdx) => {
            travelDayArr.push(dayIdx.idx);
        });
    }
    else {   // 본인의 게시물일 경우
        // (1) 썸네일 사진
        const myTravelThumnail = await feedDao.selectFeedThumnail(connection, [travelIdx, isMine]);
        myTravelThumnail.forEach((thumnail) => {
            travelThumnailArr.push(thumnail.thumImgUrl);
        });

        // (2) 게시물 정보들
        travelInfo = (await feedDao.selectMyTravelInfo(connection, [travelIdx, userIdx, isMine]))[0];

        // (3) 여행의 day 정보들
        const myTravelDayInfo = await feedDao.selectFeedDay(connection, [travelIdx, isMine]);
        myTravelDayInfo.forEach((dayIdx) => {
            travelDayArr.push(dayIdx.idx);
        });
    }

    connection.release();
    return {
        'travelThumnails': travelThumnailArr,
        'travelInfo': travelInfo,
        'travelDayIdx': travelDayArr
    }
};

exports.retrieveFeedReview = async function (userIdx, travelIdx, dayIdx, areaIdx) {
    const connection = await pool.getConnection(async (conn) => conn);

    const feedReviewComment = await feedDao.selectFeedReviewComment(connection, areaIdx);
    const feedReviewImage = await feedDao.selectFeedReviewImage(connection, areaIdx);

    connection.release();
};

exports.checkIsDayIncluded = async function (travelIdx, day) {
    const connection = await pool.getConnection(async (conn) => conn);
    const isDayIncludedResponse = (await feedDao.selectIsDayExist(connection, [travelIdx, day]))[0].isDayExist;
    connection.release();
    return isDayIncludedResponse;
};