const express = require('./config/express');
const {logger} = require('./config/winston');

let port;

if (process.env.NODE_ENV === 'development') port = 3001;
else if (process.env.NODE_ENV === 'production') port = 3002;
else port = 3000;

express().listen(port);
logger.info(`${process.env.NODE_ENV} - API Server Start At Port ${port}`);