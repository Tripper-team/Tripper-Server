const mysql = require('mysql2/promise');
const {logger} = require('./winston');
require('dotenv').config();

// TODO: 본인의 DB 계정 입력
let pool;

if (process.env.NODE_ENV = 'production') {
    pool = mysql.createPool({
        host: process.env.RDS_HOST,
        user: process.env.RDS_USER,
        port: process.env.RDS_PORT,
        password: process.env.RDS_PASSWORD,
        database: process.env.RDS_PROD_DB
    });
}
else {
    pool = mysql.createPool({
        host: process.env.RDS_HOST,
        user: process.env.RDS_USER,
        port: process.env.RDS_PORT,
        password: process.env.RDS_PASSWORD,
        database: process.env.RDS_DEV_DB
    });
}

module.exports = {
    pool: pool
};