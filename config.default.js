import fs from 'node:fs';
import * as dotenv from 'dotenv';

dotenv.config();

function getBoolean(str, defaultValue = false) {
  return str ? str.toLowerCase() === 'true' : defaultValue;
}

function getFile(filePath) {
  if (filePath !== undefined && filePath) {
    try {
      if (fs.existsSync(filePath)) {
        return fs.readFileSync(filePath);
      }
    } catch (error) {
      console.error('Failed to read file', filePath, error);
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

let mongo = {
  // Setting the connection string will only give access to that database
  // to see more databases you need to set mongodb.admin to true
  // As recommended, a connection String is used instead of the individual params.
  // More info here: https://docs.mongodb.com/manual/reference/connection-string/
  connectionString: getFileEnv('ME_CONFIG_MONGODB_URL'),
  tls: false,
};

// Accessing Bluemix variable to get MongoDB info
if (process.env.VCAP_SERVICES) {
  const dbLabel = 'mongodb-2.4';
  const env = JSON.parse(process.env.VCAP_SERVICES);
  if (env[dbLabel]) {
    mongo = env[dbLabel][0].credentials;
  }
}

// ME_CONFIG_BASICAUTH deprecated, to be removed in next releases
const basicAuth = 'ME_CONFIG_BASICAUTH';
const basicAuthEnabled = 'ME_CONFIG_BASICAUTH_ENABLED';
const basicAuthUsername = 'ME_CONFIG_BASICAUTH_USERNAME';
const basicAuthPassword = 'ME_CONFIG_BASICAUTH_PASSWORD';

const oidcAuthEnabled = 'ME_CONFIG_OIDCAUTH_ENABLED';
const oidcAuthBaseUrl = 'ME_CONFIG_OIDCAUTH_BASEURL';
const oidcAuthIssuer = 'ME_CONFIG_OIDCAUTH_ISSUER';
const oidcAuthClientId = 'ME_CONFIG_OIDCAUTH_CLIENTID';
const oidcAuthClientSecret = 'ME_CONFIG_OIDCAUTH_CLIENTSECRET';
const oidcAuthSecret = 'ME_CONFIG_OIDCAUTH_SECRET';

export default {
  mongodb: {
    // set allowDiskUse to true to remove the limit of 100 MB of RAM on each aggregation pipeline stage
    // https://www.mongodb.com/docs/v5.0/core/aggregation-pipeline-limits/#memory-restrictions
    allowDiskUse: getBoolean(process.env.ME_CONFIG_MONGODB_ALLOW_DISK_USE, false),

    // if a connection string options such as server/port/etc are ignored
    connectionString: mongo.connectionString,

    /** @type {import('mongodb').MongoClientOptions} */
    connectionOptions: {
      // tls: connect to the server using secure SSL
      tls: getBoolean(process.env.ME_CONFIG_MONGODB_TLS, mongo.tls),

      // tlsAllowInvalidCertificates: validate mongod server certificate against CA
      tlsAllowInvalidCertificates: getBoolean(process.env.ME_CONFIG_MONGODB_TLS_ALLOW_CERTS, true),

      // tlsCAFile: single PEM file on disk
      tlsCAFile: process.env.ME_CONFIG_MONGODB_TLS_CA_FILE,

      // tlsCertificateFile: client certificate PEM file on disk
      tlsCertificateFile: process.env.ME_CONFIG_MONGODB_TLS_CERT_FILE,

      // tlsCertificateKeyFile: client key PEM file on disk
      tlsCertificateKeyFile: process.env.ME_CONFIG_MONGODB_TLS_CERT_KEY_FILE,

      // tlsCertificateKeyFilePassword: password for the client key PEM
      tlsCertificateKeyFilePassword: process.env.ME_CONFIG_MONGODB_TLS_CERT_KEY_FILE_PASSWORD,

      // maxPoolSize: size of connection pool (number of connections to use)
      maxPoolSize: 4,
    },

    // set admin to true if you want to turn on admin features
    // if admin is true, the auth list below will be ignored
    // if admin is true, you will need to enter an admin username/password below (if it is needed)
    admin: getBoolean(process.env.ME_CONFIG_MONGODB_ENABLE_ADMIN, false),

    // This flag enhance AWS DocumentDB compatibility
    awsDocumentDb: getBoolean(process.env.ME_CONFIG_MONGODB_AWS_DOCUMENTDB, false),

    // whitelist: hide all databases except the ones in this list  (empty list for no whitelist)
    whitelist: [],

    // blacklist: hide databases listed in the blacklist (empty list for no blacklist)
    blacklist: [],
  },

  site: {
    // baseUrl: the URL that mongo express will be located at - Remember to add the forward slash at the start and end!
    baseUrl: process.env.ME_CONFIG_SITE_BASEURL || '/',
    cookieKeyName: 'mongo-express',
    cookieSecret: process.env.ME_CONFIG_SITE_COOKIESECRET,
    host: process.env.VCAP_APP_HOST || 'localhost',
    port: process.env.PORT || 8081,
    requestSizeLimit: process.env.ME_CONFIG_REQUEST_SIZE || '50mb',
    sessionSecret: process.env.ME_CONFIG_SITE_SESSIONSECRET,
    sslCert: process.env.ME_CONFIG_SITE_SSL_CRT_PATH || '',
    sslEnabled: getBoolean(process.env.ME_CONFIG_SITE_SSL_ENABLED, false),
    sslKey: process.env.ME_CONFIG_SITE_SSL_KEY_PATH || '',
  },

  healthCheck: {
    // path: the Path that mongo express healthcheck will be serve - Remember to add the forward slash at the start!
    path: process.env.ME_CONFIG_HEALTH_CHECK_PATH || '/status',
  },

  // set useBasicAuth to true if you want to authenticate mongo-express logins
  // this will be false unless ME_CONFIG_BASICAUTH_ENABLED is set to the true
  useBasicAuth: getBoolean(getFileEnv(basicAuthEnabled) || getFileEnv(basicAuth)),

  basicAuth: {
    username: getFileEnv(basicAuthUsername) || 'admin',
    password: getFileEnv(basicAuthPassword) || 'pass',
  },

  useOidcAuth: getBoolean(getFileEnv(oidcAuthEnabled)),
  oidcAuth: {
    issuerBaseURL: getFileEnv(oidcAuthIssuer),
    baseURL: getFileEnv(oidcAuthBaseUrl) || process.env.ME_CONFIG_SITE_BASEURL || '/',
    clientAuthMethod: 'client_secret_basic',
    clientSecret: getFileEnv(oidcAuthClientSecret),
    clientID: getFileEnv(oidcAuthClientId),
    secret: getFileEnv(oidcAuthSecret),
    idpLogout: true,
    authorizationParams: {
      response_type: 'code',
    },
  },

  options: {
    // Display startup text on console
    console: true,

    // documentsPerPage: how many documents you want to see at once in collection view
    documentsPerPage: process.env.ME_CONFIG_DOCUMENTS_PER_PAGE || 10,

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
    readOnly: getBoolean(process.env.ME_CONFIG_OPTIONS_READONLY, false),

    // persistEditMode: if set to true, remain on same page after clicked on Save button
    persistEditMode: getBoolean(process.env.ME_CONFIG_OPTIONS_PERSIST_EDIT_MODE, false),

    // collapsibleJSON: if set to true, jsons will be displayed collapsible
    collapsibleJSON: getBoolean(process.env.ME_CONFIG_OPTIONS_COLLAPSIBLE_JSON, true),

    // collapsibleJSONDefaultUnfold: if collapsibleJSON is set to `true`, this defines default level
    //  to which JSONs are displayed unfolded; use number or "all" to unfold all levels
    collapsibleJSONDefaultUnfold: 1,

    // gridFSEnabled: if gridFSEnabled is set to 'true', you will be able to manage uploaded files
    // ( ak. grids, gridFS )
    gridFSEnabled: getBoolean(process.env.ME_CONFIG_SITE_GRIDFS_ENABLED, false),

    // logger: this object will be used to initialize router logger (morgan)
    logger: {},

    // confirmDelete: if confirmDelete is set to 'true', a modal for confirming deletion is
    // displayed before deleting a document/collection
    confirmDelete: getBoolean(process.env.ME_CONFIG_OPTIONS_CONFIRM_DELETE, false),

    // noExport: if noExport is set to true, we won't show export buttons
    noExport: getBoolean(process.env.ME_CONFIG_OPTIONS_NO_EXPORT, false),

    // fullwidthLayout: if set to true an alternative page layout is used utilizing full window width
    fullwidthLayout: getBoolean(process.env.ME_CONFIG_OPTIONS_FULLWIDTH_LAYOUT, false),

    // noDelete: if noDelete is set to true, we won't show delete buttons
    noDelete: getBoolean(process.env.ME_CONFIG_OPTIONS_NO_DELETE, false),
  },
};
