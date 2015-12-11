'use strict';

var path = require('path');
var express = require('express');
var morgan = require('morgan');
var bodyParser = require('body-parser');
var swaggerize = require('swaggerize-express');
var logger = require('./config/logger');

<% if (database) {%>
var mongoDb = require('./config/db');<%}%>


var server = module.exports;

server.configure = function () {

    <% if (database) {%>
    // make sure the database connection is setup
    mongoDb.setupDatabase(logger);<%}%>

    this.app = express();

    this.app.use(morgan('combined', {
        'stream': logger.stream
    }));
    this.app.use(bodyParser.json());

    this.app.use(swaggerize({
        api: path.resolve('./<%=apiPath%>'),
        handlers: path.resolve('./handlers')
    }));

}.bind(this);

/* istanbul ignore next */
server.start = function () {
    var port = Number(process.env.PORT || 8000);

    // configure the app for use
    this.configure();

    this.app.listen(port, function () {
        logger.info('Listening on %s', port);
    });
}.bind(this);

/* istanbul ignore if */
if (require.main === module) {
    this.start();
}
