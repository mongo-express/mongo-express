import mongoConfig from './testMongoConfig.js';

export default () => ({
  mongodb: {
    connectionString: mongoConfig.makeConnectionUrl(),

    admin: true,
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

  healthCheck: {
    path: '/status',
  },

  useBasicAuth: false,

  options: {
    documentsPerPage: 10,
    editorTheme: 'rubyblue',

    logger: { skip: () => true },
    readOnly: false,
  },
});
