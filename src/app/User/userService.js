const {logger} = require("../../../config/winston");
const {pool} = require("../../../config/database");
const secret_config = require("../../../config/secret");
const userProvider = require("./userProvider");
const userDao = require("./userDao");
const baseResponse = require("../../../config/baseResponseStatus");
const {response} = require("../../../config/response");
const {errResponse} = require("../../../config/response");
const jwt = require("jsonwebtoken");
const s3 = require('../../../config/aws_s3');

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
        const nickCheckResult = await userProvider.retrieveUserNicknameCheck(nickName);
        if (nickCheckResult[0].isNickResult === 1)   // 닉네임이 존재한다면
            return errResponse(baseResponse.REDUNDANT_NICKNAME);
        else
            return response(baseResponse.NICKNAME_CHECK_SUCCESS);
    } catch(err) {
        logger.error(`App - checkNickRedundant Service error\n: ${err.message}`);
        return errResponse(baseResponse.DB_ERROR);
    }
};

// 팔로우
exports.createFollow = async function (fromIdx, toIdx) {
    try {
        const connection = await pool.getConnection(async (conn) => conn);

        // toIdx가 실제로 존재하는 user인지 확인하기
        const userCheckResult = await userDao.selectIsUserExistByIdx(connection, toIdx);
        if (userCheckResult[0].isUserExist === 0)    // 해당하는 유저가 없다면
            return errResponse(baseResponse.NOT_EXIST_USER);

        // 탈퇴된 계정인지 아닌지 확인 (일단 보류)
        const checkWithdrawResult = await userDao.selectIsUserWithdraw(connection, toIdx);
        if (checkWithdrawResult[0].isWithdraw === 'Y')
            return errResponse(baseResponse.USER_WITHDRAW);

        // 팔로우 상태에 따라 나누기
        const followStatusResult = await userDao.selectFollowStatus(connection, [fromIdx, toIdx]);
        if (followStatusResult.length === 0 || followStatusResult[0].status === 'N') {   // (1) 서로 팔로우가 아예 안되어있거나 한번 요청했다가 끊은 경우
            if (followStatusResult.length === 0)    // 처음 팔로우
                await userDao.insertNewFollow(connection, [fromIdx, toIdx]);
            else   // 한번 팔로우를 해봤음
                await userDao.updateFollow(connection, ['Y', fromIdx, toIdx])

            connection.release();
            return response(baseResponse.FOLLOW_SUCCESS);
        }
        else {   // (2) 팔로우가 서로 되어있는 상황
            await userDao.updateFollow(connection, ['N', fromIdx, toIdx]);

            connection.release();
            return response(baseResponse.UNFOLLOW_SUCCESS);
        }
    } catch(err) {
        logger.error(`App - createFollow Service error\n: ${err.message}`);
        return errResponse(baseResponse.DB_ERROR);
    }
};

// 사용자 존재하는지 체크
exports.checkUserExist = async (userIdx) => {
    try {
        const connection = await pool.getConnection(async (conn) => conn);

        // userIdx가 실제로 존재하는 user인지 확인하기
        const userCheckResult = await userDao.selectIsUserExistByIdx(connection, userIdx);
        if (userCheckResult[0].isUserExist === 0) {   // 해당하는 유저가 없다면
            connection.release();
            return errResponse(baseResponse.NOT_EXIST_USER);
        } else {
            connection.release();
            return response(baseResponse.USER_CHECK_SUCCESS);
        }
    } catch(err) {
        logger.error(`App - checkUserExist Service error\n: ${err.message}`);
        return errResponse(baseResponse.DB_ERROR);
    }
};

// 닉네임 변경
exports.updateProfile = async function (userIdx, profileImgUrl, nickName) {
    try {
        const connection = await pool.getConnection(async (conn) => conn);

        // 이전 닉네임과 동일한지 확인하기
        let userNick = await userDao.selectUserNickname(connection, userIdx); userNick = userNick[0].nickName;
        if (userNick === nickName)
            return errResponse(baseResponse.NICKNAME_EQUAL_BEFORE);

        // 닉네임 중복 확인
        const nickCheckResult = await userProvider.retrieveUserNicknameCheck(nickName);
        if (nickCheckResult[0].isNickResult === 1)   // 닉네임이 존재한다면
            return errResponse(baseResponse.REDUNDANT_NICKNAME);

        await userDao.updateUserProfile(connection, [userIdx, profileImgUrl, nickName]);

        connection.release();
        return response(baseResponse.PROFILE_EDIT_SUCCESS);
    } catch(err) {
        logger.error(`App - updateProfile Service error\n: ${err.message}`);
        return errResponse(baseResponse.DB_ERROR);
    }
};