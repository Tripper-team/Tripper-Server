const userProvider = require("../User/userProvider");
const userService = require("../User/userService");
const baseResponse = require("../../../config/baseResponseStatus");
const {response, errResponse} = require("../../../config/response");
const passport = require("passport");
const KakaoStrategy = require("passport-kakao").Strategy
const axios = require("axios");
const secret_config = require("../../../config/secret");
const jwt = require("jsonwebtoken");
const s3 = require('../../../config/aws_s3');
require('dotenv').config();

const regex_nickname = /^[ㄱ-ㅎ|가-힣|a-z|A-Z|0-9|]+$/;

const checkObjectEmpty = (obj) => {
    return Object.keys(obj).length === 0;
}

/**
 * API No. 1
 * API Name : 카카오 로그인 API
 * [POST] /app/users/kakao-login
 */
// passport.use('kakao-login', new KakaoStrategy({
//     clientID: process.env.KAKAO_CLIENT_ID,
//     callbackURL: 'http://localhost:3000/auth/kakao/callback',
// }, async (accessToken, refreshToken, profile, done) => {
//     console.log("Access token: " + accessToken);
//     console.log(profile);
// }));

exports.kakaoLogin = async function (req, res) {
    /**
     * Body: accessToken
     */
    const { accessToken } = req.body;

    if (!accessToken)   // 카카오 accessToken 입력 체크
        return res.send(errResponse(baseResponse.ACCESS_TOKEN_EMPTY));   // 2050: accessToken을 입력해주세요.

    let user_kakao_profile;
    try {
        user_kakao_profile = await axios({
            method: 'GET',
            url: 'https://kapi.kakao.com/v2/user/me',
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        });

        const email = user_kakao_profile.data.kakao_account.email;   // 사용자 이메일 (카카오)
        const profileImgUrl = user_kakao_profile.data.kakao_account.profile.profile_image_url;   // 사용자 프로필 이미지
        const kakaoId = String(user_kakao_profile.data.id);   // 카카오 고유ID
        const ageGroup = user_kakao_profile.data.kakao_account.age_range;   // 연령대
        const gender = user_kakao_profile.data.kakao_account.gender;   // 성별

        console.log("사용자 카카오 이메일: " + email);
        console.log("사용자 프로필 사진: " + profileImgUrl);
        console.log("사용자 카카오 고유ID: " + kakaoId);
        console.log("사용자 연령대: " + ageGroup);
        console.log("사용자 성별: " + gender);

        // Amazon S3
        const s3_profileUrl = await s3.upload(profileImgUrl);
        // console.log(s3_profileUrl.Location);

        // 사용자 카카오 고유번호가 DB에 존재하는지 안하는지 체크할 것
        // 존재한다면 -> 바로 JWT 발급 및 로그인 처리 + 사용자 status 수정
        // 존재하지 않는다면 -> 회원가입 API 진행 (닉네임 입력 페이지로)
        const kakaoIdCheckResult = await userProvider.retrieveUserKakaoId(kakaoId);
        if (kakaoIdCheckResult[0].isKakaoIdExist === 1) {   // 존재한다면
            // 유저 인덱스 가져오기
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

            return res.send(response(baseResponse.KAKAO_LOGIN_SUCCESS, { 'userIdx': userIdx, 'jwt': token }));
        }
        else
            return res.send(response(baseResponse.KAKAO_SIGN_UP, {
                'email': email,
                'profileImgUrl': s3_profileUrl.Location,
                'kakaoId': kakaoId,
                'ageGroup': ageGroup,
                'gender': gender
            }));
    } catch(err) {
        return res.send(errResponse(baseResponse.KAKAO_LOGIN_FAILED));
    }
};

// 카카오 로그인 연결끊기 (테스트)
// exports.kakaoLogout = async function (req, res) {
//     const { accessToken } = req.body;
//
//     try {
//         await axios({
//             method: 'POST',
//             url: 'https://kapi.kakao.com/v1/user/unlink',
//             headers: {
//                 Authorization: `Bearer ${accessToken}`
//             }
//         })
//     } catch(err) {
//         return res.send(errResponse(baseResponse.ACCESS_TOKEN_INVALID));   // 2051: 유효하지 않은 accessToken 입니다.
//     }
//
//     return res.send(response(baseResponse.SUCCESS));
// };

/**
 * API No. 2
 * API Name : 회원가입 API
 * [POST] /app/users/sign-up
 */
exports.signUp = async function (req, res) {
    /**
     * Body: email, profileImgUrl, kakaoId, ageGroup, gender, nickName
     */
    const { email, profileImgUrl, kakaoId, ageGroup, gender, nickName } = req.body;

    if (!email)
        return res.send(errResponse(baseResponse.EMAIL_EMPTY));
    if (!profileImgUrl)
        return res.send(errResponse(baseResponse.PROFILE_IMG_EMPTY));
    if (!kakaoId)
        return res.send(errResponse(baseResponse.KAKAO_ID_EMPTY));
    if (!nickName)
        return res.send(errResponse(baseResponse.NICKNAME_EMPTY));

    let signUpTokenResult = await userService.createUser(email, profileImgUrl, kakaoId, ageGroup, gender, nickName);   // 회원가입 진행
    const signUpResult = await userProvider.getUserInfoByKakaoId(kakaoId);   // 회원가입 한 User 정보 출력

    if (signUpTokenResult.code === 3002)
        return res.send(signUpTokenResult);
    else
        return res.send(response(baseResponse.SIGN_UP_SUCCESS, { 'token': signUpTokenResult.result, 'userInfo': signUpResult }));
};

/**
 * API No. 3
 * API Name : 닉네임 확인 API
 * [GET] /app/users/nickname-check
 */
exports.checkNickname = async function (req, res) {
    /**
     * Body: nickName
     */
    const nickName = req.body.nickName;

    if (!nickName)
        return res.send(errResponse(baseResponse.NICKNAME_EMPTY));
    if (!regex_nickname.test(nickName))
        return res.send(errResponse(baseResponse.NICKNAME_ERROR_TYPE));

    const checkNicknameResponse = await userService.checkNickRedundant(nickName);
    return res.send(checkNicknameResponse);
};

/**
 * API No. 5
 * API Name : 프로필 수정 API
 * [PATCH] /app/users/profile-edit
 */
exports.editUserProfile = async function (req, res) {
    /**
     * Headers: JWT Token
     * Body: profileImgUrl, nickName
     */
    const userIdx = req.verifiedToken.userIdx;
    const { profileImgUrl, nickName } = req.body;
};

/**
 * API No. 6
 * API Name : 팔로우 API
 * [POST] /app/users/follow
 */
exports.follow = async function (req, res) {
    /**
     * Header: JWT Token
     * Body: toIdx
     */
    const fromIdx = req.verifiedToken.userIdx;
    const toIdx = req.body.toIdx;   // 팔로우 요청받는 사람의 인덱스

    if (!toIdx)   // 팔로우 요청 받는 사람의 idx가 없음
        return res.send(errResponse(baseResponse.FOLLOW_TOIDX_EMPTY));
    if (fromIdx === toIdx)   // 팔로우 요청과 팔로우 요청 받는 사람의 idx가 같으면 안됨!
        return res.send(errResponse(baseResponse.FOLLOW_IDX_NOT_MATCH));

    const followResponse = await userService.createFollow(fromIdx, toIdx);
    return res.send(followResponse);
};

/**
 * API No. 7
 * API Name : 팔로잉/팔로워 조회 API
 * [GET] /app/users/:userIdx/follow-list?option=
 */
exports.getFollowList = async function (req, res) {
    /**
     * Query: option (following, follower)
     * Path-variable: userIdx
     */
    const option = req.query.option;   // 조회 구분 (팔로잉 or 팔로워)
    const userIdx = req.params.userIdx;   // 조회할 사람의 인덱스

    if (!option)
        return res.send(errResponse(baseResponse.FOLLOW_SEARCH_OPTION_EMPTY));
    if (option !== 'following' && option !== 'follower')
        return res.send(errResponse(baseResponse.FOLLOW_SEARCH_OPTION_ERROR));
    if (!userIdx)
        return res.send(errResponse(baseResponse.USER_IDX_EMPTY));

    const userExistResult = await userService.checkUserExist(userIdx);   // 실제 user인지 체크
    // console.log(userExistResult.code);
    if (userExistResult.code === 3003)
        return res.send(userExistResult);
    else {
        const followListResult = await userProvider.retrieveFollowList(userIdx, option);

        if (checkObjectEmpty(followListResult))
            return res.send(errResponse(baseResponse.FOLLOW_SEARCH_NOT_RESULT));
        else {
            if (option === 'following')
                return res.send(response(baseResponse.FOLLOWING_LIST_SUCCESS, followListResult));
            else
                return res.send(response(baseResponse.FOLLOWER_LIST_SUCCESS, followListResult));
        }
    }
};

/**
 * API No. 8
 * API Name : 자동 로그인 API
 * [GET] /app/users/auto-login
 */
exports.autoLogin = async function (req, res) {
    /**
     * Headers: x-access-token
     */
    const userIdx = req.verifiedToken.userIdx;
    console.log("[자동로그인] userIdx: " + userIdx);
    return res.send(response(baseResponse.AUTO_LOGIN_SUCCESS));
};