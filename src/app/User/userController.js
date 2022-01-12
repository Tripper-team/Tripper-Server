const userProvider = require("../User/userProvider");
const userService = require("../User/userService");
const baseResponse = require("../../../config/baseResponseStatus");
const {response, errResponse} = require("../../../config/response");
const passport = require("passport");
const KakaoStrategy = require("passport-kakao").Strategy
const axios = require("axios");

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
    const { accessToken } = req.body;
    let kakao_profile;

    kakao_profile = await axios.get("/v2/user/me", {
        headers: {
            Authorization: 'Bearer ' + accessToken,
            'Content-Type': 'application/json'
        }
    })
};