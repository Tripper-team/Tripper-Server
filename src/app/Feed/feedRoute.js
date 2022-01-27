module.exports = function(app) {
    const feed = require('./feedController');
    const jwtMiddleware = require('../../../config/jwtMiddleware');
    const s3Multer = require('../../../config/multer');
    const {response, errResponse} = require("../../../config/response");
    const baseResponse = require("../../../config/baseResponseStatus");

    // 12. 키워드로 장소 검색 API (카카오 API)
    app.get('/app/feeds/area-search-keyword', feed.searchArea);

    // 13. 여행 게시물 작성하기 API
    app.post('/app/feeds', jwtMiddleware, feed.postFeed);

    // 14. 임시 여행 게시물 이미지 업로드 API (썸네일)
    app.post('/app/feeds/timage-upload/thumnail',
        jwtMiddleware,
        s3Multer.multiple_thumnail_upload.array('thumnails', 5),
        (req, res) => {
            let result = [];
            for(let i in req.files) {
                let temp = {
                    originalname: req.files[i].originalname,
                    key: req.files[i].key,
                    location: req.files[i].location,
                    contentType: req.files[i].contentType
                }

                result.push(temp);
            }

            res.send(response(baseResponse.UPLOAD_TEMP_THUMNAIL_SUCCESS, result));
        });

    // 15. 임시 여행 게시물 이미지 업로드 API (여행)
    app.post('/app/feeds/timage-upload/travel',
        jwtMiddleware,
        s3Multer.multiple_travel_upload.array('travels', 5),
        (req, res) => {
            let result = [];
            for(let i in req.files) {
                let temp = {
                    originalname: req.files[i].originalname,
                    key: req.files[i].key,
                    location: req.files[i].location,
                    contentType: req.files[i].contentType
                }

                result.push(temp);
            }

            res.send(response(baseResponse.UPLOAD_TEMP_TRAVEL_SUCCESS, result));
        });

    // 16. 임시 여행 게시물 이미지 삭제 API
    app.delete('/app/feeds/timage-delete', jwtMiddleware, feed.deleteTempImage);
};