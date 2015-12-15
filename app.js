#!/usr/bin/env node

'use strict';

var express     = require('express');
var fs          = require('fs');
var https       = require('https');
var middleware  = require('./middleware');
var program     = require('commander');
var app         = express();
var defaultPort = 80;
var server      = app;
var config;
var sslOptions;

try {
  config = require('./config');
} catch (e) {
  config = require('./config.default');

  program
    .version(require('./package').version)
    .option('-u, --username <username>', 'username for authentication')
    .option('-p, --password <password>', 'password for authentication')
    .option('-a, --admin', 'enable authentication as admin')
    .option('-d, --database <database>', 'authenticate to database')
    .option('--port <port>', 'listen on specified port')
  .parse(process.argv);

  config.mongodb.admin = !!program.admin;
  if (program.admin) {
    config.mongodb.adminUsername = program.username;
    config.mongodb.adminPassword = program.password;
  } else {
    var user = {
      database: program.database,
      username: program.username,
      password: program.password
    };
    for (var key in user) {
      if (!user[key]) {
        program.help();
      }
    }
    config.mongodb.auth[0] = user;
  }
  config.site.port = program.port || config.site.port;
  config.useBasicAuth = false;
}

app.use(config.site.baseUrl, middleware(config));
app.set('read_only', config.options.readOnly || false);

if (config.site.sslEnabled){
  defaultPort     = 443;
  sslOptions  = {
    key:  fs.readFileSync(config.site.sslKey),
    cert: fs.readFileSync(config.site.sslCert)
  };
  server = https.createServer(sslOptions, app);
}

server.listen(config.site.port, config.site.host, function() {
  console.log('Mongo Express server listening',
    'on port ' + (config.site.port || defaultPort),
    'at '      + (config.site.host || '0.0.0.0'));
});
