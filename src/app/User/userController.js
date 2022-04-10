const userProvider = require("../User/userProvider");
const userService = require("../User/userService");
const baseResponse = require("../../../config/baseResponseStatus");
const {response, errResponse} = require("../../../config/response");
const {logger} = require('../../../config/winston');
// const passport = require("passport");
// const KakaoStrategy = require("passport-kakao").Strategy
const axios = require("axios");
const secret_config = require("../../../config/secret");
const jwt = require("jsonwebtoken");
const s3Multer = require('../../../config/multer');
const {checkNickFword} = require('../../../config/fword/fword');
const regex_nickname = /^[가-힣a-zA-Z0-9]+$/;   // 닉네임 정규식

require('dotenv').config();

/**
 * API No. U1
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
     * Body: accessToken (프론트엔드에서 카카오 서버로부터 받아온 Access Token)
     */
    const accessToken = req.body.accessToken;
    let user_kakao_profile;

    /* Validation */
    if (!accessToken)   // 카카오 accessToken 입력 체크
        return res.send(errResponse(baseResponse.ACCESS_TOKEN_EMPTY));

    // 프론트에서 받은 access token을 카카오 서버로 보내서 사용자 정보 가져옴
    try {
        user_kakao_profile = await axios({
            method: 'GET',
            url: 'https://kapi.kakao.com/v2/user/me',
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        });
    } catch(err) {   // 카카오 access token 만료 등?
        return res.send(errResponse(baseResponse.ACCESS_TOKEN_INVALID));
    }

    const email = user_kakao_profile.data.kakao_account.email;   // 사용자 이메일 (카카오)
    const profileImgUrl = user_kakao_profile.data.kakao_account.profile.profile_image_url;   // 사용자 프로필 이미지 URL
    const kakaoId = String(user_kakao_profile.data.id);   // 카카오 고유ID
    let ageGroup = user_kakao_profile.data.kakao_account.age_range;   // 연령대
    let gender = user_kakao_profile.data.kakao_account.gender;   // 성별

    if (ageGroup === undefined)
        ageGroup = null;
    if (gender === undefined)
        gender = null;

    logger.info(`[Kakao Login API] User's kakaoId: ${kakaoId}, Email: ${email}`);
    // console.log("[카카오 로그인 API]");
    // console.log("사용자 카카오 이메일: " + email);
    // console.log("사용자 프로필 사진: " + profileImgUrl);
    // console.log("사용자 카카오 고유ID: " + kakaoId);
    // console.log("사용자 연령대: " + ageGroup);
    // console.log("사용자 성별: " + gender);

    // 카카오 서버에서 온 사용자의 카카오 사진 S3에 올리기
    const s3_profileUrl = await s3Multer.kakao_upload(profileImgUrl);

    // 사용자 카카오 고유번호가 DB에 존재하는지 안하는지 체크할 것
    // 존재한다면 -> 바로 JWT 발급 및 로그인 처리 + 사용자 status 수정
    // 존재하지 않는다면 -> 회원가입 API 진행 (닉네임 입력 페이지로)
    const kakaoIdCheckResult = await userProvider.retrieveKakaoIdCheck(kakaoId);
    if (kakaoIdCheckResult[0].isKakaoIdExist === 1) {   // 존재한다면 (원래 있던 사용자)
        // 유저 인덱스 가져오기
        const userIdx = (await userProvider.getUserInfoByKakaoId(kakaoId))[0].userIdx;

        // jwt 토큰 생성
        let token = await jwt.sign(
            {  // 토큰의 내용 (payload)
                userIdx: userIdx
            },
            secret_config.jwtsecret,   // 비밀키
            {
                expiresIn: "365d",   // 유효기간 추후 변경 (Refresh token도 같이 사용)
                subject: "userInfo",
            }   // 유효기간 365일
        );

        // 로그인한 User 정보 출력
        const loginResult = await userProvider.getUserInfoByKakaoId(kakaoId);
        logger.info(`[Kakao Login API] login-userIdx: ${userIdx}, nickName: ${loginResult[0].nickName}`);
        return res.send(response(baseResponse.KAKAO_LOGIN_SUCCESS,
            {
                'userIdx': userIdx,
                'jwt': token,
                'email': loginResult[0].email,
                'nickName': loginResult[0].nickName,
                'profileImgUrl': loginResult[0].profileImgUrl,
                'kakaoId': loginResult[0].kakaoId,
                'ageGroup': loginResult[0].ageGroup,
                'gender': loginResult[0].gender
            }));
    }
    else   // 신규 유저라면
        return res.send(response(baseResponse.KAKAO_SIGN_UP, {
            'email': email,
            'profileImgUrl': s3_profileUrl.Location,
            'kakaoId': kakaoId,
            'ageGroup': ageGroup,
            'gender': gender
        }));
};

/**
 * API No. U2
 * API Name : 회원가입 API
 * [POST] /app/users/sign-up
 */
exports.signUp = async function (req, res) {
    /**
     * Body: email, profileImgUrl, kakaoId, ageGroup, gender, nickName
     */
    let { email, profileImgUrl, kakaoId, ageGroup, gender, nickName } = req.body;

    /* Validation */
    if (!email)   // 이메일이 없으면
        return res.send(errResponse(baseResponse.EMAIL_EMPTY));
    if (!profileImgUrl)   // 프로필 사진 링크가 없으면
        return res.send(errResponse(baseResponse.PROFILE_IMG_EMPTY));
    if (!kakaoId)   // 카카오id가 없으면
        return res.send(errResponse(baseResponse.KAKAO_ID_EMPTY));
    if (!nickName)   // 닉네임이 없으면
        return res.send(errResponse(baseResponse.NICKNAME_EMPTY));
    if (!regex_nickname.test(nickName) || nickName.length > 10 || nickName.length < 2)   // 닉네임 정규식 체크 및 길이
        return res.send(errResponse(baseResponse.NICKNAME_ERROR_TYPE));
    if (checkNickFword(nickName))   // 닉네임에 부적절한 단어가 포함되어 있는지
        return res.send(errResponse(baseResponse.NICKNAME_BAD_WORD));

    let signUpTokenResult = await userService.createUser(email, profileImgUrl, kakaoId, ageGroup, gender, nickName);   // 회원가입 진행
    const signUpResult = await userProvider.getUserInfoByKakaoId(kakaoId);   // 회원가입 한 User 정보 출력

    if (signUpTokenResult.code === 3002) {
        logger.error(`[Sign-Up API] Already exist! (kakaoId: ${kakaoId})`);
        return res.send(signUpTokenResult);
    }
    else return res.send(response(baseResponse.SIGN_UP_SUCCESS, { 'token': signUpTokenResult.result, 'userInfo': signUpResult }));

};

/**
 * API No. U3
 * API Name : 닉네임 확인 API
 * [GET] /app/users/nickname-check
 */
exports.checkNickname = async function (req, res) {
    /**
     * Query String: nickName
     */
    const nickName = req.query.nickname;

    /* Validation */
    if (!nickName)   // 닉네임 입력 x
        return res.send(errResponse(baseResponse.NICKNAME_EMPTY));
    if (!regex_nickname.test(nickName) || nickName.length > 10 || nickName.length < 2)   // 닉네임 길이, 규칙 (한글,영어,숫자 포함 2자 이상 10자 이내)
        return res.send(errResponse(baseResponse.NICKNAME_ERROR_TYPE));
    if (checkNickFword(nickName))   // 닉네임에 부적절한 내용 포함되어 있는지
        return res.send(errResponse(baseResponse.NICKNAME_BAD_WORD));

    const nickDuplicateCheckResult = await userProvider.retrieveUserNicknameCheck(nickName);   // 닉네임 중복 체크
    if (nickDuplicateCheckResult[0].isNickResult === 1) return res.send(errResponse(baseResponse.REDUNDANT_NICKNAME));
    else return res.send(response(baseResponse.NICKNAME_CHECK_SUCCESS));
};

/**
 * API No. U4
 * API Name : 자동 로그인 API
 * [GET] /app/users/auto-login
 */
exports.autoLogin = async function (req, res) {
    /**
     * Headers: x-access-token
     */
    const userIdx = req.verifiedToken.userIdx;
    logger.info(`[Auto-Login API] userIdx: ${userIdx}`);
    return res.send(response(baseResponse.AUTO_LOGIN_SUCCESS));
};

/**
 * API No. U5
 * API Name : 로그아웃 API
 * [POST] /app/users/kakao-logout
 */
exports.kakaoLogout = async (req, res) => {
    const accessToken = req.body.accessToken;   // 카카오에서 나온 accessToken
    const userIdx = req.verifiedToken.userIdx;   // JWT에 저장되어 있는 사용자 idx

    /* Validation */
    if (!accessToken)   // 카카오 accessToken을 입력하지 않을 경우
        return res.send(errResponse(baseResponse.ACCESS_TOKEN_EMPTY));

    // AccessToken의 kakaoId 가져오는 부분
    let user_kakao_profile;
    try {
        user_kakao_profile = await axios({
            method: 'GET',
            url: 'https://kapi.kakao.com/v2/user/me',
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        });
    } catch(err) {   // 카카오 access token 만료?
        return res.send(errResponse(baseResponse.ACCESS_TOKEN_INVALID));
    }

    let user_kakaoId = String(user_kakao_profile.data.id);   // Body값에 입력한 accessToken에서 나온 kakaoId
    const kakaoId = await userProvider.retrieveKakaoId(userIdx);   // userIdx에 해당하는 kakaoId DB에서 가져옴

    if (user_kakaoId !== kakaoId)   // AccessToken으로 가져온 kakaoId와 DB에 저장된 kakaoId가 일치하지 않는 경우
        return res.send(errResponse(baseResponse.KAKAOID_NOT_MATCH));

    // 로그아웃 진행 (AccessToken 만료시키기)
    try {
        await axios({
            method: 'POST',
            url: 'https://kapi.kakao.com/v1/user/logout',
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        })
    } catch(err) {
        return res.send(errResponse(baseResponse.ACCESS_TOKEN_INVALID));
    }

    return res.send(response(baseResponse.KAKAO_LOGOUT_SUCCESS));
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
    return res.send(response(baseResponse.PROFILE_INQUIRE_SUCCESS, userProfileResult[0]));
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
    let profileImage = req.file;
    const nickName = req.body.nickName;
    const userIdx = req.verifiedToken.userIdx;

    if (profileImage !== undefined)
        profileImage = profileImage.location;

    // console.log(profileImage);
    // console.log(nickName);
    // console.log(userIdx);

    if (!nickName)
        return res.send(errResponse(baseResponse.NICKNAME_EMPTY));
    if (!regex_nickname.test(nickName) || nickName.length > 10 || nickName.length < 2)
        return res.send(errResponse(baseResponse.NICKNAME_ERROR_TYPE));
    if (checkNickFword(fword_array, nickName))
        return res.send(errResponse(baseResponse.NICKNAME_BAD_WORD));

    const userStatusCheckRow = await userProvider.checkUserStatus(userIdx);
    if (userStatusCheckRow[0].isWithdraw === 'Y')
        return res.send(errResponse(baseResponse.USER_WITHDRAW));

    const updateProfileresult = await userService.updateProfile(userIdx, profileImage, nickName);
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


    const userCheckResult = await userProvider.retrieveUserIdxCheck(userIdx);
    if (userCheckResult[0].isUserExist === 0)    // 해당하는 유저가 없다면
        return res.send(errResponse(baseResponse.NOT_EXIST_USER));

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
 * API No. P3
 * API Name : 자신의 마이페이지 조회 API
 * [GET] /app/users/profile?search=&page=
 */
exports.getMyPage = async function (req, res) {
    /**
     * Headers: x-access-token
     * Query String: search, page
     */
    const myIdx = req.verifiedToken.userIdx;
    const search_option = req.query.search;   // 내여행 또는 좋아요
    let page = parseInt(req.query.page);
    const pageSize = 3;   // 한 페이지당 보여줄 데이터의 갯수

    // Validation
    if (!page && page !== 0)
        return res.send(errResponse(baseResponse.MYPAGE_PAGE_EMPTY));
    if (page <= 0)
        return res.send(errResponse(baseResponse.MYPAGE_PAGE_ERROR_TYPE));

    if (!search_option)
        return res.send(errResponse(baseResponse.MYPAGE_OPTION_EMPTY));
    if (search_option !== "내여행" && search_option !== "좋아요")
        return res.send(errResponse(baseResponse.MYPAGE_OPTION_ERROR_TYPE));

    // 사용자 status 체크
    const myStatusCheckRow = await userProvider.checkUserStatus(myIdx);
    if (myStatusCheckRow[0].isWithdraw === 'Y')
        return res.send(errResponse(baseResponse.USER_WITHDRAW));

    const userMyPageInfoResult = await userProvider.retrieveUserMyPageInfo(myIdx);   // 마이페이지 윗부분
    const userMyPageFeedResult = await userProvider.retrieveUserMyPageFeed(myIdx, search_option, page, pageSize);   // 마이페이지 아랫부분 (게시물)

    if (userMyPageFeedResult === -1 || userMyPageFeedResult.length === 0)
        return res.send(response(baseResponse.MYPAGE_PAGE_FINISH, { "userMyPageInfo": userMyPageInfoResult[0] }));
    else
        return res.send(response(baseResponse.MYPAGE_SEARCH_SUCCESS, { "userMyPageInfo": userMyPageInfoResult[0], "userMyPageFeedByOption": userMyPageFeedResult}));
};

/**
 * API No. P4
 * API Name : 상대방 프로필 조회 API
 * [GET] /app/users/:userIdx/profile?page=
 */
exports.getOtherProfile = async function (req, res) {
    const myIdx = req.verifiedToken.userIdx;
    const userIdx = req.params.userIdx;
    let page = parseInt(req.query.page);
    const pageSize = 3;   // 한 페이지당 보여줄 데이터의 갯수

    // Validation
    if (!userIdx)
        return res.send(errResponse(baseResponse.USER_IDX_EMPTY));
    if (!page && page !== 0)
        return res.send(errResponse(baseResponse.MYPAGE_PAGE_EMPTY));
    if (page <= 0)
        return res.send(errResponse(baseResponse.MYPAGE_PAGE_ERROR_TYPE));

    const userStatusCheckRow = await userProvider.checkUserStatus(userIdx);
    const myStatusCheckRow = await userProvider.checkUserStatus(myIdx);
    if (userStatusCheckRow[0].isWithdraw === 'Y' || myStatusCheckRow[0].isWithdraw === 'Y')
        return errResponse(baseResponse.USER_WITHDRAW);

    const userProfileInfoResult = await userProvider.retrieveOtherProfileInfo(myIdx, userIdx);   // 상대방 프로필 윗부분
    const userProfileFeedResult = await userProvider.retrieveOtherProfileFeed(myIdx, userIdx, page, pageSize);   // 마이페이지 아랫부분 (게시물)

    if (userProfileFeedResult === -1 || userProfileFeedResult.length === 0)
        return res.send(response(baseResponse.USER_PROFILE_FINISH, { 'otherProfileInfo': userProfileInfoResult[0]}));
    else
        return res.send(response(baseResponse.USER_PROFILE_SEARCH_SUCCESS, { 'otherProfileInfo': userProfileInfoResult[0], 'otherProfileFeed': userProfileFeedResult }));
};


/**
 * API No. U6
 * API Name : 회원탈퇴 API
 * [POST] /app/users/unlink?accessToken=
 */
exports.unlink = async (req, res) => {
    const accessToken = req.body.accessToken;
    let hello;

    try {
        hello = await axios({
            method: 'POST',
            url: "https://kapi.kakao.com/v1/user/unlink",
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        });
    } catch(err) {
        return res.send(errResponse(baseResponse.ACCESS_TOKEN_INVALID));
    }

    console.log(hello);
};