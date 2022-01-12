async function selectIsEmailExist(connection, email) {
  const selectEmailExistQuery = `
    SELECT EXISTS(SELECT email FROM User WHERE email = ?) as isEmailExist;
  `;
  const [emailExistRow] = await connection.query(selectEmailExistQuery, email);
  return emailExistRow;
}

async function selectUserInfo(connection, email) {
  const selectUserInfoQuery = `
    SELECT *
    FROM User
    WHERE User.email = ?;
  `;
  const [userInfoRow] = await connection.query(selectUserInfoQuery, email);
  return userInfoRow;
}

module.exports = {
  selectIsEmailExist,
  selectUserInfo
};
