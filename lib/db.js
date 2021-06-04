'use strict';

const _ = require('lodash');
const Bluebird = require('bluebird');
const mongodb = require('mongodb');

const connect = async function (config) {
  // connectionData gets passed back from this method
  // some fields will not be populated until a connection is established
  const connectionData = {
    clients: [],
    // mainClient:           undefined,
    collections: {},
    connections: {},
  };

  // update the collections list
  connectionData.updateCollections = async function (dbConnection) {
    if (!dbConnection.fullName) {
      console.error('Received db instead of db connection');
      return [];
    }
    const collections = await Bluebird.fromCallback(
      (cb) => dbConnection.db.listCollections().toArray(cb),
    );
    const names = [];
    for (const collection of collections) {
      names.push(collection.name);
    }
    connectionData.collections[dbConnection.fullName] = names.sort();
    return collections;
  };

  // update database list
  connectionData.updateDatabases = async function () {
    connectionData.connections = {};
    connectionData.collections = {};
    await Promise.all(
      connectionData.clients.map(async (connectionInfo) => {
        const addConnection = (db, dbName) => {
          const fullName = connectionData.clients.length > 1
            ? `${connectionInfo.connectionName}_${dbName}`
            : dbName;
          const newConnection =  {
            info: connectionInfo,
            dbName,
            fullName,
            db,
          };
          connectionData.connections[fullName] = newConnection;
          return newConnection;
        };

        if (connectionInfo.adminDb) {
          const allDbs = await Bluebird.fromCallback(
            (cb) => connectionInfo.adminDb.listDatabases(cb),
          );
          for (let i = 0; i < allDbs.databases.length; ++i) {
            const dbName = allDbs.databases[i].name;
            if (dbName) {
              if (connectionInfo.info.whitelist.length !== 0) {
                if (!_.includes(connectionInfo.info.whitelist, dbName)) {
                  continue;
                }
              }

              if (connectionInfo.info.blacklist.length !== 0) {
                if (_.includes(connectionInfo.info.blacklist, dbName)) {
                  continue;
                }
              }
              const connection = addConnection(connectionInfo.client.db(dbName), dbName);
              // eslint-disable-next-line no-await-in-loop
              await connectionData.updateCollections(connection);
            }
          }
        } else {
          const dbConnection = connectionInfo.client.db();
          const dbName = dbConnection.databaseName;
          const connection = addConnection(dbConnection, dbName);
          await connectionData.updateCollections(connection);
        }
      }),
    );
  };

  connectionData.getDatabases = () => Object.keys(connectionData.connections).sort();

  // database connections
  const connections = Array.isArray(config.mongodb) ? config.mongodb : [config.mongodb];
  connectionData.clients = await Promise.all(connections.map(async (connectionInfo, index) => {
    const {
      connectionString, connectionName, admin, connectionOptions,
    } = connectionInfo;
    try {
      const client = await Bluebird.fromCallback(
        (cb) => mongodb.MongoClient.connect(connectionString, connectionOptions, cb),
      );
      const adminDb = admin ? client.db().admin() : null;
      return {
        connectionName: connectionName || `connection${index}`,
        client,
        adminDb,
        info: connectionInfo,
      };
    } catch (err) {
      console.error(`Could not connect to database using connectionString: ${connectionString}"`);
      throw err;
    }
  }));
  if (!connectionData.mainClient) {
    const client = connectionData.clients[0];
    connectionData.mainClient = client;
  }

  await connectionData.updateDatabases();

  return connectionData;
};

module.exports = connect;
