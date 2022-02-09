const { pool } = require("../../../config/database");
const { logger } = require("../../../config/winston");
const feedDao = require("./feedDao");

exports.retrieveFeedInfo = async function (userIdx, travelIdx, day) {
    const connection = await pool.getConnection(async (conn) => conn);

    let travelThumnailArr = [];
    let travelDayArr = [];

    // 여행 게시물 썸네일 사진 리스트
    const travelThumnail = await feedDao.selectFeedThumnail(connection, travelIdx);
    travelThumnail.forEach((thumnail) => {
        travelThumnailArr.push(thumnail.thumImgUrl);
    });

    // 여행 게시물 정보
    const travelInfo = await feedDao.selectFeedInfo(connection, [travelIdx, userIdx]);
    // console.log(travelInfo[0]);

    // 여행 게시물 내의 day에 대한 정보
    const travelDayInfo = await feedDao.selectFeedDay(connection, travelIdx);
    travelDayInfo.forEach((dayIdx) => {
        travelDayArr.push(dayIdx.idx);
    })
    // console.log(travelDayArr);

    if (day === undefined) day = travelDayArr[0];

    // day에 관한 정보 출력 (default는 day1)
    const travelAreaInfoByDay = await feedDao.selectFeedAreaInfo(connection, day);
    // console.log(travelAreaInfoByDay);

    connection.release();
    return {
        'travelInfo': travelInfo[0],
        'day': travelDayArr,
        'areaInfo': travelAreaInfoByDay
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