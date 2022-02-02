const feedProvider = require("../Feed/feedProvider");
const feedService = require("../Feed/feedService");
const userProvider = require("../User/userProvider");
const baseResponse = require("../../../config/baseResponseStatus");
const {response, errResponse} = require("../../../config/response");
const axios = require("axios");
const s3 = require('../../../config/s3');
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
 * [GET] /app/feed/area-search-keyword?area=&x=&y=&page=
 */
exports.searchArea = async (req, res) => {
    /**
     * Headers: REST_API_KEY (KAKAO)
     * Query String: area, x, y, page
     */
    const rest_key = process.env.KAKAO_REST_KEY;
    const area = String(req.query.area);   // 검색어
    const x = String(req.query.x);   // 본인의 X좌표 (경도)
    const y = String(req.query.y);   // 본인의 Y좌표 (위도)
    const page = parseInt(req.query.page);   // 결과 페이지 번호
    const sort_method = "distance";   // 정확성 vs 거리순
    const size = 10;   // 한 페이지에서 보여지는 data의 갯수Q

    if (!area)
        return res.send(errResponse(baseResponse.AREA_EMPTY));
    if (!x)
        return res.send(errResponse(baseResponse.POINT_X_EMPTY));
    if (!y)
        return res.send(errResponse(baseResponse.POINT_Y_EMPTY));
    if (!page)
        return res.send(errResponse(baseResponse.PAGE_EMPTY));
    if (page < 1 || page > 6)
        return res.send(errResponse(baseResponse.PAGE_NUMBER_ERROR));

    let result;
    let url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${area}&x=${x}&y=${y}&page=${page}&size=${size}&sort=${sort_method}`
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
        case '도보 여행':
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
    return res.send(createFeedResult);
};

/**
 * API No. 16
 * API Name : 임시 여행 게시물 이미지 삭제 API
 * [DELETE] /app/feeds/timage-delete?dirname=
 */
exports.deleteTempImage = async function (req, res) {
    const image_key = req.headers.image_key;
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