const AWS = require('aws-sdk');
require('dotenv').config();

const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_S3_ACCESS_KEY,
    secretAccessKey: process.env.AWS_S3_SECRET_KEY,
    region: process.env.AWS_S3_REGION
});

module.exports = s3;