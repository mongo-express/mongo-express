'use strict';

const _ = require('lodash');
const mongodb = require('mongodb');

let connect = function (config) {
  // connectionData gets passed back from this method
  // some fields will not be populated until a connection is established
  let connectionData = {
    // adminDb:            undefined,
    // mainConn:           undefined,
    collections:        [],
    connections:        [],
    databases:          [],
  };

  // update the collections list
  connectionData.updateCollections = function (db, dbName, callback) {
    db.listCollections().toArray(function (err, result) {
      let names = [];

      for (let r in result) {
        names.push(result[r].name);
      }

      connectionData.collections[dbName] = names.sort();

      if (callback) {
        callback(err);
      }
    });
  };

  // update database list
  connectionData.updateDatabases = function (admin, callback) {

    if (!admin) {
      console.error('Admin database is not accessable');
    }

    admin.listDatabases(function (err, dbs) {
      connectionData.databases = [];

      if (err) {
        //TODO: handle error
        console.error('unable to list databases');
        console.error(err);
        connectionData.databases = _.map(config.mongodb.auth, 'database');
      } else {
        for (let i = 0; i < dbs.databases.length; i++) {
          let dbName = dbs.databases[i].name;
          if (dbName) {
            if (config.mongodb.whitelist.length !== 0) {
              if (!_.includes(config.mongodb.whitelist, dbName)) {
                continue;
              }
            }

            if (config.mongodb.blacklist.length !== 0) {
              if (_.includes(config.mongodb.blacklist, dbName)) {
                continue;
              }
            }

            connectionData.connections[dbName] = connectionData.mainConn.db(dbName);
            connectionData.databases.push(dbName);
            connectionData.updateCollections(connectionData.connections[dbName], dbName);
          }
        }
      }

      //Sort database names
      connectionData.databases = connectionData.databases.sort();

      if (callback) {
        callback(connectionData.databases);
      }
    });
  };

  function setupAdminModeDatabases(db) {
    let adminDb = db.admin();
    connectionData.adminDb = adminDb;

    if (!config.mongodb.adminUsername || config.mongodb.adminUsername.length === 0) {
      if (config.options.console) console.log('Admin Database connected');
      connectionData.updateDatabases(adminDb);
    } else {
      //auth details were supplied, authenticate admin account with them
      adminDb.authenticate(config.mongodb.adminUsername, config.mongodb.adminPassword, function (err) {
        if (err) {
          //TODO: handle error
          console.error(err);
        }

        if (config.options.console) console.log('Admin Database connected');
        connectionData.updateDatabases(adminDb);
      });
    }
  }

  function setupDefaultDatabase(db) {
    var currentDbName = db.databaseName;
    if (config.options.console) console.log('Connected to ' + currentDbName + '...');
    connectionData.connections[currentDbName] = db;
    connectionData.databases.push(currentDbName);
    connectionData.updateCollections(db, currentDbName);
  }

  function setupAuthDatabases(db) {
    config.mongodb.auth.forEach(function (auth) {
      if (auth.database) {
        if (config.options.console) console.log('Connecting to ' + auth.database + '...');
        connectionData.connections[auth.database] = db.db(auth.database);
        connectionData.databases.push(auth.database);

        if (typeof auth.username !== 'undefined' && auth.username.length !== 0) {
          connectionData.connections[auth.database].authenticate(auth.username, auth.password, function (err, success) {
            if (err) {
              //TODO: handle error
              console.error(err);
            }

            if (!success) {
              console.error('Could not authenticate to database "' + auth.database + '"');
            }

            connectionData.updateCollections(connectionData.connections[auth.database], auth.database);
            if (config.options.console) console.log('Database ' + auth.database + ' connected');
          });
        } else {
          connectionData.updateCollections(connectionData.connections[auth.database], auth.database);
          if (config.options.console) console.log('Database ' + auth.database + ' connected');
        }
      }
    });
  }

  // connect to mongodb database
  function processOpenDatabase(err, db) {
    if (err) {
      throw err;
    }

    if (config.options.console) console.log('Database connected');

    connectionData.mainConn = db;

    //Check if admin features are on
    if (config.mongodb.admin === true) {
      setupAdminModeDatabases(db);
    } else {
      //Regular user authentication
      if (typeof config.mongodb.auth === 'undefined' || config.mongodb.auth.length === 0 || !config.mongodb.auth[0].database) {
        // no auth list specified so use the database from the connection string
        setupDefaultDatabase(db);
      } else {
        setupAuthDatabases(db);
      }
    }
  }

  // database connection
  if (config.mongodb.connectionString) {
    mongodb.MongoClient.connect(config.mongodb.connectionString, processOpenDatabase);
  } else {

    // connection options
    let dbOptions = {
      auto_reconnect: config.mongodb.autoReconnect,
      poolSize:       config.mongodb.poolSize,
      ssl:            config.mongodb.ssl,
      sslValidate:    config.mongodb.sslValidate,
      sslCA:          config.mongodb.sslCA,
    };

    // set up database using legacy configuration
    let host = config.mongodb.server  || 'localhost';
    let port = config.mongodb.port || 27017;

    if (config.mongodb.useSSL) {
      console.error('Please update config file to use mongodb.ssl instead of mongodb.useSSL. Copying value for now.');
      config.mongodb.ssl = config.mongodb.useSSL;
    }

    let db;

    if (Array.isArray(host)) {
      host = host.map(function (host) {
        return new mongodb.Server(host, port, dbOptions);
      });

      db = new mongodb.Db('local', new mongodb.ReplSet(host), { safe: true, w: 0 });
      db.open(processOpenDatabase);
    } else {
      db = new mongodb.Db('local', new mongodb.Server(host, port, dbOptions), { safe: true });
      db.open(processOpenDatabase);
    }
  }

  return connectionData;
};

module.exports = connect;
