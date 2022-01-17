'use strict';

const AWS = require('aws-sdk');
const request = require('request-promise');
const md5 = require('md5');
const BUCKET_NAME = 'tripper-bucket';
require('dotenv').config();

const S3 = new AWS.S3({
    accessKeyId: process.env.AWS_S3_ACCESS_KEY,
    secretAccessKey: process.env.AWS_S3_SECRET_KEY,
    region: 'ap-northeast-2'
});


class AWS_S3 {
    // S3에 이미지 업로드
    async upload(url) {
        const request_option = {
            method: 'GET',
            url: url,
            encoding: null   // 파일을 어떻게 읽을 것인지?
        };

        let params = {
            'Key': `image/${md5(url)}.jpg`,
            'Bucket': BUCKET_NAME,
            'Body': await request(request_option),
            'ContentType': 'image/jpg'
        };

        return await S3.upload(params).promise();
    }
}

module.exports = new AWS_S3();
