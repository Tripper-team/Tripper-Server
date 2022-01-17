module.exports = function(app) {
    const feed = require('./feedController');
    const jwtMiddleware = require('../../../config/jwtMiddleware');

    // 12. 장소 검색 API (카카오 API)
    app.get('/app/', jwtMiddleware, feed.searchArea);
};