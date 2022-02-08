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
    console.log(travelInfo[0]);

    // 여행 게시물 내의 day에 대한 정보
    const travelDayInfo = await feedDao.selectFeedDay(connection, travelIdx);
    travelDayInfo.forEach((dayIdx) => {
        travelDayArr.push(dayIdx.idx);
    })
    console.log(travelDayArr);

    connection.release();
};