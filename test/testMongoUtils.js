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
exports.testCollectionName = 'test/items';

exports.createConnection = () =>
  asPromise(cb => MongoClient.connect(mongoConfig.makeConnectionUrl(), cb));

exports.createTestCollection = db =>
  asPromise(cb => db.collection(exports.testCollectionName).insertMany(exports.testData, cb));

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
