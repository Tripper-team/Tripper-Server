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

const regex_nickname = /^[가-힣a-zA-Z]+$/;

const checkObjectEmpty = (obj) => {
    return Object.keys(obj).length === 0;
};

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
    } catch(err) {
        return res.send(errResponse(baseResponse.ACCESS_TOKEN_INVALID));   // 2051: 유효하지 않은 accessToken 입니다.
    }

    const email = user_kakao_profile.data.kakao_account.email;   // 사용자 이메일 (카카오)
    const profileImgUrl = user_kakao_profile.data.kakao_account.profile.profile_image_url;   // 사용자 프로필 이미지
    const kakaoId = String(user_kakao_profile.data.id);   // 카카오 고유ID
    let ageGroup = user_kakao_profile.data.kakao_account.age_range;   // 연령대
    let gender = user_kakao_profile.data.kakao_account.gender;   // 성별

    if (ageGroup === undefined)
        ageGroup = null;
    if (gender === undefined)
        gender = null;

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
};

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
    if (!regex_nickname.test(nickName) || nickName.length > 10)
        return res.send(errResponse(baseResponse.NICKNAME_ERROR_TYPE));

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
    if (!regex_nickname.test(nickName) || nickName.length > 10)
        return res.send(errResponse(baseResponse.NICKNAME_ERROR_TYPE));

    const checkNicknameResponse = await userService.checkNickRedundant(nickName);
    return res.send(checkNicknameResponse);
};

/**
 * API No. 4
 * API Name : 프로필 설정화면 조회 API
 * [GET] /app/users/profile-setting
 */
exports.getProfile = async function (req, res) {
    /**
     * Headers: JWT Token
     */
    const userIdx = req.verifiedToken.userIdx;

    const userStatusCheckRow = await userProvider.checkUserStatus(userIdx);
    if (userStatusCheckRow[0].isWithdraw === 'Y')
        return res.send(errResponse(baseResponse.USER_WITHDRAW));

    const userProfileResult = await userProvider.retrieveUserProfile(userIdx);
    return res.send(response(baseResponse.PROFILE_INQUIRE_SUCCESS, userProfileResult));
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
    let { profileImgUrl, nickName } = req.body;

    if (!nickName)
        return res.send(errResponse(baseResponse.NICKNAME_EMPTY));
    if (!regex_nickname.test(nickName) || nickName.length > 10)
        return res.send(errResponse(baseResponse.NICKNAME_ERROR_TYPE));

    const userStatusCheckRow = await userProvider.checkUserStatus(userIdx);
    if (userStatusCheckRow[0].isWithdraw === 'Y')
        return res.send(errResponse(baseResponse.USER_WITHDRAW));

    const updateProfileresult = await userService.updateProfile(userIdx, profileImgUrl, nickName);
    return res.send(updateProfileresult);
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
     * Headers: JWT Token
     * Query: option (following, follower)
     * Path-variable: userIdx
     */
    const myIdx = req.verifiedToken.userIdx;   // 나의 인덱스
    const option = req.query.option;   // 조회 구분 (팔로잉 or 팔로워)
    const userIdx = req.params.userIdx;   // 조회할 사람의 인덱스

    if (!option)
        return res.send(errResponse(baseResponse.FOLLOW_SEARCH_OPTION_EMPTY));
    if (option !== 'following' && option !== 'follower')
        return res.send(errResponse(baseResponse.FOLLOW_SEARCH_OPTION_ERROR));
    if (!userIdx)
        return res.send(errResponse(baseResponse.USER_IDX_EMPTY));

    // userIdx와 myIdx가 같다면 본인의 팔로잉, 팔로워 조회
    if (parseInt(userIdx) === parseInt(myIdx)) {
        if (option === 'following') {   // 본인의 팔로잉 조회
            const userStatusCheckRow = await userProvider.checkUserStatus(myIdx);
            if (userStatusCheckRow[0].isWithdraw === 'Y')
                return res.send(errResponse(baseResponse.USER_WITHDRAW));

            const getMyFollowingResult = await userProvider.retrieveFollowList(userIdx, 'Y', option);
            if (getMyFollowingResult.length === 0)
                return res.send(errResponse(baseResponse.FOLLOWING_SEARCH_NOT_RESULT));
            else
                return res.send(response(baseResponse.FOLLOWING_LIST_SUCCESS, getMyFollowingResult));
        } else {   // 본인의 팔로워 조회
            const userStatusCheckRow = await userProvider.checkUserStatus(myIdx);
            if (userStatusCheckRow[0].isWithdraw === 'Y')
                return res.send(errResponse(baseResponse.USER_WITHDRAW));

            const getMyFollowerResult = await userProvider.retrieveFollowList(userIdx, 'Y', option);
            if (getMyFollowerResult.length === 0)
                return res.send(errResponse(baseResponse.FOLLOWER_SEARCH_NOT_RESULT));
            else
                return res.send(response(baseResponse.FOLLOWER_LIST_SUCCESS, getMyFollowerResult));
        }
    }
    else {   // 다르면 상대방의 팔로잉, 팔로워 조회
        if (option === 'following') {   // 상대방의 팔로잉 조회
            const myStatusCheckRow = await userProvider.checkUserStatus(myIdx);
            const userStatusCheckRow = await userProvider.checkUserStatus(userIdx);
            if (userStatusCheckRow[0].isWithdraw === 'Y' || myStatusCheckRow[0].isWithdraw === 'Y')
                return res.send(errResponse(baseResponse.USER_WITHDRAW));

            const getOtherFollowingResult = await userProvider.retrieveFollowList([userIdx, myIdx], 'N', option);
            if (getOtherFollowingResult.length === 0)
                return res.send(errResponse(baseResponse.FOLLOWING_SEARCH_NOT_RESULT));
            else
                return res.send(response(baseResponse.FOLLOWING_LIST_SUCCESS, getOtherFollowingResult));

        } else {   // 상대방의 팔로워 조회
            const myStatusCheckRow = await userProvider.checkUserStatus(myIdx);
            const userStatusCheckRow = await userProvider.checkUserStatus(userIdx);
            if (userStatusCheckRow[0].isWithdraw === 'Y' || myStatusCheckRow[0].isWithdraw === 'Y')
                return res.send(errResponse(baseResponse.USER_WITHDRAW));

            const getOtherFollowerResult = await userProvider.retrieveFollowList([userIdx, myIdx], 'N', option);
            if (getOtherFollowerResult.length === 0)
                return res.send(errResponse(baseResponse.FOLLOWER_SEARCH_NOT_RESULT));
            else
                return res.send(response(baseResponse.FOLLOWER_LIST_SUCCESS, getOtherFollowerResult));
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