module.exports = function(app){
    const main = require('./mainController');
    const jwtMiddleware = require('../../../config/jwtMiddleware');

   // M1. 메인페이지 조회 API
    app.get('/app/main-page', jwtMiddleware, main.getMainPage);
};