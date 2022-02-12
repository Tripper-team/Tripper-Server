const express = require('express');
const compression = require('compression');
const methodOverride = require('method-override');
var cors = require('cors');

module.exports = function () {
    const app = express();

    app.use(compression());

    app.use(express.json());

    // extended가 true면 URL-encoded data는 qs로
    // false면 URL-encoded data는 querystring으로
    app.use(express.urlencoded({extended: false}));

    app.use(methodOverride());

    app.use(cors());
    // app.use(express.static(process.cwd() + '/public'));

    /* App (Android, iOS) */
    // TODO: 도메인을 추가할 경우 이곳에 Route를 추가하세요.
    require('../src/app/User/userRoute')(app);
    require('../src/app/Feed/feedRoute')(app);
    require('../src/app/Main/mainRoute')(app);

    return app;
};