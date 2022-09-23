#!/usr/bin/env node

import fs from 'node:fs';
import https from 'node:https';
import clc from 'cli-color';
import commander from 'commander';
import csrf from 'csurf';
import express from 'express';
import middleware from './lib/middleware.js';
import { deepmerge } from './lib/utils.js';
import configDefault from './config.default.js';

const pkg = JSON.parse(fs.readFileSync('./package.json'));

const app = express();

let defaultPort = 80;
let server = app;
let sslOptions;

const loadConfig = async () => {
  const configExist = fs.existsSync('./config.js');
  if (configExist === true) {
    try {
      // eslint-disable-next-line import/no-unresolved
      const { default: configCustom } = await import('./config.js');
      return deepmerge(configDefault, configCustom);
    } catch (e) {
      console.error(clc.red('Unable to load config.js!'));
      console.error(clc.red('Error is:'));
      console.log(clc.red(e));
      process.exit(1);
    }
  } else {
    console.log('No custom config.js found, loading config.default.js');
    return configDefault;
  }
};

async function bootstrap(config) {
  const resolvedMiddleware = await middleware(config);
  app.use(config.site.baseUrl, resolvedMiddleware);
  app.use(config.site.baseUrl, csrf());

  if (config.site.sslEnabled) {
    defaultPort = 443;
    sslOptions = {
      key: fs.readFileSync(config.site.sslKey),
      cert: fs.readFileSync(config.site.sslCert),
    };
    server = https.createServer(sslOptions, app);
  }

  const addressString = (config.site.sslEnabled ? 'https://' : 'http://')
    + (config.site.host || '0.0.0.0') + ':' + (config.site.port || defaultPort);

  server.listen(config.site.port, config.site.host, function () {
    if (config.options.console) {
      console.log('Mongo Express server listening', 'at ' + addressString);

      if (!config.site.host || config.site.host === '0.0.0.0') {
        console.error(clc.red('Server is open to allow connections from anyone (0.0.0.0)'));
      }

      if (config.useBasicAuth !== true) {
        console.warn(clc.red('Basic authentication is disabled. It is recommended to set the useBasicAuth to true in the config.js.'));
      } else if (config.basicAuth.username === 'admin' && config.basicAuth.password === 'pass') {
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
}

const config = await loadConfig();

if (config.options.console === true) {
  console.log('Welcome to mongo-express');
  console.log('------------------------');
  console.log('\n');
}

commander
  .version(pkg.version)
  .option('-U, --url <url>', 'connection string url')
  .option('-H, --host <host>', 'hostname or address of the db(deprecated)')
  .option('-P, --dbport <host>', 'port of the db(deprecated)')
  .option('-u, --username <username>', 'username for authentication(deprecated)')
  .option('-p, --password <password>', 'password for authentication(deprecated)')
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
    const user = {
      database: commander.database,
      username: commander.username,
      password: commander.password,
      host: commander.host,
      port: commander.dbport,
    };
    for (const key in user) {
      if (!user[key]) {
        commander.help();
      }
    }
    config.mongodb.mongo.username = user.username;
    config.mongodb.mongo.password = user.password;
    config.mongodb.mongo.dbName = user.database;
    config.mongodb.mongo.host = user.host;
    config.mongodb.mongo.port = user.port;
    config.mongodb.connectionString = config.mongodb.getConnectionStringFromInlineParams();
  }
  config.useBasicAuth = false;
}

if (commander.url) {
  config.mongodb.connectionString = commander.url;
  if (commander.admin) {
    config.mongodb.admin = true;
  }
}

config.mongodb.server = commander.host || config.mongodb.server;
config.mongodb.port = commander.dbport || config.mongodb.port;

config.site.port = commander.port || config.site.port;

if (!config.site.baseUrl) {
  console.error('Please specify a baseUrl in your config. Using "/" for now.');
  config.site.baseUrl = '/';
}

await bootstrap(config);
