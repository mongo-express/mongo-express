#!/usr/bin/env node

'use strict';

var express     = require('express');
var fs          = require('fs');
var https       = require('https');
var middleware  = require('./middleware');
var app         = express();
var defaultPort = 80;
var server      = app;
var config;
var sslOptions;

try {
  config = require('./config');
} catch (e) {
  config = require('./config.default');

  var argv = require('minimist')(process.argv.slice(2), {
    alias: {
      u: 'username',
      p: 'password',
      _: ['database', 'd'],
      a: 'admin'
    },
    'boolean': ['a'],
    'default': {
      port: '8081'
    }
  });

  config.site.port = Number.parseInt(argv.port, 10);

  if (argv.u && argv.p && (argv.a ? !argv._.length : argv._.length)) { //TODO: Improve validation
    if (argv.a) {
      config.mongodb.admin = true;
      config.mongodb.adminUsername = argv.u;
      config.mongodb.adminPassword = argv.p;
    } else {
      config.mongodb.admin = false;
      config.mongodb.auth[0] = {
        username: argv.u,
        password: argv.p,
        database: argv._[0]
      };
      if ([argv.u, argv.p, argv._].every(function (ele) { return typeof ele === 'object'; })) { //TODO: Improve validation
        argv.u.forEach(function (ele, i) {
          config.mongodb.auth[i] = {
            username: argv.u[i],
            password: argv.p[i],
            database: argv._[i]
          };
        });
      }
    }
  } else {
    console.log('Usage: mongoe [options] [dbname]');
    console.log('');
    console.log('Options:');
    console.log('  -a, --admin              enable admin login');
    console.log('  -u, --username=USERNAME  username for authentication. can pass multiple values.');
    console.log('  -p, --password=PASSWORD  password for authentication. can pass multiple values.');
    console.log('  -d, --database=DATABASE  use DATABASE. not needed when using admin login. can pass multiple values.');
    console.log('      --port=PORT          listen on PORT.');
    console.log('');
    console.log('Create config.js to supress this message.');
    process.exit(0);
  }
}

app.use('/', middleware(config));
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
