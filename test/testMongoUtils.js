'use strict';

const MongoClient = require('mongodb').MongoClient;

const mongoConfig = require('./testMongoConfig');
const asPromise = require('./testUtils').asPromise;

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

exports.createConnection = () =>
  asPromise(cb => MongoClient.connect(mongoConfig.makeConnectionUrl(), cb));

exports.createTestCollection = db =>
  asPromise(cb => db.collection(exports.testCollectionName).insertMany(exports.testData, cb))
    .then((results) => {
      currentTestData = results.ops;
      return results;
    });

exports.dropTestCollection = db =>
  asPromise(cb => db.collection(exports.testCollectionName).drop(cb));

exports.closeDb = db =>
  asPromise(cb => db.close(cb));

exports.initializeDb = () =>
  exports.createConnection().then(db =>
    exports.createTestCollection(db).then(() => db)
  );

exports.cleanAndCloseDb = db =>
  exports.dropTestCollection(db).then(() => exports.closeDb(db));
