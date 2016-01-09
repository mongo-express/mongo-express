#!/usr/bin/env node

'use strict';

var utils       = require('./utils');
var express     = require('express');
var fs          = require('fs');
var https       = require('https');
var middleware  = require('./middleware');
var commander   = require('commander');
var clc         = require('cli-color');
var app         = express();
var defaultPort = 80;
var server      = app;
var config;
var sslOptions;

console.log('Welcome to mongo-express');
console.log('------------------------');
console.log('\n');

try {
  config = utils.deepmerge(require('./config.default'), require('./config'));
} catch (e) {
  if (e.code === 'MODULE_NOT_FOUND') {
    console.log('No custom config.js found, loading config.default.js');
  } else {
    console.error(clc.red('Unable to load config.js!'));
    console.error(clc.red('Error is:'));
    console.log(clc.red(e));
    process.exit(1);
  }

  config = require('./config.default');
}

commander
  .version(require('./package').version)
  .option('-u, --username <username>', 'username for authentication')
  .option('-p, --password <password>', 'password for authentication')
  .option('-a, --admin', 'enable authentication as admin')
  .option('-d, --database <database>', 'authenticate to database')
  .option('--port <port>', 'listen on specified port')
.parse(process.argv);

if (commander.username && commander.password) {
  config.mongodb.admin = !!commander.admin;
  if (commander.admin) {
    config.mongodb.adminUsername = commander.username;
    config.mongodb.adminPassword = commander.password;
  } else {
    var user = {
      database: commander.database,
      username: commander.username,
      password: commander.password,
    };
    for (var key in user) {
      if (!user[key]) {
        commander.help();
      }
    }

    config.mongodb.auth[0] = user;
  }

  config.useBasicAuth = false;
}

config.site.port = commander.port || config.site.port;

if (!config.site.baseUrl) {
  console.error('Please specify a baseUrl in your config. Using "/" for now.');
  config.site.baseUrl = '/';
}

if (config.basicAuth.username === 'admin' && config.basicAuth.password === 'pass') {
  console.error(clc.red('basicAuth credentials are "admin:pass", it is recommended you change this in your config.js!'));
}

if (!config.site.host || config.site.host === '0.0.0.0') {
  console.error(clc.red('Server is open to allow connections from anyone (0.0.0.0)'));
}

app.use(config.site.baseUrl, middleware(config));
app.set('read_only', config.options.readOnly || false);

if (config.site.sslEnabled) {
  defaultPort     = 443;
  sslOptions  = {
    key:  fs.readFileSync(config.site.sslKey),
    cert: fs.readFileSync(config.site.sslCert),
  };
  server = https.createServer(sslOptions, app);
}

server.listen(config.site.port, config.site.host, function() {
  console.log('Mongo Express server listening',
    'on port ' + (config.site.port || defaultPort),
    'at '      + (config.site.host || '0.0.0.0'));
});
