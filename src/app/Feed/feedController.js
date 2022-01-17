const feedProvider = require("../Feed/feedProvider");
const feedService = require("../Feed/feedService");
const baseResponse = require("../../../config/baseResponseStatus");
const {response, errResponse} = require("../../../config/response");
const axios = require("axios");
const secret_config = require("../../../config/secret");
const jwt = require("jsonwebtoken");
require('dotenv').config();

/**
 * API No. 12
 * API Name : 장소 검색 API
 * [GET] /app/
 */
exports.searchArea = (req, res) => {

};