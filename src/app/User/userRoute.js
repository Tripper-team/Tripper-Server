module.exports = function(app){
    const user = require('./userController');
    const jwtMiddleware = require('../../../config/jwtMiddleware');
    const passport = require('passport');

    // 1. 카카오 로그인 API
    // /kakao로 요청이 오면, 카카오 로그인 페이지로 이동한다. 이후 카카오 서버로 로그인을 하게 되면 다음 라우터로 이동
    app.post('/app/users/kakao-login', user.kakaoLogin);
    app.get('/kakao', passport.authenticate('kakao-login'));
    // 위에서 카카오 서버로 로그인이 되면 카카오 Redirect URL을 통해 이쪽 라우터로 오게 된다.
    app.get('/auth/kakao/callback', passport.authenticate('kakao-login', {
        failureRedirect : '/',   // kakaoStrategy에서 실패한다면 실행
    }), (req, res) => { res.redirect('/'); });   // 성공한다면 콜백 실행

    // 카카오 로그인 연결끊기 API (테스트를 위함)
    // app.post('/app/users/kakao-logout', user.kakaoLogout);

    // 2. 회원가입 API
    app.post('/app/users/sign-up', user.signUp);

    // 3. 닉네임 확인 API
    app.get('/app/users/nickname-check', user.checkNickname);

    // 4. 마이페이지 조회 API
    // app.get('/app/users/profile', jwtMiddleware)

    // 5. 프로필 수정 API
    // app.patch('/app/users/profile-edit', jwtMiddleware, user.editUserProfile);

    // 6. 팔로우 API
    app.post('/app/users/following', jwtMiddleware, user.follow);

    // 7. 팔로잉/팔로워 조회 API (회원용)
    app.get('/app/users/:userIdx/follow-list', jwtMiddleware, user.getFollowList);

    // 8. 자동 로그인 API
    app.get('/app/users/auto-login', jwtMiddleware, user.autoLogin);
};
