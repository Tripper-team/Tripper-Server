'use strict';

const AWS = require('aws-sdk');
const BUCKET_NAME = 'tripper-bucket';
const multer = require('multer');
const multerS3 = require('multer-s3');
require('dotenv').config();

const S3 = new AWS.S3({
    accessKeyId: process.env.AWS_S3_ACCESS_KEY,
    secretAccessKey: process.env.AWS_S3_SECRET_KEY,
    region: 'ap-northeast-2'
});

let upload = multer({
    storage: multerS3({
        s3: S3,
        bucket: BUCKET_NAME,
        contentType: multerS3.AUTO_CONTENT_TYPE,
        acl: 'public-read',
        key: (req, file, cb) => {
            cb(null, `profile/${file.originalname}`);
        },
    }),
});

module.exports = upload;