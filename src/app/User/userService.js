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
        const age_arr = ageGroup.split('~');
        let age;

        if (age_arr[0] === '0') age = '10대 미만';
        else age = `${String(age_arr[0])}대`;

        const connection = await pool.getConnection(async (conn) => conn);
        await userDao.insertUser(connection, [email, profileImgUrl, kakaoId, age, gender, nickName]);
        connection.release();
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