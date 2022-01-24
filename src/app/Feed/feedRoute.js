const jwtMiddleware = require("../../../config/jwtMiddleware");
const {response} = require("../../../config/response");
const baseResponse = require("../../../config/baseResponseStatus");
module.exports = function(app) {
    const feed = require('./feedController');
    const jwtMiddleware = require('../../../config/jwtMiddleware');
    const s3Multer = require('../../../config/aws_s3_multer');
    const multiple_thum_upload = s3Multer.upload_multiple_thumnail;
    const multiple_travel_upload = s3Multer.upload_multiple_travel;
    const {response, errResponse} = require("../../../config/response");
    const baseResponse = require("../../../config/baseResponseStatus");

    // 12. 키워드로 장소 검색 API (카카오 API)
    app.get('/app/feeds/area-search-keyword', feed.searchArea);

    // 13. 여행 게시물 작성하기 API

    // 14. 임시 여행 게시물 이미지 업로드 API (썸네일)
    app.post('/app/feeds/timage-upload/thumnail',
        jwtMiddleware,
        multiple_thum_upload.array('thumnails', 5),
        (req, res) => {
            res.send(response(baseResponse.UPLOAD_TEMP_THUMNAIL_SUCCESS));
        });

    // 15. 임시 여행 게시물 이미지 업로드 API (여행)
    app.post('/app/feeds/timage-upload/travel',
        jwtMiddleware,
        multiple_travel_upload.array('travels', 5),
        (req, res) => {
            res.send(response(baseResponse.UPLOAD_TEMP_TRAVEL_SUCCESS));
        });

    // 16. 임시 여행 게시물 이미지 삭제 API (썸네일)

    // 17. 임시 여행 게시물 이미지 삭제 API (여행)

};