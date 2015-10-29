'use strict';

var express     = require('express');
var config      = require('./config');
var middleware  = require('./middleware');

var app = express();

app.use('/', middleware(config));
app.set('read_only', config.options.readOnly || false);

var defaultPort = 80;
var server      = app;

if (config.site.sslEnabled){
  defaultPort     = 443;
  var https       = require('https');
  var fs          = require('fs');
  var sslOptions  = {
    key:  fs.readFileSync(config.site.sslKey),
    cert: fs.readFileSync(config.site.sslCert)
  };
  server          = https.createServer(sslOptions, app);
}

server.listen(config.site.port, config.site.host, function() {
  console.log('Mongo Express server listening',
      'on port ' + (config.site.port || defaultPort),
      'at ' + (config.site.host || '0.0.0.0'));
});
