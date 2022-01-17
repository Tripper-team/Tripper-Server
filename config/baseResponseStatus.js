//Response로 보내줄 상태코드와 메세지 등을 이 파일에서 관리함

module.exports = {

    // Success
    SUCCESS : { "isSuccess": true, "code": 1000, "message":"성공" },
    KAKAO_LOGIN_SUCCESS : { "isSuccess": true, "code": 1002, "message":"카카오톡 소셜로그인에 성공했습니다." },
    KAKAO_SIGN_UP : { "isSuccess": true, "code": 1003, "message":"환영합니다! 사용하시기 전 회원가입을 진행해주시기 바랍니다." },
    SIGN_UP_SUCCESS : { "isSuccess": true, "code": 1004, "message":"회원가입에 성공했습니다." },
    NICKNAME_CHECK_SUCCESS : { "isSuccess": true, "code": 1005, "message":"사용 가능한 닉네임입니다." },
    AUTO_LOGIN_SUCCESS : { "isSuccess": true, "code": 1006, "message":"자동 로그인을 성공했습니다 (JWT 토큰 검증 성공)" }, // ?
    FOLLOW_SUCCESS : { "isSuccess": true, "code": 1007, "message":"팔로우를 성공했습니다." },
    UNFOLLOW_SUCCESS : { "isSuccess": true, "code": 1008, "message":"언팔로우를 성공했습니다." },
    FOLLOWING_LIST_SUCCESS : { "isSuccess": true, "code": 1009, "message":"팔로잉 조회를 성공했습니다." },
    FOLLOWER_LIST_SUCCESS : { "isSuccess": true, "code": 1010, "message":"팔로워 조회를 성공했습니다." },
    USER_CHECK_SUCCESS : { "isSuccess": true, "code": 1011, "message":"사용자를 확인했습니다." },

    // Common
    TOKEN_EMPTY : { "isSuccess": false, "code": 2000, "message":"JWT 토큰을 입력해주세요." },
    TOKEN_VERIFICATION_FAILURE : { "isSuccess": false, "code": 3000, "message":"JWT 토큰 검증 실패" },

    //Request error
    NICKNAME_EMPTY : { "isSuccess": false, "code": 2001, "message":"닉네임을 입력해주세요." },
    NICKNAME_ERROR_TYPE : { "isSuccess": false, "code": 2002, "message":"닉네임 형식이 잘못되었습니다. (한영 포함 10자 이내)" },
    EMAIL_EMPTY : { "isSuccess": false, "code": 2003, "message":"이메일을 입력해주세요." },
    PROFILE_IMG_EMPTY : { "isSuccess": false, "code": 2004, "message":"프로필 사진의 경로를 입력해주세요." },
    KAKAO_ID_EMPTY : { "isSuccess": false, "code": 2005, "message":"카카오 고유번호를 입력해주세요." },
    FOLLOW_TOIDX_EMPTY : { "isSuccess": false, "code": 2006, "message":"팔로우를 요청할 사람의 인덱스를 입력해주세요." },
    FOLLOW_IDX_NOT_MATCH : { "isSuccess": false, "code": 2007, "message":"본인과 다른 사람의 인덱스를 입력해주세요." },
    FOLLOW_SEARCH_OPTION_EMPTY : { "isSuccess": false, "code": 2008, "message":"팔로우 조회 옵션을 입력해주세요." },
    FOLLOW_SEARCH_OPTION_ERROR : { "isSuccess": false, "code": 2009, "message":"팔로우 조회 옵션을 다시 입력해주세요. (following/follower)" },
    FOLLOW_SEARCH_NOT_RESULT : { "isSuccess": false, "code": 2010, "message":"팔로우 조회 결과가 없습니다." },
    USER_IDX_EMPTY : { "isSuccess": false, "code": 2011, "message":"사용자 인덱스를 입력해주세요." },

    ACCESS_TOKEN_EMPTY : { "isSuccess": false, "code": 2050, "message": "accessToken을 입력해주세요." },
    ACCESS_TOKEN_INVALID : { "isSuccess": false, "code": 2051, "message": "유효하지 않은 accessToken 입니다." },

    // Response error
    REDUNDANT_NICKNAME : { "isSuccess": false, "code": 3001, "message":"중복된 닉네임입니다." },
    USER_ALREADY_SIGNUP : { "isSuccess": false, "code": 3002, "message":"이미 회원가입한 유저입니다." },
    NOT_EXIST_USER : { "isSuccess": false, "code": 3003, "message":"존재하지 않는 유저입니다." },

    //Connection, Transaction 등의 서버 오류
    DB_ERROR : { "isSuccess": false, "code": 4000, "message": "데이터 베이스 에러"},
    SERVER_ERROR : { "isSuccess": false, "code": 4001, "message": "서버 에러"},
}
