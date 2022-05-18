const { pool } = require("../../../config/database");
const { logger } = require("../../../config/winston");
const feedDao = require("./feedDao");
const {errResponse} = require("../../../config/response");
const baseResponse = require("../../../config/baseResponseStatus");

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

exports.retrieveFeedInfo = async function (userIdx, travelWriterIdx, travelIdx, isMine) {
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

exports.retrieveFeedDayInfo = async function (userIdx, travelIdx, dayIdx, isMine) {
    const connection = await pool.getConnection(async (conn) => conn);
    const feedDayInfoResult = await feedDao.selectFeedDayInfo(connection, dayIdx, isMine);
    connection.release();
    return feedDayInfoResult;
};

exports.checkIsDayIncluded = async function (travelIdx, day) {
    const connection = await pool.getConnection(async (conn) => conn);
    const isDayIncludedResponse = (await feedDao.selectIsDayExist(connection, [travelIdx, day]))[0].isDayExist;
    connection.release();
    return isDayIncludedResponse;
};

exports.checkIsAreaIncluded = async function (dayIdx, dayAreaIdx) {
    const connection = await pool.getConnection(async (conn) => conn);
    const isAreaIncludedResponse = (await feedDao.selectIsAreaExist(connection, [dayIdx, dayAreaIdx]))[0].isAreaExist;
    connection.release();
    return isAreaIncludedResponse;
};

exports.checkTravelStatus = async (travelIdx) => {
    const connection = await pool.getConnection(async (conn) => conn);
    const travelStatusResponse = (await feedDao.selectTravelStatus(connection, travelIdx))[0].travelStatus;
    connection.release();
    return travelStatusResponse;
};

exports.retrieveAreaReview = async (travelIdx, dayIdx, dayAreaIdx) => {
    const connection = await pool.getConnection(async (conn) => conn);
    let areaReviewImageArr = [];

    // 장소 사진
    let areaReviewImage = await feedDao.selectFeedReviewImage(connection, [travelIdx, dayIdx, dayAreaIdx]);
    if (areaReviewImage.length === 0)
        areaReviewImage = null;
    else {
        areaReviewImage.forEach((img) => {
            areaReviewImageArr.push(img.travelImageUrl);
        });
    }

    // 장소 리뷰
    let areaReviewComment = await feedDao.selectFeedReviewComment(connection, [travelIdx, dayIdx, dayAreaIdx]);
    if (areaReviewComment.length === 0)
        areaReviewComment = null;
    else
        areaReviewComment = areaReviewComment[0].review;

    connection.release();
    return [areaReviewImageArr, areaReviewComment];
};

exports.checkIsCommentParent = async (travelIdx, commentIdx) => {
    const connection = await pool.getConnection(async (conn) => conn);
    const checkCommentResult = (await feedDao.selectIsParentCommentExist(connection, [travelIdx, commentIdx]))[0].isParentCommentExist;
    connection.release();
    return checkCommentResult;
};

exports.retrieveCommentStatus = async (commentIdx) => {
    const connection = await pool.getConnection(async (conn) => conn);
    const commentStatusResult = (await feedDao.selectCommentStatus(connection, commentIdx))[0].status;
    connection.release();
    return commentStatusResult;
};

exports.checkIsCommentExist = async (travelIdx, commentIdx) => {
    const connection = await pool.getConnection(async (conn) => conn);
    const commentExistResult = (await feedDao.selectIsCommentExist(connection, [travelIdx, commentIdx]))[0].isCommentExist;
    connection.release();
    return commentExistResult;
};

exports.checkFeedStatus = async (travelIdx) => {
    const connection = await pool.getConnection(async (conn) => conn);
    const feedStatusResult = (await feedDao.selectTravelStatus(connection, travelIdx))[0].travelStatus;
    connection.release();
    return feedStatusResult;
};

exports.retrieveTravelChildComment = async (travelIdx, commentIdx, check, page, pageSize) => {
    // 본인 게시물이면 모두 조회 가능
    // 상대방 게시물이면 조회 불가능!

    const connection = await pool.getConnection(async (conn) => conn);

    try {
        /* Validation */
        // 실제로 있는 게시물인지 확인하기
        const isFeedExist = (await feedDao.selectIsTravelExist(connection, travelIdx))[0].isTravelExist;
        if (isFeedExist === 0)
            return [-1, errResponse(baseResponse.TRAVEL_NOT_EXIST)];

        // 게시물 상태 확인하기 (숨김 또는 삭제됨)
        const feedStatusCheckRow = (await feedDao.selectTravelStatus(connection, travelIdx))[0].travelStatus;
        if (check === 'M') {   // 본인 게시물일 경우
            if (feedStatusCheckRow === 'DELETED')
                return [-1, errResponse(baseResponse.TRAVEL_STATUS_DELETED)];
        } else {   // 상대방 게시물일 경우
            if (feedStatusCheckRow === 'PRIVATE')
                return [-1, errResponse(baseResponse.TRAVEL_STATUS_PRIVATE)];
            else if (feedStatusCheckRow === 'DELETED')
                return [-1, errResponse(baseResponse.TRAVEL_STATUS_DELETED)];
        }

        // 댓글 상태 확인하기
        // 해당 게시물에 존재하는 댓글인지, 삭제된 댓글인지 확인하기
        const isCommentExist = (await feedDao.selectIsCommentExist(connection, [travelIdx, commentIdx]))[0].isCommentExist;
        if (isCommentExist === 0)
            return [-1, errResponse(baseResponse.TRAVEL_COMMENT_NOT_EXIST)];

        const commentStatus = (await feedDao.selectCommentStatus(connection, commentIdx))[0].status;
        if (commentStatus === 'DELETED') {
            return [-1, errResponse(baseResponse.TRAVEL_COMMENT_DELETED)];
        }

        let start = (page - 1) * pageSize;
        const totalChildCommentCount = (await feedDao.selectTotalChildCommentCount(connection, [travelIdx, commentIdx]))[0].totalChildCommentCount;   // 총 부모 댓글 개수 조회

        if (page > Math.ceil(totalChildCommentCount / pageSize)) {
            connection.release();
            return [-1, errResponse(baseResponse.PAGE_FINISH)];
        }
        else {
            const travelChildCommentResult = await feedDao.selectTravelChildCommentList(connection, [travelIdx, commentIdx, start, pageSize]);   // 댓글 목록 조회
            return travelChildCommentResult;
        }
    } catch(err) {
        logger.error(`App - retrieveTravelChildComment Service error\n: ${err.message}`);
        await connection.rollback();
        return errResponse(baseResponse.DB_ERROR);
    } finally {
        connection.release();
    }
};