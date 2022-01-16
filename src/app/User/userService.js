const {logger} = require("../../../config/winston");
const {pool} = require("../../../config/database");
const secret_config = require("../../../config/secret");
const userProvider = require("./userProvider");
const userDao = require("./userDao");
const baseResponse = require("../../../config/baseResponseStatus");
const {response} = require("../../../config/response");
const {errResponse} = require("../../../config/response");
const jwt = require("jsonwebtoken");

exports.createUser = async function (email, profileImgUrl, kakaoId, ageGroup, gender, nickName) {
    try {
        // 회원가입을 이미 한 유저인지 아닌지 확인할 것
        const kakaoIdCheckResult = await userProvider.retrieveUserKakaoId(kakaoId);
        // console.log(kakaoIdCheckResult);
        if (kakaoIdCheckResult[0].isKakaoIdExist === 1)
            return errResponse(baseResponse.USER_ALREADY_SIGNUP);

        const age_arr = ageGroup.split('~');
        let age;

        if (age_arr[0] === '0') age = '10대 미만';
        else age = `${String(age_arr[0])}대`;

        const connection = await pool.getConnection(async (conn) => conn);

        await userDao.insertUser(connection, [email, profileImgUrl, kakaoId, age, gender, nickName]);
        const userIdxResult = await userProvider.getUserInfoByKakaoId(kakaoId);
        const userIdx = userIdxResult[0].userIdx;

        // jwt 토큰 생성
        let token = await jwt.sign(
            {  // 토큰의 내용 (payload)
                userIdx: userIdx
            },
            secret_config.jwtsecret,   // 비밀키
            {
                expiresIn: "365d",
                subject: "userInfo",
            }   // 유효기간 365일
        );

        connection.release();

        return response(baseResponse.SIGN_UP_SUCCESS, { 'userIdx': userIdx, 'jwt': token });
    } catch (err) {
        logger.error(`App - createUser Service error\n: ${err.message}`);
        return errResponse(baseResponse.DB_ERROR);
    }
};

// 닉네임 중복확인
exports.checkNickRedundant = async function (nickName) {
    try {
        const nickCheckResult = await userProvider.retrieveUserNickname(nickName);
        if (nickCheckResult[0].isNickResult === 1)   // 닉네임이 존재한다면
            return errResponse(baseResponse.REDUNDANT_NICKNAME);
        else
            return response(baseResponse.NICKNAME_CHECK_SUCCESS);
    } catch(err) {
        logger.error(`App - checkNickRedundant Service error\n: ${err.message}`);
        return errResponse(baseResponse.DB_ERROR);
    }
};