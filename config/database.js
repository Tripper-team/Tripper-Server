const mysql = require('mysql2/promise');
const {logger} = require('./winston');

// TODO: 본인의 DB 계정 입력
const pool = mysql.createPool({
    host: 'jason-server-db.cfltfq7gemdj.ap-northeast-2.rds.amazonaws.com',
    user: 'admin',
    port: '3306',
    password: 'rkddnrdl1863',
    database: 'Tripper'
});

module.exports = {
    pool: pool
};