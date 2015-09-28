'use strict';

var express     = require('express');
var config      = require('./config');
var middleware  = require('./middleware');

var app = express();

app.use('/', middleware(config));
app.set('read_only', config.options.readOnly || false);
app.listen(config.site.port, config.site.host, function() {
  console.log('Mongo Express server listening',
    'on port ' + (config.site.port || 80),
    'at ' + (config.site.host || '0.0.0.0'));
});
