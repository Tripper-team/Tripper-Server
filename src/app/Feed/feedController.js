const feedProvider = require("../Feed/feedProvider");
const feedService = require("../Feed/feedService");
const userProvider = require("../User/userProvider");
const baseResponse = require("../../../config/baseResponseStatus");
const {response, errResponse} = require("../../../config/response");
const axios = require("axios");
const s3 = require('../../../config/s3');
const feedDao = require("./feedDao");
require('dotenv').config();

const regex_date = /^(19|20)\d{2}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[0-1])$/;

function calDay(firstDate, secondDate) {
    let dateFirstDate = new Date(firstDate.substring(0, 4), firstDate.substring(4, 6) - 1, firstDate.substring(6, 8));
    let dateSecondDate =
        new Date(secondDate.substring(0, 4), secondDate.substring(4, 6) - 1, secondDate.substring(6, 8));
    let betweenTime = Math.abs(dateSecondDate.getTime() - dateFirstDate.getTime());
    return Math.floor(betweenTime / (1000 * 60 * 60 * 24));
}

const deleteS3Object = async (params, key, res) => {
    let listObjects = await s3.listObjectsV2(params).promise();
    let deleteParams;
    let find = 0;

    if (listObjects.Contents.length === 0)
        return res.send(errResponse(baseResponse.AWS_S3_FILE_NOT_FOUND));

    listObjects.Contents.forEach((info) => {
        const storedKey = info.Key;
        if (storedKey === key) {
            find = 1;
            deleteParams = { Bucket: process.env.AWS_S3_BUCKET_NAME, Key: storedKey };
            s3.deleteObject(deleteParams, (err, data) => {
                if (err) {
                    console.log("AWS 문제로 인해 삭제에 실패했습니다.");
                    return res.send(errResponse(baseResponse.AWS_S3_ERROR));
                } else {
                    console.log("삭제에 성공했습니다!");
                    console.log(data);
                    return res.send(response(baseResponse.AWS_S3_DELETE_SUCCESS));
                }
            });
            return false;
        }
    });

    if (find === 0)
        return res.send(errResponse(baseResponse.AWS_S3_KEY_NOT_MATCH));
};

/**
 * API No. 12
 * API Name : 장소 검색 API
 * [GET] /app/feed/area-search-keyword?area=&page=
 */
exports.searchArea = async (req, res) => {
    /**
     * Query String: area, page
     */
    const rest_key = process.env.KAKAO_REST_KEY;
    const area = String(req.query.area);   // 검색어
    const page = parseInt(req.query.page);   // 결과 페이지 번호
    const sort_method = "accuracy";   // 정확성 vs 거리순
    const size = 10;   // 한 페이지에서 보여지는 data의 갯수


    if (!area)
        return res.send(errResponse(baseResponse.AREA_EMPTY));
    if (area.length < 2)
        return res.send(errResponse(baseResponse.AREA_LENGTH_ERROR));
    if (!page && page !== 0)
        return res.send(errResponse(baseResponse.PAGE_EMPTY));
    if (page < 1 || page >= 6 )
        return res.send(errResponse(baseResponse.PAGE_NUMBER_ERROR));

    let result;
    // let url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${area}&x=${x}&y=${y}&page=${page}&size=${size}&sort=${sort_method}`
    let url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${area}&page=${page}&size=${size}&sort=${sort_method}`
    try {
        result = await axios({
            method: 'GET',
            url: encodeURI(url),
            headers: {
                'Content-Type': 'application/json',
                Authorization: `KakaoAK ${rest_key}`,
            }
        });
    } catch(err) {
        return res.send(errResponse(baseResponse.AREA_SEARCH_FAILED));
    }

    if ((result.data.documents).length === 0)   // 조회 결과가 없으면?
        return res.send(errResponse(baseResponse.AREA_SEARCH_RESULT_EMPTY));

    let is_end = result.data.meta.is_end;
    let result_arr = result.data.documents;
    let new_result_arr = [];

    for(let i in result_arr) {
        if (result_arr[i].category_group_code === '') result_arr[i].category_group_code = null;
        if (result_arr[i].category_group_name === '') result_arr[i].category_group_name = null;

        let temp = {
            address_name: result_arr[i].address_name,
            category_code: result_arr[i].category_group_code,
            category_name: result_arr[i].category_group_name,
            place_name: result_arr[i].place_name,
            x: result_arr[i].x,
            y: result_arr[i].y
        };

        new_result_arr.push(temp);
    }

    return res.send(response(baseResponse.AREA_INQUIRE_KEYWORD_SUCCESS, { 'pageNum': page, 'is_end': is_end, 'list': new_result_arr }));
};

/**
 * API No. 13
 * API Name : 여행 게시물 작성하기 API
 * [POST] /app/feeds/
 */
exports.postFeed = async function (req, res) {
    const information = req.body.information;
    const metadata = req.body.metadata;
    const day = req.body.day;
    const userIdx = req.verifiedToken.userIdx;

    console.log("[information]");
    console.log(information);
    console.log("[metadata]");
    console.log(metadata);
    console.log("[day]");
    console.log(day);

    // user
    const userStatusCheckRow = await userProvider.checkUserStatus(userIdx);
    if (userStatusCheckRow[0].isWithdraw === 'Y')
        return res.send(errResponse(baseResponse.USER_WITHDRAW));

    // information
    const startDate = information.startDate;
    const endDate = information.endDate;
    let traffic = information.traffic;
    const title = information.title;
    const introduce = information.introduce;

    // metadata
    let hashtagArr, thumnails;
    if (metadata === undefined) {
        hashtagArr = [];
        thumnails = [];
    } else {
        hashtagArr = metadata.hashtag;
        thumnails = metadata.thumnails;
    }

    // information validation -> 제목, 소개만 필수
    if (!information)
        return res.send(errResponse(baseResponse.FEED_INFORMATION_EMPTY));
    if (!startDate)
        return res.send(errResponse(baseResponse.FEED_STARTDATE_EMPTY));
    if (!endDate)
        return res.send(errResponse(baseResponse.FEED_ENDDATE_EMPTY));
    if (!regex_date.test(startDate) || !regex_date.test(endDate))
        return res.send(errResponse(baseResponse.FEED_DATE_ERROR_TYPE))
    if (!traffic)
        return res.send(errResponse(baseResponse.FEED_TRAFFIC_EMPTY));
    if (!title)
        return res.send(errResponse(baseResponse.FEED_TITLE_EMPTY));
    if (!introduce)
        return res.send(errResponse(baseResponse.FEED_INTRODUCE_EMPTY));

    // traffic 형식 validation
    switch(traffic)
    {
        case '자차로 여행':
            traffic = 'C';
            break;
        case '대중교통 여행':
            traffic = 'P';
            break;
        case '자전거 여행':
            traffic = 'B';
            break;
        case '도보로 여행':
            traffic = 'W';
            break;
        default:
            return res.send(errResponse(baseResponse.FEED_TRAFFIC_ERROR_TYPE));
    }

    const dateDiff = calDay(startDate.replace(/-/gi, ""), endDate.replace(/-/gi, "")) + 1;

    // Day
    if (!day)
        return res.send(errResponse(baseResponse.FEED_DAY_EMPTY));
    if (day.length !== dateDiff)
        return res.send(errResponse(baseResponse.FEED_DAY_NOT_MATCH));

    // metadata -> 해시태그, 썸네일 사진 없어도 괜찮음!

    const createFeedResult = await feedService.createNewFeed(
        userIdx, startDate, endDate, traffic, title,
        introduce, hashtagArr, thumnails, day, dateDiff
    );
    return res.send(response(baseResponse.TRAVEL_UPLOAD_SUCCESS, { 'travelIdx': createFeedResult }));
};

/**
 * API No. 16
 * API Name : 임시 여행 게시물 이미지 삭제 API
 * [DELETE] /app/feeds/timage-delete?dirname=
 */
exports.deleteTempImage = async function (req, res) {
    const image_key = req.headers.imgkey;
    const dirname = req.query.dirname;
    const s3_dirname = `temp/${dirname}`;

    if (!dirname)
        return res.send(errResponse(baseResponse.S3_PREFIX_EMPTY));
    if (dirname !== "thumnails" && dirname !== "travels")
        return res.send(errResponse(baseResponse.S3_PREFIX_ERROR));
    if (!image_key)
        return res.send(errResponse(baseResponse.S3_IMAGE_KEY_EMPTY));

    await deleteS3Object({
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        Prefix: `${s3_dirname}/`
    }, image_key, res);
};

/**
 * API No. 18
 * API Name : 여행 게시물 삭제하기 API
 * [PATCH] /app/feeds/:feedIdx/deletion
 */
exports.deleteFeed = async function (req, res) {
    const userIdx = req.verifiedToken.userIdx;
    const travelIdx = req.params.feedIdx;

    if (!travelIdx)
        return res.send(errResponse(baseResponse.TRAVEL_IDX_EMPTY));

    const deleteFeedResponse = await feedService.patchFeedToDeleted(userIdx, travelIdx);
    return res.send(deleteFeedResponse);
};


/**
 * API No. 19
 * API Name : 여행 게시물 좋아요 API
 * [POST] /app/feeds/like
 */
exports.postFeedLike = async function (req, res) {
    const travelIdx = req.body.travelIdx;
    const userIdx = req.verifiedToken.userIdx;

    if (!travelIdx)
        return res.send(errResponse(baseResponse.TRAVEL_IDX_EMPTY));

    const likeFeedResponse = await feedService.createFeedLike(userIdx, travelIdx);
    return res.send(likeFeedResponse);
};

/**
 * API No. 20
 * API Name : 여행 게시물 점수부여 API
 * [POST] /app/feeds/score
 */
exports.postFeedScore = async function (req, res) {
    const userIdx = req.verifiedToken.userIdx;
    const travelIdx = req.body.travelIdx;
    const score = req.body.score;

    if (!travelIdx)
        return res.send(errResponse(baseResponse.TRAVEL_IDX_EMPTY));
    if (!score)
        return res.send(errResponse(baseResponse.TRAVEL_SCORE_EMPTY));
    if (score < 1 || score > 5)
        return res.send(errResponse(baseResponse.TRAVEL_SCORE_TYPE_ERROR));

    const scoreFeedResponse = await feedService.createFeedScore(userIdx, travelIdx, score);
    return res.send(scoreFeedResponse);
};

/**
 * API No. 10
 * API Name : 여행 게시물 공개 범위 전환 API
 * [PATCH] /app/feeds/:feedIdx/change-status
 */
exports.patchFeedStatus = async function (req, res) {
    const userIdx = req.verifiedToken.userIdx;
    const travelIdx = req.params.feedIdx;

    if (!travelIdx)
        return res.send(errResponse(baseResponse.TRAVEL_IDX_EMPTY));

    const patchFeedStatusResponse = await feedService.patchFeedStatus(userIdx, travelIdx);
    return res.send(patchFeedStatusResponse);
};


/**
 * API No. FD11
 * API Name : 특정 여행 게시물 조회하기 API
 * [GET] /app/feeds/:feedIdx/travel
 */
exports.getFeed = async function (req, res) {
    const userIdx = req.verifiedToken.userIdx;
    const travelIdx = req.params.feedIdx;
    let isMine = 0;

    console.log(userIdx);

    // Validation
    if (!travelIdx && travelIdx !== 0)
        return res.send(errResponse(baseResponse.TRAVEL_IDX_EMPTY));

    const userStatusCheckRow = await userProvider.checkUserStatus(userIdx);
    if (userStatusCheckRow[0].isWithdraw === 'Y')
        return res.send(errResponse(baseResponse.USER_WITHDRAW));

    const travelStatus = await feedProvider.retrieveTravelStatus(travelIdx);

    // 클릭한 게시물이 본인의 게시물이 아닐 경우
    // PRIVATE 상태이면 조회 불가능
    const travelWriterIdx = await feedProvider.retrieveTravelWriter(travelIdx);

    if (travelWriterIdx === userIdx) {   // 본인의 게시물일 경우
        isMine = 1;
        if (travelStatus === 'DELETED')
            return res.send(errResponse(baseResponse.TRAVEL_STATUS_DELETED));
    }
    else {   // 다른 사람 게시물일 경우
        if ((await userProvider.checkUserStatus(travelWriterIdx))[0].isWithdraw === 'Y')
            return res.send(errResponse(baseResponse.TRAVEL_WRITER_WITHDRAW));
        else {
            if (travelStatus === 'DELETED')
                return res.send(errResponse(baseResponse.TRAVEL_STATUS_DELETED));
            else if (travelStatus === 'PRIVATE')
                return res.send(errResponse(baseResponse.TRAVEL_STATUS_PRIVATE));
        }
    }

    const getFeedResponse = await feedProvider.retrieveFeedInfo(userIdx, travelWriterIdx, travelIdx, isMine);
    return res.send(response(baseResponse.TRAVEL_SEARCH_SUCCESS, getFeedResponse));
};

/**
 * API No. FD12
 * API Name : 특정 여행 게시물 day 정보 조회 API
 * [GET] /app/feeds/:feedIdx/search/dayinfo?day=
 */
exports.getFeedDayInfo = async function (req, res) {
    const userIdx = req.verifiedToken.userIdx;
    const travelIdx = req.params.feedIdx;
    const dayIdx = req.query.day;
    let isMine = 0;

    // Validation
    if (!travelIdx && travelIdx !== 0)
        return res.send(errResponse(baseResponse.TRAVEL_IDX_EMPTY));

    const userStatusCheckRow = await userProvider.checkUserStatus(userIdx);
    if (userStatusCheckRow[0].isWithdraw === 'Y')
        return res.send(errResponse(baseResponse.USER_WITHDRAW));

    const travelStatus = await feedProvider.retrieveTravelStatus(travelIdx);

    // 클릭한 게시물이 본인의 게시물이 아닐 경우
    // PRIVATE 상태이면 조회 불가능
    const travelWriterIdx = await feedProvider.retrieveTravelWriter(travelIdx);

    if (travelWriterIdx === userIdx) {   // 본인의 게시물일 경우
        isMine = 1;
        if (travelStatus === 'DELETED')
            return res.send(errResponse(baseResponse.TRAVEL_STATUS_DELETED));
    }
    else {   // 다른 사람 게시물일 경우
        if ((await userProvider.checkUserStatus(travelWriterIdx))[0].isWithdraw === 'Y')
            return res.send(errResponse(baseResponse.TRAVEL_WRITER_WITHDRAW));
        else {
            if (travelStatus === 'DELETED')
                return res.send(errResponse(baseResponse.TRAVEL_STATUS_DELETED));
            else if (travelStatus === 'PRIVATE')
                return res.send(errResponse(baseResponse.TRAVEL_STATUS_PRIVATE));
        }
    }

    if (!dayIdx)
        return res.send(errResponse(baseResponse.DAY_IDX_EMPTY));

    // day가 해당 게시물에 포함이 되어있는지
    const isDayIncluded = await feedProvider.checkIsDayIncluded(travelIdx, dayIdx);
    if (isDayIncluded === 0)
        return res.send(errResponse(baseResponse.TRAVEL_DAY_NOT_INCLUDED));

    const getFeedDayInfo = await feedProvider.retrieveFeedDayInfo(userIdx, travelIdx, dayIdx, isMine);
    if (getFeedDayInfo.length === 0)
        return res.send(errResponse(baseResponse.TRAVEL_DAY_RESULT_EMPTY));
    else
        return res.send(response(baseResponse.DAYINFO_SEARCH_SUCCESS, getFeedDayInfo));
};

/**
 * API No. FD13
 * API Name : 여행 게시물 댓글 생성하기 API
 * [POST] /app/feeds/comment
 */
exports.postComment = async function (req, res) {
    const userIdx = req.verifiedToken.userIdx;   // JWT의 사용자 idx
    const { travelIdx, comment, isParent } = req.body;   // 게시물 idx, 댓글 내용, 댓글 분류
    const travelWriterIdx = await feedProvider.retrieveTravelWriter(travelIdx);   // 게시물 작성자 인덱스
    const userStatusCheckRow = await userProvider.checkUserStatus(userIdx);   // 자기 상태
    const writerStatusCheckRow = await userProvider.checkUserStatus(travelWriterIdx);   // 게시물 작성자 상태
    let check = '';

    /* Validation */
    if (!travelIdx)   // 게시물 idx가 없다면
        return res.send(errResponse(baseResponse.TRAVEL_IDX_EMPTY));
    if (!comment)   // 댓글 내용이 없다면
        return res.send(errResponse(baseResponse.TRAVEL_COMMENT_EMPTY));
    if (comment.length > 200)   // 댓글은 200자 까지
        return res.send(errResponse(baseResponse.TRAVEL_COMMENT_LENGTH_ERROR));
    if (userStatusCheckRow[0].isWithdraw === 'Y')
        return res.send(errResponse(baseResponse.USER_WITHDRAW));
    if (writerStatusCheckRow[0].isWithdraw === 'Y')
        return res.send(errResponse(baseResponse.TRAVEL_WRITER_WITHDRAW));

    if (travelWriterIdx === userIdx) check = 'M';   // 게시물 작성자와 본인 인덱스가 같을 경우
    else check = 'O';   // 상대방의 게시물일 경우

    const createCommentResponse = await feedService.createTravelComment(userIdx, travelIdx, comment, isParent, check);
    return res.send(createCommentResponse);
};

/**
 * API No. FD14
 * API Name : 여행 게시물 댓글 수정하기 API
 * [PATCH] /app/feeds/:feedIdx/comments/:commentIdx/change
 */
exports.patchComment = async function (req, res) {
    const travelIdx = req.params.feedIdx;   // 게시물 idx
    const commentIdx = req.params.commentIdx;   // 댓글 idx
    const comment = req.body.comment;   // 수정할 댓글 내용
    const userIdx = req.verifiedToken.userIdx;   // JWT의 사용자 idx
    const travelWriterIdx = await feedProvider.retrieveTravelWriter(travelIdx);   // 게시물 작성자 인덱스
    const userStatusCheckRow = await userProvider.checkUserStatus(userIdx);   // 자기 상태
    const writerStatusCheckRow = await userProvider.checkUserStatus(travelWriterIdx);   // 게시물 작성자 상태
    let check = '';

    /* Validation */
    if (!travelIdx)
        return res.send(errResponse(baseResponse.TRAVEL_IDX_EMPTY));
    if (!commentIdx)
        return res.send(errResponse(baseResponse.TRAVEL_COMMENT_IDX_EMPTY));
    if (!comment)
        return res.send(errResponse(baseResponse.TRAVEL_COMMENT_EMPTY));
    if (comment.length > 200)
        return res.send(errResponse(baseResponse.TRAVEL_COMMENT_LENGTH_ERROR));
    if (userStatusCheckRow[0].isWithdraw === 'Y')
        return res.send(errResponse(baseResponse.USER_WITHDRAW));
    if (writerStatusCheckRow[0].isWithdraw === 'Y')
        return res.send(errResponse(baseResponse.TRAVEL_WRITER_WITHDRAW));

    if (travelWriterIdx === userIdx) check = 'M';   // 게시물 작성자와 본인 인덱스가 같을 경우
    else check = 'O';   // 상대방의 게시물일 경우

    const patchCommentResponse = await feedService.changeTravelComment(userIdx, travelIdx, commentIdx, comment, check);
    return res.send(patchCommentResponse);
};


/**
 * API No. FD15
 * API Name : 여행 게시물 부모 댓글 조회하기 API
 * [GET] /app/feeds/:feedIdx/comments-list?page=
 */
exports.getFeedComment = async function (req, res) {
    const travelIdx = req.params.feedIdx;   // 댓글 조회할 여행 게시물 인덱스
    const userIdx = req.verifiedToken.userIdx;   // 본인 인덱스
    let page = parseInt(req.query.page);   // 페이지 넘버
    const pageSize = 10;   // 각 페이지마다 item 개수
    const userStatusCheckRow = await userProvider.checkUserStatus(userIdx);   // User 회원탈퇴 상태 확인
    const travelWriterIdx = await feedProvider.retrieveTravelWriter(travelIdx);   // 게시물 작성자 인덱스
    const writerStatusCheckRow = await userProvider.checkUserStatus(travelWriterIdx);   // 게시물 작성자 회원탈퇴 상태 확인
    let check = '';

    /* Validation */
    if (!travelIdx)   // 여행 게시물 인덱스 입력x
        return res.send(errResponse(baseResponse.TRAVEL_IDX_EMPTY));
    if (!page && page !== 0)   // 페이징 넘버 없을경우
        return res.send(errResponse(baseResponse.COMMENT_PAGE_EMPTY));
    if (page <= 0)   // 페이징 번호가 0이하일 경우
        return res.send(errResponse(baseResponse.COMMENT_PAGE_ERROR_TYPE));
    if (userStatusCheckRow[0].isWithdraw === 'Y')   // 회원탈퇴 유저
        return res.send(errResponse(baseResponse.USER_WITHDRAW));
    if (writerStatusCheckRow[0].isWithdraw === 'Y')   // 게시물 작성자 회원탈퇴 상태일 때
        return res.send(errResponse(baseResponse.TRAVEL_WRITER_WITHDRAW));

    if (travelWriterIdx === userIdx) check = 'M';   // 게시물 작성자와 본인 인덱스가 같을 경우
    else check = 'O';   // 상대방의 게시물일 경우

    const getTravelCommentResponse = await feedService.retrieveTravelComment(travelIdx, check, page, pageSize);

    switch(getTravelCommentResponse[0])
    {
        case -2:
            return res.send(getTravelCommentResponse[1]);
        case -1:
            return res.send(response(baseResponse.TRAVEL_COMMENT_FINISH, { 'totalCommentCount': getTravelCommentResponse[1] }));
        default:
            return res.send(response(baseResponse.TRAVEL_COMMENT_SEARCH_SUCCESS, { 'totalCommentCount': getTravelCommentResponse[0], 'comments': getTravelCommentResponse[1] }));
    }
};

/**
 * API No. FD16
 * API Name : 여행 게시물 댓글 삭제하기 API
 * [PATCH] /app/feeds/:feedIdx/comments/:commentIdx/deletion
 */
exports.deleteComment = async (req, res) => {
    const myIdx = req.verifiedToken.userIdx;   // 본인 idx
    const travelIdx = req.params.feedIdx;
    const commentIdx = req.params.commentIdx;
    const travelWriterIdx = await feedProvider.retrieveTravelWriter(travelIdx);   // 게시물 작성자 인덱스
    const userStatusCheckRow = await userProvider.checkUserStatus(myIdx);   // 자기 상태
    const writerStatusCheckRow = await userProvider.checkUserStatus(travelWriterIdx);   // 게시물 작성자 상태
    let check = '';

    /* Validation */
    if (!travelIdx)
        return res.send(errResponse(baseResponse.TRAVEL_IDX_EMPTY));
    if (!commentIdx)
        return res.send(errResponse(baseResponse.TRAVEL_COMMENT_IDX_EMPTY));
    if (userStatusCheckRow[0].isWithdraw === 'Y')
        return res.send(errResponse(baseResponse.USER_WITHDRAW));
    if (writerStatusCheckRow[0].isWithdraw === 'Y')
        return res.send(errResponse(baseResponse.TRAVEL_WRITER_WITHDRAW));

    if (travelWriterIdx === myIdx) check = 'M';   // 게시물 작성자와 본인 인덱스가 같을 경우
    else check = 'O';   // 상대방의 게시물일 경우

    const deleteCommentResponse = await feedService.deleteTravelComment(myIdx, travelIdx, commentIdx, check);
    return res.send(deleteCommentResponse);
};

/**
 * API No. FD17
 * API Name : 특정 여행 게시물 장소 리뷰 조회 API
 * [GET] /app/feeds/:feedIdx/search/review?day=&area=
 */
exports.getFeedAreaInfo = async function (req, res) {
    const travelIdx = req.params.feedIdx;
    const dayIdx = req.query.day;
    const areaIdx = req.query.area;
    const myIdx = req.verifiedToken.userIdx;
    const travelWriterIdx = await feedProvider.retrieveTravelWriter(travelIdx);

    // Validation
    if (!travelIdx && travelIdx !== 0)
        return res.send(errResponse(baseResponse.TRAVEL_IDX_EMPTY));
    if (!dayIdx)
        return res.send(errResponse(baseResponse.DAY_IDX_EMPTY));
    if (!areaIdx)
        return res.send(errResponse(baseResponse.AREA_IDX_EMPTY));

    // 사용자 status 확인
    const userStatusCheckRow = await userProvider.checkUserStatus(myIdx);
    if (userStatusCheckRow[0].isWithdraw === 'Y')
        return res.send(errResponse(baseResponse.USER_WITHDRAW));

    // 게시물 작성자의 status 확인
    const writerStatusCheckRow = await userProvider.checkUserStatus(travelWriterIdx);
    if (writerStatusCheckRow[0].isWithdraw === 'Y')
        return res.send(errResponse(baseResponse.TRAVEL_WRITER_WITHDRAW2));

    // 실제 있는 dayIdx인지 확인하기
    const dayIdxCheckRow = await feedProvider.checkIsDayIncluded(travelIdx, dayIdx);
    if (dayIdxCheckRow === 0)
        return res.send(errResponse(baseResponse.TRAVEL_DAY_NOT_INCLUDED));

    // 실제 있는 areaIdx인지 확인하기
    const areaIdxCheckRow = await feedProvider.checkIsAreaIncluded(dayIdx, areaIdx);
    if (areaIdxCheckRow === 0)
        return res.send(errResponse(baseResponse.TRAVEL_DAYAREA_NOT_INCLUDED));

    /*
        게시물 status 확인
        - DELETED면 errResponse return.
        - PRIVATE면 개인 게시물이면 가능.
     */
    const travelStatusCheckRow = await feedProvider.checkTravelStatus(travelIdx);

    if (travelStatusCheckRow === 'DELETED')
        return res.send(errResponse(baseResponse.TRAVEL_STATUS_DELETED));
    else {
        if (travelStatusCheckRow === 'PRIVATE') {
            if (travelWriterIdx !== myIdx)
                return res.send(errResponse(baseResponse.TRAVEL_STATUS_PRIVATE));
        }

        const areaReviewResponse = await feedProvider.retrieveAreaReview(travelIdx, dayIdx, areaIdx);
        return res.send(response(baseResponse.AREAINFO_SEARCH_SUCCESS, { 'travelAreaReviewImage': areaReviewResponse[0], 'travelAreaReviewComment': areaReviewResponse[1] }));
    }
};

/**
 * API No. FD18
 * API Name : 여행 게시물 대댓글 조회 API
 * [GET] /app/feeds/:feedIdx/comments/:commentIdx/child-comments?page=
 * 부모 댓글을 입력하면 그거에 해당하는 자식 댓글들 조회
 */
exports.getFeedChildComment = async (req, res) => {
    const myIdx =  req.verifiedToken.userIdx;
    const travelIdx = req.params.feedIdx;
    const commentIdx = req.params.commentIdx;
    const userStatusCheckRow = await userProvider.checkUserStatus(myIdx);   // User 회원탈퇴 상태 확인
    const travelWriterIdx = await feedProvider.retrieveTravelWriter(travelIdx);   // 게시물 작성자 인덱스
    const writerStatusCheckRow = await userProvider.checkUserStatus(travelWriterIdx);   // 게시물 작성자 회원탈퇴 상태 확인

    let page = parseInt(req.query.page);   // 페이지 넘버
    const pageSize = 10;   // 각 페이지마다 item 개수
    let check = '';

    /* Validation */
    if (!travelIdx)   // 여행 게시물 인덱스 입력x
        return res.send(errResponse(baseResponse.TRAVEL_IDX_EMPTY));
    if (!commentIdx)   // 댓글 인덱스 입력x
        return res.send(errResponse(baseResponse.TRAVEL_COMMENT_IDX_EMPTY));
    if (!page && page !== 0)   // 페이징 넘버 없을경우
        return res.send(errResponse(baseResponse.COMMENT_PAGE_EMPTY));
    if (page <= 0)   // 페이징 번호가 0이하일 경우
        return res.send(errResponse(baseResponse.COMMENT_PAGE_ERROR_TYPE));
    if (userStatusCheckRow[0].isWithdraw === 'Y')   // 회원탈퇴 유저
        return res.send(errResponse(baseResponse.USER_WITHDRAW));
    if (writerStatusCheckRow[0].isWithdraw === 'Y')   // 게시물 작성자 회원탈퇴 상태일 때
        return res.send(errResponse(baseResponse.TRAVEL_WRITER_WITHDRAW));

    if (travelWriterIdx === myIdx) check = 'M';   // 게시물 작성자와 본인 인덱스가 같을 경우
    else check = 'O';   // 상대방의 게시물일 경우

    const getTravelChildCommentResponse = await feedProvider.retrieveTravelChildComment(travelIdx, commentIdx, check, page, pageSize);
    if (getTravelChildCommentResponse[0] === -1)
        return res.send(getTravelChildCommentResponse[1]);
    else return res.send(response(baseResponse.TRAVEL_CHILD_COMMENT_SUCCESS, getTravelChildCommentResponse));
};
