#!/usr/bin/env node

import fs from 'node:fs';
import https from 'node:https';
import path from 'node:path';
import pico from 'picocolors';
import { program } from 'commander';
import csrf from 'csurf';
import express from 'express';
import middleware from './lib/middleware.js';
import { deepmerge, hasConnectionString } from './lib/utils.js';
import configDefault from './config.default.js';
import { promptForConnectionString } from './lib/prompt.js';

const __dirname = import.meta.dirname;

const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, './package.json'), 'utf8'));

const app = express();

let defaultPort = 80;
let server = app;
let sslOptions;

const loadConfig = async () => {
  if (fs.existsSync('./config.js')) {
    try {

      const { default: configCustom } = await import('./config.js');
      return deepmerge(configDefault, configCustom);
    } catch (error) {
      console.error(pico.red('Unable to load config.js!'));
      console.error(pico.red('Error is:'));
      console.log(pico.red(error));
      process.exit(1);
    }
  } else {
    console.log('No custom config.js found, loading config.default.js');
    return configDefault;
  }
};

async function bootstrap(config) {
  // An explorer takes its credentials per session, so having none at startup is
  // the normal state rather than a misconfiguration.
  if (!config.explorer?.ticketOnly && !hasConnectionString(config.mongodb)) {
    // Only prompt when someone is there to answer. Under Docker, systemd or CI stdin is not
    // a TTY, and blocking on it would hang the process instead of reporting the problem.
    if (!process.stdin.isTTY) {
      console.error(pico.red('No MongoDB connection string configured.'));
      console.error('Set ME_CONFIG_MONGODB_URL, pass --url <uri>, or define mongodb.connectionString in config.js.');
      return process.exit(1);
    }

    console.log(pico.yellow('\nNo MongoDB connection string configured.'));
    try {
      // Only meaningful for the single-connection form; a list that reached here is empty.
      config.mongodb = { ...config.mongodb, connectionString: await promptForConnectionString() };
    } catch (error) {
      console.error(pico.red(`\n${error.message}`));
      return process.exit(1);
    }
  }

  const resolvedMiddleware = await middleware(config);
  app.use(config.site.baseUrl, resolvedMiddleware);
  app.use(config.site.baseUrl, csrf(process.env.NODE_ENV === 'test'
    ? { ignoreMethods: ['GET', 'HEAD', 'OPTIONS', 'POST', 'PUT'] }
    : { cookie: true }));

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
    if (!config.options.console) {
      return;
    }

    console.log('Mongo Express server listening', 'at ' + addressString);

    if (!config.site.host || config.site.host === '0.0.0.0') {
      console.error(pico.red('Server is open to allow connections from anyone (0.0.0.0)'));
    }

    if (config.useOidcAuth !== true) {
      if (config.useBasicAuth !== true) {
        console.warn(pico.yellow('Basic and OIDC authentications are disabled, it\'s recommended to set the useBasicAuth to true in the config.js.'));
      } else if (config.basicAuth.username === 'admin' && config.basicAuth.password === 'pass') {
        console.warn(pico.yellow('basicAuth credentials are "admin:pass", it\'s recommended to set them in your config.js!'));
      }
    }
  })
    .on('error', function (e) {
      if (e.code === 'EADDRINUSE') {
        console.log();
        console.error(pico.red('Address ' + addressString + ' already in use! You need to pick a different host and/or port.'));
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
  console.log(`Welcome to mongo-express ${pkg.version}`);
  console.log('------------------------');
  console.log('\n');
}

program
  .version(pkg.version)
  .option('-U, --url <url>', 'connection string url')
  .option('-a, --admin', 'enable authentication as admin')
  .option('-p, --port <port>', 'listen on specified port')
  .parse(process.argv);

const options = program.opts();

if (options.url) {
  config.mongodb.connectionString = options.url;
  if (options.admin) {
    config.mongodb.admin = true;
  }
}

config.site.port = options.port || config.site.port;

if (!config.site.baseUrl) {
  console.error('Please specify a baseUrl in your config. Using "/" for now.');
  config.site.baseUrl = '/';
}

await bootstrap(config);
