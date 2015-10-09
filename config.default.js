var url = require('url');

if (typeof process.env.MONGODB_PORT === 'string') {
	var mongoConnection = url.parse(process.env.MONGODB_PORT);
	process.env.ME_CONFIG_MONGODB_SERVER = mongoConnection.hostname;
	process.env.ME_CONFIG_MONGODB_PORT = mongoConnection.port;
}

module.exports = {
  mongodb: {
    server: process.env.ME_CONFIG_MONGODB_SERVER || 'localhost',
    port: process.env.ME_CONFIG_MONGODB_PORT || 27017,

    //autoReconnect: automatically reconnect if connection is lost
    autoReconnect: true,
    //poolSize: size of connection pool (number of connections to use)
    poolSize: 4,
    //set admin to true if you want to turn on admin features
    //if admin is true, the auth list below will be ignored
    //if admin is true, you will need to enter an admin username/password below (if it is needed)
    admin: true,


    // >>>>  If you are using regular accounts, fill out auth details in the section below
    // >>>>  If you have admin auth, leave this section empty and skip to the next section
    auth: [
      /*
       * Add the the name, the username, and the password of the databases you want to connect to
       * Add as many databases as you want!
      {
        database: 'test',
        username: 'user',
        password: 'pass'
      }
      */
    ],


    //  >>>>  If you are using an admin mongodb account, or no admin account exists, fill out section below
    //  >>>>  Using an admin account allows you to view and edit all databases, and view stats

    //leave username and password empty if no admin account exists
    adminUsername: process.env.ME_CONFIG_MONGODB_ADMINUSERNAME || '',
    adminPassword: process.env.ME_CONFIG_MONGODB_ADMINPASSWORD || '',
    //whitelist: hide all databases except the ones in this list  (empty list for no whitelist)
    whitelist: [],
    //blacklist: hide databases listed in the blacklist (empty list for no blacklist)
    blacklist: []
  },

  site: {
    host: '0.0.0.0',
    port: 8081,
    cookieSecret: process.env.ME_CONFIG_SITE_COOKIESECRET || 'cookiesecret',
    sessionSecret: process.env.ME_CONFIG_SITE_SESSIONSECRET || 'sessionsecret',
    cookieKeyName: 'mongo-express'
  },

  //set useBasicAuth to true if you want to authehticate mongo-express loggins
  //if admin is false, the basicAuthInfo list below will be ignored
  //this will be true unless ME_CONFIG_BASICAUTH_USERNAME is set and is the empty string
  useBasicAuth: process.env.ME_CONFIG_BASICAUTH_USERNAME != '',

  basicAuth: {
    username: process.env.ME_CONFIG_BASICAUTH_USERNAME || 'admin',
    password: process.env.ME_CONFIG_BASICAUTH_PASSWORD || 'pass'
  },

  options: {
    //documentsPerPage: how many documents you want to see at once in collection view
    documentsPerPage: 10,
    //editorTheme: Name of the theme you want to use for displaying documents
    //See http://codemirror.net/demo/theme.html for all examples
    editorTheme: process.env.ME_CONFIG_OPTIONS_EDITORTHEME || 'rubyblue',

    //The options below aren't being used yet

    //cmdType: the type of command line you want mongo express to run
    //values: eval, subprocess
    //  eval - uses db.eval. commands block, so only use this if you have to
    //  subprocess - spawns a mongo command line as a subprocess and pipes output to mongo express
    cmdType: 'eval',
    //subprocessTimeout: number of seconds of non-interaction before a subprocess is shut down
    subprocessTimeout: 300,
    //readOnly: if readOnly is true, components of writing are not visible.
    readOnly: true
  }
};
