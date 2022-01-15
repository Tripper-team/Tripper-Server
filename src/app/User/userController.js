const userProvider = require("../User/userProvider");
const userService = require("../User/userService");
const baseResponse = require("../../../config/baseResponseStatus");
const {response, errResponse} = require("../../../config/response");
const passport = require("passport");
const KakaoStrategy = require("passport-kakao").Strategy
const axios = require("axios");
const secret_config = require("../../../config/secret");
const jwt = require("jsonwebtoken");

/**
 * API No. 1
 * API Name : 카카오 로그인 API
 * [POST] /app/users/kakao-login
 */
passport.use('kakao-login', new KakaoStrategy({
    clientID: 'd4d0816cf247061ebe4ddb6631422a08',
    callbackURL: 'http://localhost:3000/auth/kakao/callback',
}, async (accessToken, refreshToken, profile, done) => {
    console.log("Access token: " + accessToken);
    console.log(profile);
}));

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
        })
    } catch(err) {
        return res.send(errResponse(baseResponse.ACCESS_TOKEN_INVALID));   // 2051: 유효하지 않은 accessToken 입니다.
    }

    const email = user_kakao_profile.data.kakao_account.email;   // 사용자 이메일 (카카오)

    // 사용자 이메일이 존재하는지 안하는지 체크할 것
    // 존재한다면 -> 바로 JWT 발급 및 로그인 처리 + 사용자 status 수정
    // 존재하지 않는다면 -> 회원가입 API 진행 (닉네임 입력 페이지로)
    const emailCheckResult = await userProvider.emailCheck(email);
    if (emailCheckResult[0].isEmailExist === 1) {   // 존재한다면
        // 유저 인덱스 가져오기
        const userIdxResult = await userProvider.getUserInfo(email);
        const userIdx = userIdxResult[0].idx;

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

        // 사용자 로그인 status로 변경


        return res.send(response(baseResponse.SUCCESS, { 'userIdx': userIdx, 'jwt': token, 'message': "카카오톡 소셜로그인에 성공했습니다."}));
    }
    else
        return res.send(response(baseResponse.SUCCESS, { message: "회원가입을 진행해주시기 바랍니다." }));
};

// 카카오 로그인 연결끊기 (테스트)
exports.kakaoLogout = async function (req, res) {
    const { accessToken } = req.body;

    try {
        await axios({
            method: 'POST',
            url: 'https://kapi.kakao.com/v1/user/unlink',
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        })
    } catch(err) {
        return res.send(errResponse(baseResponse.ACCESS_TOKEN_INVALID));   // 2051: 유효하지 않은 accessToken 입니다.
    }

    return res.send(response(baseResponse.SUCCESS));
};