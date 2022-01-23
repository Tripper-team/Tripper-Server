module.exports = function(app) {
    const feed = require('./feedController');
    const jwtMiddleware = require('../../../config/jwtMiddleware');
    const s3Middleware = require('../../../config/s3Middleware');
    const upload = require('../../../config/aws_s3_multer');
    const multiple_thumnail_upload = upload.upload_multiple_thumnail;
    const multiple_travel_upload = upload.upload_multiple_travel;

    // 12. 키워드로 장소 검색 API (카카오 API)
    app.get('/app/feeds/area-search-keyword', feed.searchArea);

    // 13. 여행 게시물 작성하기 API

    // 14. 임시 여행 게시물 이미지 업로드 API
    app.post('/app/feeds/timage-upload',
        jwtMiddleware, multiple_thumnail_upload.array('images'), feed.uploadTempImage);

    // 15. 임시 여행 게시물 이미지 삭제 API
    // app.delete('/app/feeds/timage-delete',
    //     jwtMiddleware, multiple_thumnail_upload.array('thumnails'),
    //     feed.deleteTempImage);
};