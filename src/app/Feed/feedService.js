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
        await feedDao.insertNewFeed(connection, [userIdx, title, introduce, traffic, startDate, endDate]);   // 1. Travel 테이블에 값 넣어서 travelIdx 생성

        travelIdx = (await feedDao.selectFeedIdxByAll(connection, [userIdx, title, traffic, startDate, endDate]))[0].idx;   // 2. travelIdx 가져옴
        for (let i=1; i<=dateDiff; i++)   // 3. Day 테이블에 row 생성
            await feedDao.insertNewDay(connection, [travelIdx, i]);

        dayIdxArr = await feedDao.selectDayIdxOfTravel(connection, travelIdx);   // 4. dayIdx 가져오기
        // console.log(dayIdxArr);

        for (let i=0; i<dayIdxArr.length; i++) {   // 5. day에 입력된 data들을 dayIdx를 가지고 DB에 insert
            let areaArr = day[i].area;
            if (areaArr !== undefined) {   // area(장소)를 입력했다면
                if (areaArr.length !== 0) {
                    for (let j=0; j<areaArr.length; j++) {
                        // console.log(areaArr[j].category);
                        await feedDao.insertDayArea(connection, [dayIdxArr[i].dayIdx, areaArr[j].category, parseFloat(areaArr[j].latitude.toFixed(7)), parseFloat(areaArr[j].longitude.toFixed(7)), areaArr[j].name, areaArr[j].address]);
                        dayAreaIdx = (await feedDao.selectDayAreaIdx(connection, [dayIdxArr[i].dayIdx, areaArr[j].category, parseFloat(areaArr[j].latitude.toFixed(7)), parseFloat(areaArr[j].longitude.toFixed(7)), areaArr[j].name]))[0].dayAreaIdx;   // dayAreaIdx 가져오기
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
        }

        // 6. metadata
        if (thumnails !== undefined) {
            if (thumnails.length !== 0) {
                for (let timg of thumnails)
                    await feedDao.insertThumnails(connection, [travelIdx, timg]);
            }
        }

        if (hashtagArr !== undefined) {
            if (hashtagArr.length !== 0) {
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
        }

        // await connection.rollback();
        return travelIdx;
        // return response(baseResponse.TRAVEL_UPLOAD_SUCCESS);
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
        // user status check
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

        // 본인의 게시물인지 확인하기 (본인의 게시물에는 좋아요 못함)
        const feedWriterIdx = (await feedDao.selectFeedWriterIdx(connection, travelIdx))[0].userIdx;
        if (userIdx === feedWriterIdx)
            return errResponse(baseResponse.TRAVEL_MYFEED_LIKE_ERROR);

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

        // 본인의 게시물인지 확인하기 (본인의 게시물에는 좋아요 못함)
        const feedWriterIdx = (await feedDao.selectFeedWriterIdx(connection, travelIdx))[0].userIdx;
        if (userIdx === feedWriterIdx)
            return errResponse(baseResponse.TRAVEL_MYFEED_LIKE_ERROR);

        // 점수가 이미 업로드 되어있는지 확인하기
        // 이전 점수랑 같으면 에러 발생
        // 이미 업로드 되어있으면 수정으로 넘어가기
        const scoreCheckRow = await feedDao.selectIsScoreExist(connection, [userIdx, travelIdx]);
        if (scoreCheckRow[0].isScoreExist === 1) {   // 이미 업로드가 되어있을 경우
            const beforeTravelScore = (await feedDao.selectFeedScore(connection, [userIdx, travelIdx]))[0].score;
            if (beforeTravelScore === score)
                return errResponse(baseResponse.TRAVEL_SCORE_BEFORE_EQUAL);
            else {
                await feedDao.updateTravelScore(connection, [userIdx, travelIdx, score]);
                return response(baseResponse.TRAVEL_SCORE_EDIT_SUCCESS);
            }
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

// 댓글 작성하기
exports.createTravelComment = async function (userIdx, travelIdx, comment, isParent, check) {
    const connection = await pool.getConnection(async (conn) => conn);

    try {
        // 실제로 있는 게시물인지 확인하기
        const isFeedExist = (await feedDao.selectIsTravelExist(connection, travelIdx))[0].isTravelExist;
        if (isFeedExist === 0)
            return errResponse(baseResponse.TRAVEL_NOT_EXIST);

        // 게시물 상태 확인하기 (숨김 또는 삭제됨)
        // 본인 게시물에서는 숨김 상태에서도 작성 가능하게?
        const feedStatusCheckRow = (await feedDao.selectTravelStatus(connection, travelIdx))[0].travelStatus;

        if (check === 'M') {   // 본인 게시물일 경우
            if (feedStatusCheckRow === 'DELETED')
                return errResponse(baseResponse.TRAVEL_STATUS_DELETED);
        } else {   // 상대방 게시물일 경우
            if (feedStatusCheckRow === 'PRIVATE')
                return errResponse(baseResponse.TRAVEL_STATUS_PRIVATE);
            else if (feedStatusCheckRow === 'DELETED')
                return errResponse(baseResponse.TRAVEL_STATUS_DELETED);
        }

        /*
            isParent가 null 아니면 -> 대댓글 (부모 댓글의 idx)
            isParent가 그러면 실제로 존재하는 부모 댓글 idx인지 확인하기
         */
        if (isParent !== undefined) {
            // 해당 게시물에 실제로 존재하는 부모 댓글인지 확인하기
            const checkParentCommentExist = (await feedDao.selectIsParentCommentExist(connection, [isParent, travelIdx]))[0].isParentCommentExist;
            if (checkParentCommentExist === 0)
                return errResponse(baseResponse.TRAVEL_COMMENT_PARENT_NOT_EXIST);
        }

        if (!isParent) isParent = 0;   // isParent가 undefined이면 부모 댓글로

        // 아무 댓글도 없는 게시물에 처음으로 대댓글을 다는지 확인하기
        const checkCommentCount = (await feedDao.selectTravelCommentCount(connection, travelIdx))[0].commentCount;
        if (checkCommentCount === 0) {
            if (isParent !== 0) {
                return errResponse(baseResponse.TRAVEL_FIRST_COMMENT_MUST_PARENT);
            }
        }

        await feedDao.insertTravelComment(connection, [travelIdx, userIdx, comment, isParent]);   // 댓글 작성하기
        const newCommentIdx = (await feedDao.selectTravelCommentIdx(connection, [travelIdx, userIdx, comment, isParent]))[0].commentIdx;   // 새로운 댓글 idx

        logger.info(`[댓글 작성하기 API] travelIdx: ${travelIdx}, userIdx: ${userIdx}, New Comment Index: ${newCommentIdx}`);
        return response(baseResponse.TRAVEL_COMMENT_CREATE_SUCCESS, { 'commentIdx': newCommentIdx });
    } catch(err) {
        logger.error(`App - createFeedComment Service error\n: ${err.message}`);
        await connection.rollback();
        return errResponse(baseResponse.DB_ERROR);
    } finally {
        connection.release();
    }
};

// 게시물 댓글 수정
exports.changeTravelComment = async function (userIdx, travelIdx, commentIdx, comment, check) {
    const connection = await pool.getConnection(async (conn) => conn);

    try {
        // 실제로 있는 게시물인지 확인하기
        const isFeedExist = (await feedDao.selectIsTravelExist(connection, travelIdx))[0].isTravelExist;
        if (isFeedExist === 0)
            return errResponse(baseResponse.TRAVEL_NOT_EXIST);

        // 게시물 상태 확인하기 (숨김 또는 삭제됨)
        // 본인 게시물에서는 숨김 상태에서도 작성 가능하게?
        const feedStatusCheckRow = (await feedDao.selectTravelStatus(connection, travelIdx))[0].travelStatus;

        if (check === 'M') {   // 본인 게시물일 경우
            if (feedStatusCheckRow === 'DELETED')
                return errResponse(baseResponse.TRAVEL_STATUS_DELETED);
        } else {   // 상대방 게시물일 경우
            if (feedStatusCheckRow === 'PRIVATE')
                return errResponse(baseResponse.TRAVEL_STATUS_PRIVATE);
            else if (feedStatusCheckRow === 'DELETED')
                return errResponse(baseResponse.TRAVEL_STATUS_DELETED);
        }

        // 해당 게시물에 존재하는 댓글인지 확인하기
        const isCommentExist = (await feedDao.selectIsCommentExist(connection, [travelIdx, commentIdx]))[0].isCommentExist;
        if (isCommentExist === 0)
            return errResponse(baseResponse.TRAVEL_COMMENT_NOT_EXIST);

        // 본인의 댓글인지 확인하기
        const isMyComment = (await feedDao.selectIsMyComment(connection, [userIdx, commentIdx]))[0].isMyCommentCheck;
        if (isMyComment === 0)
            return errResponse(baseResponse.TRAVEL_COMMENT_NOT_MINE);

        // 댓글 status 체크하기 (삭제된 댓글인지)
        const commentStatusCheckRow = (await feedDao.selectCommentStatus(connection, commentIdx))[0].status;
        if (commentStatusCheckRow === 'N')
            return errResponse(baseResponse.TRAVEL_COMMENT_DELETED);

        // 이전 댓글과 동일한지 체크하기
        const isSameCommentCheck = (await feedDao.selectTravelComment(connection, commentIdx))[0].comment;
        if (isSameCommentCheck === comment)
            return errResponse(baseResponse.TRAVEL_COMMENT_SAME_BEFORE);

        await feedDao.updateTravelComment(connection, [userIdx, travelIdx, commentIdx, comment]);  // 댓글 수정
        logger.info(`[댓글 수정하기 API] 수정된 댓글 idx: ${commentIdx}`);
        return response(baseResponse.TRAVEL_COMMENT_EDIT_SUCCESS);
    } catch(err) {
        logger.error(`App - changeTravelComment Service error\n: ${err.message}`);
        return errResponse(baseResponse.DB_ERROR);
    } finally {
        connection.release();
    }
};

// 게시물 댓글 조회
exports.retrieveTravelComment = async function (travelIdx, check, page, pageSize) {
    const connection = await pool.getConnection(async (conn) => conn);

    try {
        /* Validation */
        // 실제로 있는 게시물인지 확인하기
        const isFeedExist = (await feedDao.selectIsTravelExist(connection, travelIdx))[0].isTravelExist;
        if (isFeedExist === 0)
            return [-2, errResponse(baseResponse.TRAVEL_NOT_EXIST)]

        // 게시물 상태 확인하기 (숨김 또는 삭제됨)
        const feedStatusCheckRow = (await feedDao.selectTravelStatus(connection, travelIdx))[0].travelStatus;
        if (check === 'M') {   // 본인 게시물일 경우
            if (feedStatusCheckRow === 'DELETED')
                return [-2, errResponse(baseResponse.TRAVEL_STATUS_DELETED)];
        } else {   // 상대방 게시물일 경우
            if (feedStatusCheckRow === 'PRIVATE')
                return [-2, errResponse(baseResponse.TRAVEL_STATUS_PRIVATE)];
            else if (feedStatusCheckRow === 'DELETED')
                return [-2, errResponse(baseResponse.TRAVEL_STATUS_DELETED)];
        }

        let start = (page - 1) * pageSize;
        const totalHeadCommentCount = (await feedDao.selectTotalHeadCommentCount(connection, travelIdx))[0].totalHeadCommentCount;   // 총 부모 댓글 개수 조회
        // console.log(totalHeadCommentCount);
        // const totalCommentCount = (await feedDao.selectTotalCommentCount(connection, travelIdx))[0].totalCount;   // 총 댓글 갯수 조회

        if (page > Math.ceil(totalHeadCommentCount / pageSize)) {
            connection.release();
            return [-1, totalHeadCommentCount];
        }
        else {
            const travelCommentResult = await feedDao.selectTravelCommentList(connection, [travelIdx, check, start, pageSize]);   // 댓글 목록 조회
            return [totalHeadCommentCount, travelCommentResult];
        }
    } catch(err) {
        logger.error(`App - retrieveTravelComment Service error\n: ${err.message}`);
        await connection.rollback();
        return errResponse(baseResponse.DB_ERROR);
    } finally {
        connection.release();
    }
};

// 게시물 댓글 삭제
exports.deleteTravelComment = async (myIdx, travelIdx, commentIdx, check) => {
    const connection = await pool.getConnection(async (conn) => conn);

    try {
        // 실제로 있는 게시물인지 확인하기
        const isFeedExist = (await feedDao.selectIsTravelExist(connection, travelIdx))[0].isTravelExist;
        if (isFeedExist === 0)
            return errResponse(baseResponse.TRAVEL_NOT_EXIST);

        // 게시물 상태 확인하기 (숨김 또는 삭제됨)
        // 본인 게시물에서는 숨김 상태에서도 삭제 가능하게?
        const feedStatusCheckRow = (await feedDao.selectTravelStatus(connection, travelIdx))[0].travelStatus;

        if (check === 'M') {   // 본인 게시물일 경우
            if (feedStatusCheckRow === 'DELETED')
                return errResponse(baseResponse.TRAVEL_STATUS_DELETED);
        } else {   // 상대방 게시물일 경우
            if (feedStatusCheckRow === 'PRIVATE')
                return errResponse(baseResponse.TRAVEL_STATUS_PRIVATE);
            else if (feedStatusCheckRow === 'DELETED')
                return errResponse(baseResponse.TRAVEL_STATUS_DELETED);
        }

        // 해당 게시물에 존재하는 댓글인지 확인하기
        const isCommentExist = (await feedDao.selectIsCommentExist(connection, [travelIdx, commentIdx]))[0].isCommentExist;
        if (isCommentExist === 0)
            return errResponse(baseResponse.TRAVEL_COMMENT_NOT_EXIST);

        // 본인의 댓글인지 확인하기
        const isMyComment = (await feedDao.selectIsMyComment(connection, [myIdx, commentIdx]))[0].isMyCommentCheck;
        if (isMyComment === 0)
            return errResponse(baseResponse.TRAVEL_COMMENT_NOT_MINE);

        // 댓글 status 체크하기 (삭제된 댓글인지)
        const commentStatusCheckRow = (await feedDao.selectCommentStatus(connection, commentIdx))[0].status;
        if (commentStatusCheckRow === 'N')
            return errResponse(baseResponse.TRAVEL_COMMENT_DELETED);

        await feedDao.deleteFeedComment(connection, [myIdx, travelIdx, commentIdx]);  // 댓글 수정
        logger.info(`[댓글 삭제하기 API] 삭제된 댓글 idx: ${commentIdx}`);
        return response(baseResponse.TRAVEL_COMMENT_DELETE_SUCCESS);
    } catch(err) {
        logger.error(`App - deleteTravelComment Service error\n: ${err.message}`);
        await connection.rollback();
        return errResponse(baseResponse.DB_ERROR);
    } finally {
        connection.release();
    }
};

exports.retrieveTravelChildComment = async (travelIdx, commentIdx, check, page, pageSize) => {
    const connection = await pool.getConnection(async (conn) => conn);

    try {
        /* Validation */
        // 실제로 있는 게시물인지 확인하기
        const isFeedExist = (await feedDao.selectIsTravelExist(connection, travelIdx))[0].isTravelExist;
        if (isFeedExist === 0)
            return [-2, errResponse(baseResponse.TRAVEL_NOT_EXIST)];

        // 해당 게시물에 존재하는 comment인지 확인하기
        // commentIdx가 부모 댓글인지 확인하기
        // commentIdx가 삭제된 댓글인지 확인하기

        // 게시물 상태 확인하기 (숨김 또는 삭제됨)
        const feedStatusCheckRow = (await feedDao.selectTravelStatus(connection, travelIdx))[0].travelStatus;
        if (check === 'M') {   // 본인 게시물일 경우
            if (feedStatusCheckRow === 'DELETED')
                return [-2, errResponse(baseResponse.TRAVEL_STATUS_DELETED)];
        } else {   // 상대방 게시물일 경우
            if (feedStatusCheckRow === 'PRIVATE')
                return [-2, errResponse(baseResponse.TRAVEL_STATUS_PRIVATE)];
            else if (feedStatusCheckRow === 'DELETED')
                return [-2, errResponse(baseResponse.TRAVEL_STATUS_DELETED)];
        }

        const travelChildCommentResult = await feedDao.selectTravelChildCommentList(connection, [travelIdx, check, start, pageSize]);   // 댓글 목록 조회


    } catch(err) {
        logger.error(`App - retrieveTravelChildComment Service error\n: ${err.message}`);
        await connection.rollback();
        return errResponse(baseResponse.DB_ERROR);
    } finally {
        connection.release();
    }
};