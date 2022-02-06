const jwtMiddleware = require("../../../config/jwtMiddleware");
const user = require("./userController");
module.exports = function(app){
    const user = require('./userController');
    const jwtMiddleware = require('../../../config/jwtMiddleware');
    // const passport = require('passport');
    const s3Multer = require('../../../config/multer');

    // U1. 카카오 로그인 API
    app.post('/app/users/kakao-login', user.kakaoLogin);
    // app.get('/kakao', passport.authenticate('kakao-login'));
    // // 위에서 카카오 서버로 로그인이 되면 카카오 Redirect URL을 통해 이쪽 라우터로 오게 된다.
    // app.get('/auth/kakao/callback', passport.authenticate('kakao-login', {
    //     failureRedirect : '/',   // kakaoStrategy에서 실패한다면 실행
    // }), (req, res) => { res.redirect('/'); });   // 성공한다면 콜백 실행

    // U2. 회원가입 API
    app.post('/app/users/sign-up', user.signUp);

    // U3. 닉네임 확인 API
    app.get('/app/users/nickname-check', user.checkNickname);

    // U4. 자동 로그인 API
    app.get('/app/users/auto-login', jwtMiddleware, user.autoLogin);

    // P1. 프로필 설정화면 조회 API
    app.get('/app/users/profile-setting', jwtMiddleware, user.getProfile);

    // P2. 프로필 수정 API
    app.patch('/app/users/profile-edit', jwtMiddleware, s3Multer.single_upload.single('profileImage'), user.editUserProfile);

    // P3. 자신의 마이페이지 조회 API
    app.get('/app/users/profile', jwtMiddleware, user.getMyPage);

    // P4. 상대방 프로필 조회 API
    app.get('/app/users/:userIdx/profile', jwtMiddleware, user.getOtherProfile);

    // FW1. 팔로우 API
    app.post('/app/users/following', jwtMiddleware, user.follow);

    // FW2. 팔로잉/팔로워 조회 API
    app.get('/app/users/:userIdx/follow-list', jwtMiddleware, user.getFollowList);
};