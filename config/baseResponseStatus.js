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
    PROFILE_INQUIRE_SUCCESS : { "isSuccess": true, "code": 1012, "message":"프로필 조회에 성공했습니다." },
    AREA_INQUIRE_KEYWORD_SUCCESS : { "isSuccess": true, "code": 1013, "message":"키워드로 장소 검색에 성공했습니다." },
    PROFILE_EDIT_SUCCESS : { "isSuccess": true, "code": 1014, "message":"프로필 수정에 성공했습니다." },
    UPLOAD_TEMP_THUMNAIL_SUCCESS : { "isSuccess": true, "code": 1015, "message":"임시로 썸네일 사진 업로드를 성공했습니다." },
    UPLOAD_TEMP_TRAVEL_SUCCESS : { "isSuccess": true, "code": 1016, "message":"임시로 여행 사진 업로드를 성공했습니다." },
    AWS_S3_DELETE_SUCCESS : { "isSuccess": true, "code": 1017, "message":"임시로 저장된 사진을 삭제했습니다." },
    TRAVEL_LIKE_SUCCESS : { "isSuccess": true, "code": 1018, "message":"좋아요를 활성화 했습니다." },
    TRAVEL_UNLIKE_SUCCESS : { "isSuccess": true, "code": 1019, "message":"좋아요를 비활성화 했습니다." },
    TRAVEL_SCORE_SUCCESS : { "isSuccess": true, "code": 1020, "message":"여행 게시물에 점수 부여를 성공했습니다." },
    TRAVEL_SCORE_EDIT_SUCCESS : { "isSuccess": true, "code": 1021, "message":"이미 여행 게시물에 점수가 부여되어 있기 때문에 점수 수정에 성공했습니다." },
    TRAVEL_DELETE_SUCCESS : { "isSuccess": true, "code": 1022, "message":"여행 게시물 삭제에 성공했습니다." },

    // Common
    TOKEN_EMPTY : { "isSuccess": false, "code": 2000, "message":"JWT 토큰을 입력해주세요." },
    TOKEN_VERIFICATION_FAILURE : { "isSuccess": false, "code": 3000, "message":"JWT 토큰 검증 실패" },

    //Request error
    NICKNAME_EMPTY : { "isSuccess": false, "code": 2001, "message":"닉네임을 입력해주세요." },
    NICKNAME_ERROR_TYPE : { "isSuccess": false, "code": 2002, "message":"닉네임 형식이 잘못되었습니다. (한글,영어,숫자 포함 2자 이상, 10자 이하)" },
    EMAIL_EMPTY : { "isSuccess": false, "code": 2003, "message":"이메일을 입력해주세요." },
    PROFILE_IMG_EMPTY : { "isSuccess": false, "code": 2004, "message":"프로필 사진의 경로를 입력해주세요." },
    KAKAO_ID_EMPTY : { "isSuccess": false, "code": 2005, "message":"카카오 고유번호를 입력해주세요." },
    FOLLOW_TOIDX_EMPTY : { "isSuccess": false, "code": 2006, "message":"팔로우를 요청할 사람의 인덱스를 입력해주세요." },
    FOLLOW_IDX_NOT_MATCH : { "isSuccess": false, "code": 2007, "message":"본인과 다른 사람의 인덱스를 입력해주세요." },
    FOLLOW_SEARCH_OPTION_EMPTY : { "isSuccess": false, "code": 2008, "message":"팔로우 조회 옵션을 입력해주세요." },
    FOLLOW_SEARCH_OPTION_ERROR : { "isSuccess": false, "code": 2009, "message":"팔로우 조회 옵션을 다시 입력해주세요. (following/follower)" },
    USER_IDX_EMPTY : { "isSuccess": false, "code": 2010, "message":"사용자 인덱스를 입력해주세요." },
    KAKAO_REST_KEY_EMPTY : { "isSuccess": false, "code": 2011, "message":"카카오 REST-API-KEY를 입력해주세요." },
    AREA_EMPTY : { "isSuccess": false, "code": 2012, "message":"검색할 키워드(지역)을 입력해주세요." },
    POINT_X_EMPTY : { "isSuccess": false, "code": 2013, "message":"본인의 X좌표를 입력해주세요." },
    POINT_Y_EMPTY : { "isSuccess": false, "code": 2014, "message":"본인의 Y좌표를 입력해주세요." },
    PAGE_EMPTY : { "isSuccess": false, "code": 2015, "message":"조회하실 페이지 번호를 입력해주세요." },
    PAGE_NUMBER_ERROR : { "isSuccess": false, "code": 2016, "message":"페이지 번호는 1이상 5이하로 입력해주세요." },
    S3_PREFIX_EMPTY : { "isSuccess": false, "code": 2017, "message":"썸네일 사진인지 여행 사진인지 입력해주세요. (thumnails, travels)" },
    S3_PREFIX_ERROR : { "isSuccess": false, "code": 2018, "message":"thumnails,travels 중 하나를 입력해주세요." },
    S3_IMAGE_KEY_EMPTY : { "isSuccess": false, "code": 2019, "message":"삭제할 파일의 Key를 입력해주세요." },
    AWS_S3_ERROR : { "isSuccess": false, "code": 2020, "message":"AWS S3 관련 에러가 발생했습니다. 서버측에 문의해주세요." },
    NICKNAME_BAD_WORD : { "isSuccess": false, "code": 2021, "message":"부적절한 용어가 포함되어 있습니다. 다시 설정해주세요." },

    FEED_INFORMATION_EMPTY : { "isSuccess": false, "code": 2022, "message":"여행 게시물에 업로드 하는 정보들을 입력해주세요. (information: {})" },
    FEED_STARTDATE_EMPTY : { "isSuccess": false, "code": 2023, "message":"여행 출발 날짜를 선택해주세요." },
    FEED_ENDDATE_EMPTY : { "isSuccess": false, "code": 2024, "message":"여행 도착 날짜를 선택해주세요." },
    FEED_DATE_ERROR_TYPE : { "isSuccess": false, "code": 2025, "message":"날짜는 YYYY-MM-DD 형식으로 입력해주세요." },
    FEED_TRAFFIC_EMPTY : { "isSuccess": false, "code": 2026, "message":"이동 수단을 입력해주세요." },
    FEED_TRAFFIC_ERROR_TYPE : { "isSuccess": false, "code": 2027, "message":"이동 수단을 잘못 입력하셨습니다. 다시 입력해주세요." },
    FEED_TITLE_EMPTY : { "isSuccess": false, "code": 2028, "message":"여행 제목을 입력해주세요." },
    FEED_INTRODUCE_EMPTY : { "isSuccess": false, "code": 2029, "message":"여행 소개글을 입력해주세요." },
    FEED_DAY_EMPTY : { "isSuccess": false, "code": 2030, "message":"Day를 입력해주세요. (Day: {})" },
    FEED_DAY_NOT_MATCH : { "isSuccess": false, "code": 2031, "message":"입력하신 Day의 길이와 여행 기간이 다릅니다. 다시 입력해주세요." },

    TRAVEL_IDX_EMPTY : { "isSuccess": false, "code": 2032, "message":"여행 인덱스(travelIdx)를 입력해주세요." },
    TRAVEL_SCORE_EMPTY : { "isSuccess": false, "code": 2033, "message":"점수를 입력해주세요." },
    TRAVEL_SCORE_TYPE_ERROR : { "isSuccess": false, "code": 2034, "message":"점수는 1점부터 5점까지 부여가 가능합니다." },

    ACCESS_TOKEN_EMPTY : { "isSuccess": false, "code": 2050, "message": "accessToken을 입력해주세요." },
    ACCESS_TOKEN_INVALID : { "isSuccess": false, "code": 2051, "message": "유효하지 않은 accessToken 입니다." },

    // Response error
    REDUNDANT_NICKNAME : { "isSuccess": false, "code": 3001, "message":"중복된 닉네임입니다." },
    USER_ALREADY_SIGNUP : { "isSuccess": false, "code": 3002, "message":"이미 회원가입한 유저입니다." },
    NOT_EXIST_USER : { "isSuccess": false, "code": 3003, "message":"존재하지 않는 유저입니다." },
    USER_WITHDRAW : { "isSuccess": false, "code": 3004, "message":"탈퇴한 유저입니다." },
    FOLLOWING_SEARCH_NOT_RESULT : { "isSuccess": false, "code": 3005, "message":"팔로잉 조회 결과가 없습니다." },
    FOLLOWER_SEARCH_NOT_RESULT : { "isSuccess": false, "code": 3006, "message":"팔로워 조회 결과가 없습니다." },
    AREA_SEARCH_FAILED : { "isSuccess": false, "code": 3007, "message":"장소 검색에 에러가 발생했습니다." },
    AREA_SEARCH_RESULT_EMPTY : { "isSuccess": false, "code": 3008, "message":"장소 검색 결과가 없습니다." },
    NICKNAME_EQUAL_BEFORE : { "isSuccess": false, "code": 3009, "message":"이전 닉네임과 동일합니다." },
    AWS_S3_FILE_NOT_FOUND : { "isSuccess": false, "code": 3010, "message":"폴더가 비어있습니다. 제거할 대상이 없습니다." },
    AWS_S3_KEY_NOT_MATCH : { "isSuccess": false, "code": 3011, "message":"보내주신 Key에 맞는 파일을 찾지 못했습니다. 다시 입력해주세요." },
    TRAVEL_NOT_EXIST : { "isSuccess": false, "code": 3012, "message":"존재하지 않는 여행 게시물입니다." },
    TRAVEL_STATUS_PRIVATE : { "isSuccess": false, "code": 3013, "message":"비공개 여행 게시물입니다." },
    TRAVEL_STATUS_DELETED : { "isSuccess": false, "code": 3014, "message":"삭제된 여행 게시물입니다." },
    TRAVEL_WRITER_WRONG : { "isSuccess": false, "code": 3015, "message":"여행 게시물 작성자와 다릅니다." },

    //Connection, Transaction 등의 서버 오류
    DB_ERROR : { "isSuccess": false, "code": 4000, "message": "데이터 베이스 에러"},
    SERVER_ERROR : { "isSuccess": false, "code": 4001, "message": "서버 에러"},
}
