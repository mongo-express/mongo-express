#!/usr/bin/env node

'use strict';

const clc             = require('cli-color');
const csrf            = require('csurf');
const commander       = require('commander');
const express         = require('express');
const fs              = require('fs');
const https           = require('https');
const middleware      = require('./lib/middleware');
const utils           = require('./lib/utils');
const updateNotifier  = require('update-notifier');
const pkg             = require('./package.json');

let app               = express();
let notifier          = updateNotifier({ pkg });

let config;
let defaultPort = 80;
let server      = app;
let sslOptions;

// Notify of any updates
notifier.notify();

try {
  // eslint-disable-next-line import/no-unresolved
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

if (config.options.console) {
  console.log('Welcome to mongo-express');
  console.log('------------------------');
  console.log('\n');
}

commander
  .version(require('./package').version)
  .option('-H, --host <host>', 'hostname or adress')
  .option('-P, --dbport <host>', 'port of the db')
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
    let user = {
      database: commander.database,
      username: commander.username,
      password: commander.password,
    };
    for (let key in user) {
      if (!user[key]) {
        commander.help();
      }
    }

    config.mongodb.auth[0] = user;
  }

  config.useBasicAuth = false;
}

config.mongodb.server = commander.host || config.mongodb.server;
config.mongodb.port = commander.dbport || config.mongodb.port;

config.site.port = commander.port || config.site.port;

if (!config.site.baseUrl) {
  console.error('Please specify a baseUrl in your config. Using "/" for now.');
  config.site.baseUrl = '/';
}

app.use(config.site.baseUrl, middleware(config));
app.use(csrf());

if (config.site.sslEnabled) {
  defaultPort     = 443;
  sslOptions  = {
    key:  fs.readFileSync(config.site.sslKey),
    cert: fs.readFileSync(config.site.sslCert),
  };
  server = https.createServer(sslOptions, app);
}

let addressString = (config.site.sslEnabled ? 'https://' : 'http://') + (config.site.host || '0.0.0.0') + ':' + (config.site.port || defaultPort);

server.listen(config.site.port, config.site.host, function () {
  if (config.options.console) {

    console.log('Mongo Express server listening', 'at ' + addressString);

    if (!config.site.host || config.site.host === '0.0.0.0') {
      console.error(clc.red('Server is open to allow connections from anyone (0.0.0.0)'));
    }

    if (config.basicAuth.username === 'admin' && config.basicAuth.password === 'pass') {
      console.error(clc.red('basicAuth credentials are "admin:pass", it is recommended you change this in your config.js!'));
    }

  }
})
.on('error', function (e) {
  if (e.code === 'EADDRINUSE') {
    console.log();
    console.error(clc.red('Address ' + addressString + ' already in use! You need to pick a different host and/or port.'));
    console.log('Maybe mongo-express is already running?');
  }

  console.log();
  console.log('If you are still having trouble, try Googling for the key parts of the following error object before posting an issue');
  console.log(JSON.stringify(e));
  return process.exit(1);
});
