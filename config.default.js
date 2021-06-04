'use strict';

let mongo = {
  // Setting the connection string will only give access to that database
  // to see more databases you need to set mongodb.admin to true or add databases to the mongodb.auth list
  // It is RECOMMENDED to use connectionString instead of individual params, other options will be removed later.
  // More info here: https://docs.mongodb.com/manual/reference/connection-string/
  connectionString: process.env.ME_CONFIG_MONGODB_SERVER ? '' : process.env.ME_CONFIG_MONGODB_URL,
  host: '127.0.0.1',
  port: '27017',
  dbName: '',
};

// Accessing Bluemix variable to get MongoDB info
if (process.env.VCAP_SERVICES) {
  const dbLabel = 'mongodb-2.4';
  const env = JSON.parse(process.env.VCAP_SERVICES);
  if (env[dbLabel]) {
    mongo = env[dbLabel][0].credentials;
  }
}

const basicAuthUsername = 'ME_CONFIG_BASICAUTH_USERNAME';
const basicAuthPassword = 'ME_CONFIG_BASICAUTH_PASSWORD';
const adminUsername = 'ME_CONFIG_MONGODB_ADMINUSERNAME';
const adminPassword = 'ME_CONFIG_MONGODB_ADMINPASSWORD';
const dbAuthUsername = 'ME_CONFIG_MONGODB_AUTH_USERNAME';
const dbAuthPassword = 'ME_CONFIG_MONGODB_AUTH_PASSWORD';

function getFile(filePath) {
  if (typeof filePath !== 'undefined' && filePath) {
    const fs = require('fs');

    try {
      if (fs.existsSync(filePath)) {
        return fs.readFileSync(filePath);
      }
    } catch (err) {
      console.error('Failed to read file', filePath, err);
    }
  }
  return null;
}

function getFileEnv(envVariable) {
  const origVar = process.env[envVariable];
  const fileVar = process.env[envVariable + '_FILE'];
  if (fileVar) {
    const file = getFile(fileVar);
    if (file) {
      return file.toString().split(/\r?\n/)[0].trim();
    }
  }
  return origVar;
}

function getBinaryFileEnv(envVariable) {
  const fileVar = process.env[envVariable];
  return getFile(fileVar);
}

const meConfigMongodbServer = process.env.ME_CONFIG_MONGODB_SERVER
  ? process.env.ME_CONFIG_MONGODB_SERVER.split(',')
  : false;

function getConnectionStringFromEnvVariables() {
  const infos = {
    // server: mongodb hostname or IP address
    // for replica set, use array of string instead
    server: (
      meConfigMongodbServer.length > 1 ? meConfigMongodbServer : meConfigMongodbServer[0]
    ) || mongo.host,
    port: process.env.ME_CONFIG_MONGODB_PORT || mongo.port,
    dbName: process.env.ME_CONFIG_MONGODB_AUTH_DATABASE || mongo.dbName,

    // >>>> If you are using an admin mongodb account, or no admin account exists, fill out section below
    // >>>> Using an admin account allows you to view and edit all databases, and view stats
    // leave username and password empty if no admin account exists
    username: getFileEnv(adminUsername) || getFileEnv(dbAuthUsername) || mongo.username,
    password: getFileEnv(adminPassword) || getFileEnv(dbAuthPassword) || mongo.password,
  };
  const login = infos.username ? `${infos.username}:${infos.password}@` : '';
  return `mongodb://${login}${infos.server}:${infos.port}/${infos.dbName}`;
}

const sslCA = 'ME_CONFIG_MONGODB_CA_FILE';
const sslCAFromEnv = getBinaryFileEnv(sslCA);

module.exports = {
  mongodb: {
    // if a connection string options such as server/port/etc are ignored
    connectionString: mongo.connectionString || getConnectionStringFromEnvVariables(),

    connectionOptions: {
      // ssl: connect to the server using secure SSL
      ssl: process.env.ME_CONFIG_MONGODB_SSL || mongo.ssl,

      // sslValidate: validate mongod server certificate against CA
      sslValidate: process.env.ME_CONFIG_MONGODB_SSLVALIDATE || true,

      // sslCA: array of valid CA certificates
      sslCA: sslCAFromEnv ? [sslCAFromEnv] : [],

      // autoReconnect: automatically reconnect if connection is lost
      autoReconnect: true,

      // poolSize: size of connection pool (number of connections to use)
      poolSize: 4,
    },

    // set admin to true if you want to turn on admin features
    // if admin is true, the auth list below will be ignored
    // if admin is true, you will need to enter an admin username/password below (if it is needed)
    admin: process.env.ME_CONFIG_MONGODB_ENABLE_ADMIN
      ? process.env.ME_CONFIG_MONGODB_ENABLE_ADMIN.toLowerCase() === 'true'
      : false,

    // whitelist: hide all databases except the ones in this list  (empty list for no whitelist)
    whitelist: [],

    // blacklist: hide databases listed in the blacklist (empty list for no blacklist)
    blacklist: [],
  },

  site: {
    // baseUrl: the URL that mongo express will be located at - Remember to add the forward slash at the start and end!
    baseUrl: process.env.ME_CONFIG_SITE_BASEURL || '/',
    cookieKeyName: 'mongo-express',
    cookieSecret: process.env.ME_CONFIG_SITE_COOKIESECRET || 'cookiesecret',
    host: process.env.VCAP_APP_HOST || 'localhost',
    port: process.env.VCAP_APP_PORT || 8081,
    requestSizeLimit: process.env.ME_CONFIG_REQUEST_SIZE || '50mb',
    sessionSecret: process.env.ME_CONFIG_SITE_SESSIONSECRET || 'sessionsecret',
    sslCert: process.env.ME_CONFIG_SITE_SSL_CRT_PATH || '',
    sslEnabled: process.env.ME_CONFIG_SITE_SSL_ENABLED || false,
    sslKey: process.env.ME_CONFIG_SITE_SSL_KEY_PATH || '',
  },

  // set useBasicAuth to true if you want to authenticate mongo-express logins
  // if admin is false, the basicAuthInfo list below will be ignored
  // this will be true unless ME_CONFIG_BASICAUTH_USERNAME is set and is the empty string
  useBasicAuth: getFileEnv(basicAuthUsername) !== '',

  basicAuth: {
    username: getFileEnv(basicAuthUsername) || 'admin',
    password: getFileEnv(basicAuthPassword) || 'pass',
  },

  options: {
    // Display startup text on console
    console: true,

    // documentsPerPage: how many documents you want to see at once in collection view
    documentsPerPage: 10,

    // editorTheme: Name of the theme you want to use for displaying documents
    // See http://codemirror.net/demo/theme.html for all examples
    editorTheme: process.env.ME_CONFIG_OPTIONS_EDITORTHEME || 'rubyblue',

    // Maximum size of a single property & single row
    // Reduces the risk of sending a huge amount of data when viewing collections
    maxPropSize: (100 * 1000), // default 100KB
    maxRowSize: (1000 * 1000), // default 1MB

    // The options below aren't being used yet

    // cmdType: the type of command line you want mongo express to run
    // values: eval, subprocess
    //   eval - uses db.eval. commands block, so only use this if you have to
    //   subprocess - spawns a mongo command line as a subprocess and pipes output to mongo express
    cmdType: 'eval',

    // subprocessTimeout: number of seconds of non-interaction before a subprocess is shut down
    subprocessTimeout: 300,

    // readOnly: if readOnly is true, components of writing are not visible.
    readOnly: process.env.ME_CONFIG_OPTIONS_READONLY
      ? process.env.ME_CONFIG_OPTIONS_READONLY.toLowerCase() === 'true'
      : false,

    // collapsibleJSON: if set to true, jsons will be displayed collapsible
    collapsibleJSON: true,

    // collapsibleJSONDefaultUnfold: if collapsibleJSON is set to `true`, this defines default level
    //  to which JSONs are displayed unfolded; use number or "all" to unfold all levels
    collapsibleJSONDefaultUnfold: 1,

    // gridFSEnabled: if gridFSEnabled is set to 'true', you will be able to manage uploaded files
    // ( ak. grids, gridFS )
    gridFSEnabled: process.env.ME_CONFIG_SITE_GRIDFS_ENABLED
      ? process.env.ME_CONFIG_SITE_GRIDFS_ENABLED.toLowerCase() === 'true'
      : false,

    // logger: this object will be used to initialize router logger (morgan)
    logger: {},

    // confirmDelete: if confirmDelete is set to 'true', a modal for confirming deletion is
    // displayed before deleting a document/collection
    confirmDelete: false,

    // noExport: if noExport is set to true, we won't show export buttons
    noExport: false,

    // noDelete: if noDelete is set to true, we won't show delete buttons
    noDelete: process.env.ME_CONFIG_OPTIONS_NO_DELETE || false,
  },

  // Specify the default keyname that should be picked from a document to display in collections list.
  // Keynames can be specified for every database and collection.
  // If no keyname is specified, it defaults to '_id', which is a mandatory field.
  // For Example :
  // defaultKeyNames{
  //   "world_db":{  //Database Name
  //     "continent":"cont_name", // collection:field
  //     "country":"country_name",
  //     "city":"name"
  //   }
  // }
  defaultKeyNames: {

  },
};
