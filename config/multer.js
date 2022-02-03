const multer = require('multer');
const multerS3 = require('multer-s3');
const s3 = require('./s3');
const uuid = require('uuid');
const md5 = require('md5');
const request = require("request-promise");
require('dotenv').config();

const kakao_upload = async (url) => {
    const request_option = {
        method: 'GET',
        url: url,
        encoding: null
    };

    const params = {
        'Key': `kakaoProfiles/${md5(url)}`,
        'Bucket': process.env.AWS_S3_BUCKET_NAME,
        'Body': await request(request_option),
        'ContentType': 'image/jpg'
    };

    return await s3.upload(params).promise();
};

const single_upload = multer({
    storage: multerS3({
        s3: s3,
        bucket: process.env.AWS_S3_BUCKET_NAME,
        contentType: multerS3.AUTO_CONTENT_TYPE,
        acl: 'public-read',
        key: (req, file, cb) => {
            // cb(null, `profiles/${file.originalname}`);
            cb(null, `profiles/${uuid.v4().toString().replace(/-/gi, "")}`);
        },
    }),
    limits: {
        fileSize: 1000 * 1000 * 10
    }
});

const multiple_thumnail_upload = multer({
    storage: multerS3({
        s3: s3,
        bucket: process.env.AWS_S3_BUCKET_NAME,
        contentType: multerS3.AUTO_CONTENT_TYPE,
        acl: 'public-read',
        key: (req, file, cb) => {
            // cb(null, `thumnails/${file.originalname}`);
            cb(null, `temp/thumnails/${uuid.v4().toString().replace(/-/gi, "")}`);
        },
    }),
    limits: {
        fileSize: 1000 * 1000 * 10
    }
});

const multiple_travel_upload = multer({
    storage: multerS3({
        s3: s3,
        bucket: process.env.AWS_S3_BUCKET_NAME,
        contentType: multerS3.AUTO_CONTENT_TYPE,
        acl: 'public-read',
        key: (req, file, cb) => {
            // cb(null, `travels/${file.originalname}`);
            cb(null, `temp/travels/${uuid.v4().toString().replace(/-/gi, "")}`);
        },
    }),
    limits: {
        fileSize: 1000 * 1000 * 10
    }
});


module.exports = {
    kakao_upload,
    single_upload,
    multiple_thumnail_upload,
    multiple_travel_upload
};