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
 * [GET] /app/feed/area-search?word=
 */
exports.searchArea = async (req, res) => {
    /**
     * Body: REST_API_KEY (KAKAO)
     */
    const rest_key = req.body.rest_key;
    const word = req.query.word;

    let temp;
    try {
        temp = await axios({
            method: 'GET',
            url: `https://dapi.kakao.com/v2/local/search/keyword.${word}`,
            headers: {
                Authorization: `KakaoAK ${rest_key}`
            }
        });

        console.log(temp);
    } catch(err) {
        console.log(err);
    }
};