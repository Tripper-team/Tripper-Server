const feedProvider = require("../Feed/feedProvider");
const feedService = require("../Feed/feedService");
const baseResponse = require("../../../config/baseResponseStatus");
const {response, errResponse} = require("../../../config/response");
const axios = require("axios");
const s3 = require('../../../config/s3');
require('dotenv').config();

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
    const rest_key = req.headers['kakao-rest-key'];
    const area = String(req.query.area);   // 검색어
    const x = String(req.query.x);   // 본인의 X좌표 (경도)
    const y = String(req.query.y);   // 본인의 Y좌표 (위도)
    const page = parseInt(req.query.page);   // 결과 페이지 번호
    const sort_method = "distance";   // 정확성 vs 거리순
    const size = 10;   // 한 페이지에서 보여지는 data의 갯수

    if (!rest_key)
        return res.send(errResponse(baseResponse.KAKAO_REST_KEY_EMPTY));
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
 * API No. 16
 * API Name : 임시 여행 게시물 이미지 삭제 API
 * [DELETE] /app/feeds/timage-delete?dirname=
 */
exports.deleteTempImage = async function (req, res) {
    const image_key = req.headers.image_key;
    const dirname = req.query.dirname;
    const s3_dirname = `temp/${dirname}`;

    if (!dirname)
        return res.send(response(baseResponse.S3_PREFIX_EMPTY));
    if (dirname !== "thumnails" && dirname !== "travels")
        return res.send(response(baseResponse.S3_PREFIX_ERROR));
    if (!image_key)
        return res.send(response(baseResponse.S3_IMAGE_KEY_EMPTY));

    await deleteS3Object({
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        Prefix: `${s3_dirname}/`
    }, image_key, res);
};