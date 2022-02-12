async function selectMainPageByOption(connection, [userIdx, option]) {
    let selectMainPageByOptionQuery;

    switch(option)
    {
        case '최신순':
            selectMainPageByOptionQuery = `
                
            `;
            break;
        case '인기순':
            selectMainPageByOptionQuery = `
            
            `;
            break;
        case '팔로우':
            selectMainPageByOptionQuery = `
            
            `;
            break;
        default:
            break;
    }
    const [selectMainPageByOptionRow] = await connection.query(selectMainPageByOptionQuery, [userIdx, option]);
    return selectMainPageByOptionRow;
}

module.exports = {
    selectMainPageByOption
};