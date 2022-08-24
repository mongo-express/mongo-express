'use strict';

const { MongoClient } = require('mongodb');
const { MongoMemoryServer } = require('mongodb-memory-server');

const mongoConfig = require('./testMongoConfig');

exports.testData = [
  { testItem: 1 },
  { testItem: 2 },
  { testItem: 3 },
  { testItem: 4 },
];

let mongod;
let currentTestData;
exports.getCurrentTestData = () => currentTestData;
exports.getFirstDocumentId = () => exports.getCurrentTestData()[0]._id.toString();

exports.testCollectionName = 'test/items';
exports.testDbName = mongoConfig.dbName;
exports.testURLCollectionName = encodeURIComponent(exports.testCollectionName);

exports.createConnection = async () => {
  if (!mongod) {
    mongod = await MongoMemoryServer.create();
    mongoConfig.uri = mongod.getUri();
  }

  return MongoClient.connect(mongoConfig.makeConnectionUrl());
};

exports.createTestCollection = async (client) => {
  const insertResults = await client.db().collection(exports.testCollectionName).insertMany(exports.testData);
  const ids = Object.values(insertResults.insertedIds);
  const results = await client.db().collection(exports.testCollectionName).find({ _id: { $in: ids } }).toArray();
  currentTestData = results;

  return results;
};

exports.dropTestCollection = (client) => client.db().collection(exports.testCollectionName).drop();

exports.closeDb = (client) => client.close();

exports.initializeDb = () => exports.createConnection()
  .then((client) => exports.createTestCollection(client).then(() => client));

exports.cleanAndCloseDb = (client) => exports.dropTestCollection(client)
  .then(() => exports.closeDb(client));
