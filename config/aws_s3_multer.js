'use strict';

const AWS = require('aws-sdk');
const BUCKET_NAME = 'tripper-bucket';
const multer = require('multer');
const multerS3 = require('multer-s3');
const uuid = require('uuid');
require('dotenv').config();

const S3 = new AWS.S3({
    accessKeyId: process.env.AWS_S3_ACCESS_KEY,
    secretAccessKey: process.env.AWS_S3_SECRET_KEY,
    region: 'ap-northeast-2'
});

const upload = multer({
    storage: multerS3({
        s3: S3,
        bucket: BUCKET_NAME,
        contentType: multerS3.AUTO_CONTENT_TYPE,
        acl: 'public-read',
        key: (req, file, cb) => {
            // cb(null, `profiles/${file.originalname}`);
            cb(null, `profiles/${uuid.v4().toString().replaceAll("-", "")}_${file.originalname}`);
        },
    }),
});


const upload_multiple_thumnail = multer({
    storage: multerS3({
        s3: S3,
        bucket: BUCKET_NAME,
        contentType: multerS3.AUTO_CONTENT_TYPE,
        acl: 'public-read',
        encoding: null,
        key: (req, file, cb) => {
            // cb(null, `thumnails/${file.originalname}`);
            cb(null, `thumnails/${uuid.v4().toString().replaceAll("-", "")}_${file.originalname}`);
        },
    }),
});

const upload_multiple_travel = multer({
    storage: multerS3({
        s3: S3,
        bucket: BUCKET_NAME,
        contentType: multerS3.AUTO_CONTENT_TYPE,
        acl: 'public-read',
        encoding: null,
        key: (req, file, cb) => {
            // cb(null, `travels/${file.originalname}`);
            cb(null, `travels/${uuid.v4().toString().replaceAll("-", "")}_${file.originalname}`);
        },
    }),
});

module.exports = {
    upload,
    upload_multiple_thumnail,
    upload_multiple_travel,
};