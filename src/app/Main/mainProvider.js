const { pool } = require("../../../config/database");
const { logger } = require("../../../config/winston");
const mainDao = require("./mainDao");

exports.retrieveMainPage = async function (userIdx, option, page, pageSize) {
    const connection = await pool.getConnection(async (conn) => conn);

    let start = (page - 1) * pageSize;
    const mainPageTotalCount = (await mainDao.selectMainPageResultCount(connection, [userIdx, option]))[0].totalCount;
    if (page > Math.ceil(mainPageTotalCount / pageSize)) {
        connection.release();
        return -1;
    }
    else {
        const mainPageResult = await mainDao.selectMainPageByOption(connection, [userIdx, option, start, pageSize]);
        connection.release();
        return mainPageResult;
    }
};