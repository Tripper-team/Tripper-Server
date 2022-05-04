module.exports = function(app) {
    const feed = require('./feedController');
    const jwtMiddleware = require('../../../config/jwtMiddleware');
    const s3Multer = require('../../../config/multer');
    const {response, errResponse} = require("../../../config/response");
    const baseResponse = require("../../../config/baseResponseStatus");

    // FD1. 여행 게시물 작성하기 API
    app.post('/app/feeds', jwtMiddleware, feed.postFeed);

    // FD2. 키워드로 장소 검색 API (카카오 API)
    app.get('/app/feeds/area-search-keyword', feed.searchArea);

    // FD3. 임시 여행 게시물 이미지 업로드 API (썸네일)
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

    // FD4. 임시 여행 게시물 이미지 업로드 API (여행)
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

    // FD5. 임시 여행 게시물 이미지 삭제 API
    app.delete('/app/feeds/timage-delete', jwtMiddleware, feed.deleteTempImage);

    // FD7. 여행 게시물 삭제하기 API
    app.patch('/app/feeds/:feedIdx/deletion', jwtMiddleware, feed.deleteFeed);

    // FD8. 여행 게시물 좋아요 API
    app.post('/app/feeds/like', jwtMiddleware, feed.postFeedLike);
    
    // FD9. 여행 게시물 점수 부여 및 수정 API
    app.post('/app/feeds/score', jwtMiddleware, feed.postFeedScore);

    // FD10. 여행 게시물 공개 범위 전환 API
    app.patch('/app/feeds/:feedIdx/change-status', jwtMiddleware, feed.patchFeedStatus);

    // FD11. 특정 여행 게시물 조회하기 API
    app.get('/app/feeds/:feedIdx/search', jwtMiddleware, feed.getFeed);

    // FD12. 특정 여행 게시물 day 정보 조회 API
    app.get('/app/feeds/:feedIdx/search/dayinfo', jwtMiddleware, feed.getFeedDayInfo);

    /** 여행 게시물 댓글 관련 API **/
    // FD13. 여행 게시물 댓글 작성하기 API
    app.post('/app/feeds/comments', jwtMiddleware, feed.postComment);

    // FD14. 여행 게시물 댓글 수정하기 API
    app.patch('/app/feeds/:feedIdx/comments/:commentIdx/change', jwtMiddleware, feed.patchComment);

    // FD15. 여행 게시물 부모 댓글 조회하기 API
    app.get('/app/feeds/:feedIdx/comments-list', jwtMiddleware, feed.getFeedComment);

    // FD16. 여행 게시물 댓글 삭제하기 API
    app.patch('/app/feeds/:feedIdx/comments/:commentIdx/deletion', jwtMiddleware, feed.deleteComment);

    // // FD17. 특정 여행 게시물 day 안의 장소 정보 조회 API
    // app.get('/app/feeds/:feedIdx/search/review', jwtMiddleware, feed.getFeedAreaInfo);
};