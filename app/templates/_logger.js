'use strict';
var winston = require('winston');
winston.emitErrs = true;


var transports = [
    new winston.transports.File({
        level: 'info',
        filename: 'all-logs.log',
        handleExceptions: true,
        json: true,
        maxsize: 5242880, //5MB
        maxFiles: 5,
        colorize: false
    })];

if (process.env.NODE_ENV === 'dev') {
    transports.push(
        new winston.transports.Console({
            level: 'debug',
            handleExceptions: true,
            json: false,
            colorize: true
        }));
}

var logger = new winston.Logger({
    transports: transports,
    exitOnError: false
});


module.exports = logger;
module.exports.stream = {
    write: function(message, encoding){
        logger.info(message);
    }
};