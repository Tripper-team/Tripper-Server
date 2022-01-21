const { response } = require("./response");
const { errResponse } = require("./response");
const baseResponse = require("./baseResponseStatus");
const upload = require('./aws_s3_multer');
const multiple_thumnail_upload = upload.upload_multiple_thumnail;
const multiple_travel_upload = upload.upload_multiple_travel;

const s3Middleware = (req, res, next) => {
    const option = req.query.option;

    if (!option)
        return res.send(errResponse(baseResponse.UPLOAD_OPTION_EMPTY));

    if (option === 'thumnail') {
        console.log("thum");
        upload.upload_multiple_thumnail();
        // upload.upload_multiple_thumnail().array('images');
        next();
    } else if (option === 'travel') {
        console.log("travel");
        multiple_travel_upload.array('images');
        next();
    } else {
        return res.send(errResponse(baseResponse.UPLOAD_OPTION_ERROR));
    }
};

module.exports = s3Middleware;