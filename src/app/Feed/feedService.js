const {logger} = require("../../../config/winston");
const {pool} = require("../../../config/database");
const feedProvider = require("./feedProvider");
const feedDao = require("./feedDao");
const baseResponse = require("../../../config/baseResponseStatus");
const {response} = require("../../../config/response");
const {errResponse} = require("../../../config/response");
const userProvider = require("../User/userProvider");

exports.createNewFeed = async function (userIdx, startDate, endDate, traffic, title,
                                        introduce, hashtagArr, thumnails, day, dateDiff)
{
    const connection = await pool.getConnection(async (conn) => conn);
    let travelIdx, dayIdxArr, dayAreaIdx, tagIdx;

    try {
        await connection.beginTransaction();

        await feedDao.insertNewFeed(connection, [userIdx, title, introduce, traffic, startDate, endDate]);   // 1. Travel 테이블에 값 넣어서 travelIdx 생성

        travelIdx = (await feedDao.selectFeedIdxByAll(connection, [userIdx, title, traffic, startDate, endDate]))[0].idx;   // 2. travelIdx 가져옴
        console.log("travelIdx: " + travelIdx);

        for (let i=1; i<=dateDiff; i++)   // 3. Day 테이블에 row 생성
            await feedDao.insertNewDay(connection, [travelIdx, i]);

        dayIdxArr = await feedDao.selectDayIdxOfTravel(connection, travelIdx);   // 4. dayIdx 가져오기
        console.log("[dayIdxArr]");
        console.log(dayIdxArr);

        for (let i=0; i<dayIdxArr.length; i++) {   // 5. day에 입력된 data들을 dayIdx를 가지고 DB에 insert
            let areaArr = day[i].area;
            if (areaArr !== undefined && areaArr.length !== 0) {   // area(장소)를 입력했다면
                for (let j=0; j<areaArr.length; j++) {
                    console.log(i,j);
                    await feedDao.insertDayArea(connection, [dayIdxArr[i].dayIdx, areaArr[j].category, areaArr[j].latitude, areaArr[j].longitude, areaArr[j].name, areaArr[j].address]);
                    dayAreaIdx = (await feedDao.selectDayAreaIdx(connection, [dayIdxArr[i].dayIdx, areaArr[j].category, areaArr[j].latitude, areaArr[j].longitude, areaArr[j].name]))[0].dayAreaIdx;   // dayAreaIdx 가져오기
                    if (areaArr[j].review !== undefined) {   // review도 입력했다면
                        if (!areaArr[j].review.images) await feedDao.insertDayAreaReview(connection, [dayAreaIdx, areaArr[j].review.comment]);
                        else if (!areaArr[j].review.comment) {
                            for (let img of areaArr[j].review.images)
                                await feedDao.insertDayAreaImage(connection, dayAreaIdx, img);
                        } else {
                            await feedDao.insertDayAreaReview(connection, [dayAreaIdx, areaArr[j].review.comment]);
                            for (let img of areaArr[j].review.images)
                                await feedDao.insertDayAreaImage(connection, dayAreaIdx, img);
                        }
                    }
                }
            }
        }

        // 6. metadata
        if (!(thumnails.length === 0 || !thumnails)) {   // 썸네일 사진이 있다면
            for (let timg of thumnails)
                await feedDao.insertThumnails(connection, [travelIdx, timg]);
        }

        if (!(hashtagArr.length === 0) || !hashtagArr) {   // 해시태그가 있다면
            // 전체 해시태그에 추가 (단, 중복 확인은 해야함)
            for (let tag of hashtagArr) {
                const checkTagResult = await feedDao.selectIsTagExist(connection, tag);
                if (checkTagResult[0].isTagExist === 1) {   // 전체 해시태그 DB에 해당 태그가 존재하면?
                    // 해당 태그 인덱스를 가져와서 TravelHashtag에 추가
                    tagIdx = (await feedDao.selectTagIdx(connection, tag))[0].tagIdx;
                    await feedDao.insertTravelHashtag(connection, [travelIdx, tagIdx]);
                } else {   // 전체 해시태그 DB에 해당 태그가 존재하지 않으면?
                    // 전체 해시태그에 추가
                    // 이후 해당 태그 인덱스를 가져와서 TravelHashtag에 추가할 것
                    await feedDao.insertHashtag(connection, tag);
                    tagIdx = (await feedDao.selectTagIdx(connection, tag))[0].tagIdx;
                    await feedDao.insertTravelHashtag(connection, [travelIdx, tagIdx]);
                }
            }
        }

        // await connection.rollback();
        await connection.commit();
    } catch(err) {
        logger.error(`App - createNewFeed Service error\n: ${err.message}`);
        await connection.rollback();
        return errResponse(baseResponse.DB_ERROR);
    } finally {
        connection.release();
    }
};

exports.createFeedLike = async function (userIdx, travelIdx) {
    const connection = await pool.getConnection(async (conn) => conn);

    try {
        // user
        const userStatusCheckRow = await userProvider.checkUserStatus(userIdx);
        if (userStatusCheckRow[0].isWithdraw === 'Y')
            return errResponse(baseResponse.USER_WITHDRAW);

        // 실제 존재하는 feed인지 확인하기
        const isFeedExist = (await feedDao.selectIsTravelExist(connection, travelIdx))[0].isTravelExist;
        if (isFeedExist === 0)
            return errResponse(baseResponse.TRAVEL_NOT_EXIST);

        // 비공개 또는 삭제된 게시물인지 확인하기
        const feedStatusCheckRow = (await feedDao.selectTravelStatus(connection, travelIdx))[0].travelStatus;
        if (feedStatusCheckRow === "PRIVATE")
            return errResponse(baseResponse.TRAVEL_STATUS_PRIVATE);
        else if (feedStatusCheckRow === 'DELETED')
            return errResponse(baseResponse.TRAVEL_STATUS_DELETED);

        const travelUserLikeRow = await feedDao.selectTravelUserLike(connection, [userIdx, travelIdx]);
        if (travelUserLikeRow.length === 0 || travelUserLikeRow[0].likeStatus === 'N') {   // 좋아요가 안눌린 상태라면?
            if (travelUserLikeRow.length === 0) await feedDao.insertTravelLike(connection, [userIdx, travelIdx]);
            else await feedDao.updateTravelLike(connection, [userIdx, travelIdx, "Y"]);
            return response(baseResponse.TRAVEL_LIKE_SUCCESS);
        }
        else {
            await feedDao.updateTravelLike(connection, [userIdx, travelIdx, "N"]);
            return response(baseResponse.TRAVEL_UNLIKE_SUCCESS);
        }
    } catch(err) {
        logger.error(`App - createFeedLike Service error\n: ${err.message}`);
        await connection.rollback();
        return errResponse(baseResponse.DB_ERROR);
    } finally {
        connection.release();
    }
}

exports.createFeedScore = async function (userIdx, travelIdx, score) {
    const connection = await pool.getConnection(async (conn) => conn);

    try {
        // user
        const userStatusCheckRow = await userProvider.checkUserStatus(userIdx);
        if (userStatusCheckRow[0].isWithdraw === 'Y')
            return errResponse(baseResponse.USER_WITHDRAW);

        // 실제 존재하는 feed인지 확인하기
        const isFeedExist = (await feedDao.selectIsTravelExist(connection, travelIdx))[0].isTravelExist;
        if (isFeedExist === 0)
            return errResponse(baseResponse.TRAVEL_NOT_EXIST);

        // 비공개 또는 삭제된 게시물인지 확인하기
        const feedStatusCheckRow = (await feedDao.selectTravelStatus(connection, travelIdx))[0].travelStatus;
        if (feedStatusCheckRow === "PRIVATE")
            return errResponse(baseResponse.TRAVEL_STATUS_PRIVATE);
        else if (feedStatusCheckRow === 'DELETED')
            return errResponse(baseResponse.TRAVEL_STATUS_DELETED);

        // 점수가 이미 업로드 되어있는지 확인하기
        // 이미 업로드 되어있으면 수정으로 넘어가기
        const scoreCheckRow = await feedDao.selectIsScoreExist(connection, [userIdx, travelIdx]);
        if (scoreCheckRow[0].isScoreExist === 1) {   // 이미 업로드가 되어있을 경우
            await feedDao.updateTravelScore(connection, [userIdx, travelIdx, score]);
            return response(baseResponse.TRAVEL_SCORE_EDIT_SUCCESS);
        }
        else {   // 처음 업로드하는 경우
            await feedDao.insertTravelScore(connection, [userIdx, travelIdx, score]);
            return response(baseResponse.TRAVEL_SCORE_SUCCESS);
        }
    } catch(err) {
        logger.error(`App - createFeedScore Service error\n: ${err.message}`);
        await connection.rollback();
        return errResponse(baseResponse.DB_ERROR);
    } finally {
        connection.release();
    }
};

exports.patchFeedToDeleted = async function (userIdx, travelIdx) {
    const connection = await pool.getConnection(async (conn) => conn);

    try {
        const userStatusCheckRow = await userProvider.checkUserStatus(userIdx);
        if (userStatusCheckRow[0].isWithdraw === 'Y')
            return errResponse(baseResponse.USER_WITHDRAW);

        // 실제 존재하는 feed인지 확인하기
        const isFeedExist = (await feedDao.selectIsTravelExist(connection, travelIdx))[0].isTravelExist;
        if (isFeedExist === 0)
            return errResponse(baseResponse.TRAVEL_NOT_EXIST);

        // 이미 삭제된 게시물인지 확인하기
        const feedStatusCheckRow = (await feedDao.selectTravelStatus(connection, travelIdx))[0].travelStatus;
        if (feedStatusCheckRow === 'DELETED')
            return errResponse(baseResponse.TRAVEL_STATUS_DELETED);

        // 사용자가 작성한 게시물인지 확인하기
        const feedWriterIdx = (await feedDao.selectFeedWriterIdx(connection, travelIdx))[0].userIdx;
        if (userIdx !== feedWriterIdx)
            return errResponse(baseResponse.TRAVEL_WRITER_WRONG);

        await feedDao.updateTravelStatus(connection, [userIdx, travelIdx, "DELETED"]);
        return response(baseResponse.TRAVEL_DELETE_SUCCESS);
    } catch(err) {
        logger.error(`App - patchFeedToDeleted Service error\n: ${err.message}`);
        await connection.rollback();
        return errResponse(baseResponse.DB_ERROR);
    } finally {
        connection.release();
    }
};

exports.patchFeedStatus = async function (userIdx, travelIdx) {
    const connection = await pool.getConnection(async (conn) => conn);

    try {
        const userStatusCheckRow = await userProvider.checkUserStatus(userIdx);
        if (userStatusCheckRow[0].isWithdraw === 'Y')
            return errResponse(baseResponse.USER_WITHDRAW);

        // 실제 존재하는 feed인지 확인하기
        const isFeedExist = (await feedDao.selectIsTravelExist(connection, travelIdx))[0].isTravelExist;
        if (isFeedExist === 0)
            return errResponse(baseResponse.TRAVEL_NOT_EXIST);

        // 이미 삭제된 게시물인지 확인하기
        const feedStatusCheckResult = (await feedDao.selectTravelStatus(connection, travelIdx))[0].travelStatus;
        if (feedStatusCheckResult === 'DELETED')
            return errResponse(baseResponse.TRAVEL_STATUS_DELETED);

        // 사용자가 작성한 게시물인지 확인하기
        const feedWriterIdx = (await feedDao.selectFeedWriterIdx(connection, travelIdx))[0].userIdx;
        if (userIdx !== feedWriterIdx)
            return errResponse(baseResponse.TRAVEL_WRITER_WRONG);

        if (feedStatusCheckResult === 'PUBLIC') {
            await feedDao.updateTravelStatus(connection, [userIdx, travelIdx, "PRIVATE"]);
            return response(baseResponse.TRAVEL_STATUS_TO_PRIVATE_SUCCESS);
        }
        else if (feedStatusCheckResult === 'PRIVATE') {
            await feedDao.updateTravelStatus(connection, [userIdx, travelIdx, "PUBLIC"]);
            return response(baseResponse.TRAVEL_STATUS_TO_PUBLIC_SUCCESS);
        }
    } catch(err) {
        logger.error(`App - patchFeedStatus Service error\n: ${err.message}`);
        await connection.rollback();
        return errResponse(baseResponse.DB_ERROR);
    } finally {
        connection.release();
    }
};