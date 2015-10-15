'use strict';
var mongoose = require('mongoose');
var connection = mongoose.connection;

exports.setupDatabase = function (logger) {
    var options, uri;
    var dbName = process.env.DB_NAME || '<%=database%>';
    var host = process.env.DB_HOST || 'localhost';
    var port = process.env.DB_PORT || 27017;
    var login = '';

    if (process.env.DB_LOGIN && process.env.DB_PASSWD) {
        login = process.env.DB_LOGIN + ':' + process.env.DB_PASSWD + '@';
    }
    uri = process.env.DB_URI || 'mongodb://' + login + host + ':' + port + '/' + dbName;

    options = {
        db: {
            safe: true
        }
    };

    // Connect to Database
    mongoose.connect(uri, options);
    connection.on('error', function(err) {
        logger.log('error', 'db (%s)', dbName, err);
    });

    return mongoose;
};
