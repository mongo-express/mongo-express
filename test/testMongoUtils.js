'use strict';

const { MongoClient } = require('mongodb');

const mongoConfig = require('./testMongoConfig');
const { asPromise } = require('./testUtils');

exports.testData = [
  { testItem: 1 },
  { testItem: 2 },
  { testItem: 3 },
  { testItem: 4 },
];

let currentTestData;
exports.getCurrentTestData = () => currentTestData;
exports.getFirstDocumentId = () => exports.getCurrentTestData()[0]._id.toString();

exports.testCollectionName = 'test/items';
exports.testDbName = mongoConfig.dbName;
exports.testURLCollectionName = encodeURIComponent(exports.testCollectionName);

exports.createConnection = () => asPromise(
  (cb) => MongoClient.connect(mongoConfig.makeConnectionUrl(), cb),
);

exports.createTestCollection = (client) => asPromise(
  (cb) => client.db().collection(exports.testCollectionName).insertMany(exports.testData, cb),
).then((results) => {
  currentTestData = results.ops;
  return results;
});

exports.dropTestCollection = (client) => asPromise(
  (cb) => client.db().collection(exports.testCollectionName).drop(cb),
);

exports.closeDb = (client) => asPromise((cb) => client.close(cb));

exports.initializeDb = () => exports.createConnection()
  .then((client) => exports.createTestCollection(client).then(() => client));

exports.cleanAndCloseDb = (client) => exports.dropTestCollection(client)
  .then(() => exports.closeDb(client));
