#!/usr/bin/env node

import fs from 'node:fs';
import https from 'node:https';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pico from 'picocolors';
import { program } from 'commander';
import csrf from 'csurf';
import express from 'express';
import middleware from './lib/middleware.js';
import { deepmerge } from './lib/utils.js';
import configDefault from './config.default.js';

// TODO replace with import.meta.dirname if minimum Node.js version is >= 20.11.0
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, './package.json')));

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
  const resolvedMiddleware = await middleware(config);
  app.use(config.site.baseUrl, resolvedMiddleware);
  app.use(config.site.baseUrl, process.env.NODE_ENV === 'test' ? csrf({ ignoreMethods: ['GET', 'HEAD', 'OPTIONS', 'POST', 'PUT'] })
    : csrf({ cookie: true }));

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
        console.error(pico.red('Server is open to allow connections from anyone (0.0.0.0)'));
      }

      if (config.useOidcAuth !== true) {
        if (config.useBasicAuth !== true) {
          console.warn(pico.yellow('Basic and OIDC authentications are disabled, it\'s recommended to set the useBasicAuth to true in the config.js.'));
        } else if (config.basicAuth.username === 'admin' && config.basicAuth.password === 'pass') {
          console.warn(pico.yellow('basicAuth credentials are "admin:pass", it\'s recommended to set them in your config.js!'));
        }
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
