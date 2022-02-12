const baseResponse = require("../../../config/baseResponseStatus");
const {response, errResponse} = require("../../../config/response");
const axios = require("axios");
const secret_config = require("../../../config/secret");
const jwt = require("jsonwebtoken");
const mainProvider = require('./mainProvider');
require('dotenv').config();

/**
 * API No. M1
 * API Name : 메인 페이지 조회 API
 * [GET] /app/main-page?option=&page=
 */
exports.getMainPage = async function (req, res) {
    const userIdx = req.verifiedToken.userIdx;
    let option = req.query.option;   // 최신순, 인기순, 팔로우

    // if (!option) option = '최신순';   // 메인페이지 첫 조회시 기본값은 최신순
    // if (option !== '최신순' && option !== '인기순' && option !== '팔로우')
    //     return res.send(errResponse(baseResponse.));

    // 사용자 회원탈퇴 유무 확인

    const mainPageResult = await mainProvider.retrieveMainPage(userIdx, option);
    return res.send(response(baseResponse.SUCCESS, mainPageResult));
};