const fs = require('fs');
const fword_array = fs.readFileSync('config/fword/fword_list.txt').toString().replace(/\r/gi, "").split("\n");

// 닉네임에 부적절한 용어가 포함되어 있는지 체크
const checkNickFword = (nick) => {
    let find = 0;
    fword_array.forEach((word) => {
        if (nick.includes(word)) {
            find = 1;
            return false;
        }
    });
    return find;
};

module.exports = {
    checkNickFword
};