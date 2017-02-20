'use strict';

const mongoConfig = require('./testMongoConfig');

module.exports = () => ({
  mongodb: {
    server: mongoConfig.host,
    port: mongoConfig.port,

    autoReconnect: true,
    poolSize: 4,
    admin: true,
    auth: [],

    adminUsername: '',
    adminPassword: '',
    whitelist: [mongoConfig.dbName],
    blacklist: [],
  },

  site: {
    host: 'localhost',
    port: 3000,
    cookieSecret: 'cookiesecret',
    sessionSecret: 'sessionsecret',
    cookieKeyName: 'mongo-express',
    sslEnabled: false,
    sslCert: '',
    sslKey: '',
  },

  useBasicAuth: false,

  options: {
    documentsPerPage: 10,
    editorTheme: 'rubyblue',

    logger: { skip: () => true },
    readOnly: false,
  },

  defaultKeyNames: {},
});
