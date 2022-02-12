const { pool } = require("../../../config/database");
const { logger } = require("../../../config/winston");
const mainDao = require("./mainDao");

exports.retrieveMainPage = async function (userIdx, option) {
    const connection = await pool.getConnection(async (conn) => conn);
    const mainPageResult = await mainDao.selectMainPageByOption(connection, [userIdx, option]);
    connection.release();
    return mainPageResult;
};