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
const AWS = require("aws-sdk");

let resultCode = 0;

const S3 = new AWS.S3({
    accessKeyId: process.env.AWS_S3_ACCESS_KEY,
    secretAccessKey: process.env.AWS_S3_SECRET_KEY,
    region: 'ap-northeast-2'
});

const checkFileKeyAndDelete = (fileInfo, key) => {
    let deleteParams;
    const storedKey = fileInfo.Key;

    if (storedKey.includes(key)) {
        deleteParams = { Bucket: process.env.AWS_S3_BUCKET_NAME, Key: storedKey };
        S3.deleteObject(deleteParams, (err, data) => {
            if (err) {
                resultCode = 2020;
                console.log(err);
            }
            else {
                resultCode = 1017;
                console.log(data);
            }
        });

        return true;
    } else {
        resultCode = 3010;
        return false;
    }
};

const deleteS30bject = async (param1, param2, key) => {
    let kakaoListObjects = await S3.listObjectsV2(param1).promise();
    let profileListObjects = await S3.listObjectsV2(param2).promise();

    if (kakaoListObjects.Contents.length === 0) {   // kakaoProfiles에서 파일을 못찾았다면
        // Profiles로 진행
        if (profileListObjects.Contents.length === 0)    // profiles에서 파일을 찾지 못했다면
            resultCode = 3010;
        else {
            profileListObjects.Contents.forEach((fileInfo) => {
                if (checkFileKeyAndDelete(fileInfo, key))
                    return false;
            });
        }
    } else {   // kakaoProfiles에서 파일을 찾았다면
        kakaoListObjects.Contents.forEach((fileInfo) => {
            if (checkFileKeyAndDelete(fileInfo, key))
                return false;
        });
    }
};

exports.createUser = async function (email, profileImgUrl, kakaoId, ageGroup, gender, nickName) {
    try {
        // 회원가입을 이미 한 유저인지 아닌지 확인할 것
        const kakaoIdCheckResult = await userProvider.retrieveKakaoIdCheck(kakaoId);
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

        // 이미지를 새로 업로드 하면? -> 기존의 사진이 있는 S3 저장소에 있는 사진 삭제
        // 이후 새로 업로드 하는 사진 S3에 추가
        // DB에 새로 업로드
        let beforeProfileImgUrl = await userDao.selectUserProfile(connection, userIdx);
        beforeProfileImgUrl = beforeProfileImgUrl[0].profileImgUrl;
        const befProfileImgUrlSplitted = beforeProfileImgUrl.split("/");
        const befProfileImgName = befProfileImgUrlSplitted[befProfileImgUrlSplitted.length - 1];

        if (profileImgUrl !== undefined) {   // 새로운 프로필 이미지가 사용자로부터 왔으면
            console.log("Before result code: " + resultCode);
            await deleteS30bject(   // 삭제 진행
                { Bucket: process.env.AWS_S3_BUCKET_NAME, Prefix: "kakaoProfiles/" },
                { Bucket: process.env.AWS_S3_BUCKET_NAME, Prefix: "profiles/"},
                befProfileImgName
            );
            console.log("After result code: " + resultCode);

            if (resultCode === 2020) {
                connection.release();
                return errResponse(baseResponse.AWS_S3_ERROR);
            }
            else if (resultCode === 3010) {
                connection.release();
                return errResponse(baseResponse.AWS_S3_FILE_NOT_FOUND);
            }
            else {
                await userDao.updateUserProfile(connection, [userIdx, profileImgUrl, nickName]);
                connection.release();
                return response(baseResponse.PROFILE_EDIT_SUCCESS);
            }
        }
        else {   // 새로운 프로필 이미지가 안왔으면
            await userDao.updateUserProfile(connection, [userIdx, profileImgUrl, nickName]);
            connection.release();
            return response(baseResponse.PROFILE_EDIT_SUCCESS);
        }
    } catch(err) {
        logger.error(`App - updateProfile Service error\n: ${err.message}`);
        return errResponse(baseResponse.DB_ERROR);
    }
};