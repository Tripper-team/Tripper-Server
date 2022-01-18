const feedProvider = require("../Feed/feedProvider");
const feedService = require("../Feed/feedService");
const baseResponse = require("../../../config/baseResponseStatus");
const {response, errResponse} = require("../../../config/response");
const axios = require("axios");
const secret_config = require("../../../config/secret");
const jwt = require("jsonwebtoken");
require('dotenv').config();

/**
 * API No. 12
 * API Name : 장소 검색 API
 * [GET] /app/feed/area-search?area=
 */
exports.searchArea = async (req, res) => {
    /**
     * Body: REST_API_KEY (KAKAO)
     */
    const rest_key = req.body.rest_key;
    const area = req.query.area;
    const x = req.query.x;
    const y = req.query.y;
    const radius = req.query.radius;

    let result;
    let url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${area}&y=${y}&x=${x}&radius=${radius}&sort=distance`;
    try {
        result = await axios({
            method: 'GET',
            url: encodeURI(url),
            withCredentials: true,
            headers: {
                'Content-Type': 'application/json',
                Authorization: `KakaoAK ${rest_key}`,
            }
        });
        return res.send(response(baseResponse.SUCCESS, result.data.documents));
    } catch(err) {
        console.log(err);
    }
};