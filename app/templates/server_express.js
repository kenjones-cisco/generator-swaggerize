'use strict';

var path = require('path');
var express = require('express');
var morgan = require('morgan');
var bodyParser = require('body-parser');
var swaggerize = require('swaggerize-express');
var logger = require('./config/logger');

<% if (database) {%>
var mongoDb = require('./config/db');
mongoDb.setupDatabase(logger);<%}%>

var port = Number(process.env.PORT || 8000);
var app = express();

app.use(morgan('combined', {'stream': logger.stream}));
app.use(bodyParser.json());

app.use(swaggerize({
    api: path.resolve('./<%=apiPath%>'),
    handlers: path.resolve('./handlers')
}));

app.listen(port, function () {
    logger.info('Listening on %s',  port);
});
