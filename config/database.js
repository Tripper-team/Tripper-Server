const mysql = require('mysql2/promise');
const {logger} = require('./winston');
require('dotenv').config();

let pool;

if (process.env.NODE_ENV === 'production') {
    pool = mysql.createPool({
        host: process.env.RDS_HOST,
        user: process.env.RDS_USER,
        port: process.env.RDS_PORT,
        password: process.env.RDS_PASSWORD,
        database: process.env.RDS_PROD_DB,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        enableKeepAlive: true
    });
} else {
    pool = mysql.createPool({
        host: process.env.RDS_HOST,
        user: process.env.RDS_USER,
        port: process.env.RDS_PORT,
        password: process.env.RDS_PASSWORD,
        database: process.env.RDS_DEV_DB,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        enableKeepAlive: true
    });
}

module.exports = {
    pool: pool
};