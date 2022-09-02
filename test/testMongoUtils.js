import { MongoClient } from 'mongodb';
import { MongoMemoryServer } from 'mongodb-memory-server';

import mongoConfig from './testMongoConfig.js';

export const testData = [
  { testItem: 1 },
  { testItem: 2 },
  { testItem: 3 },
  { testItem: 4 },
];

let mongod;
let currentTestData;
export const getCurrentTestData = () => currentTestData;
export const getFirstDocumentId = () => getCurrentTestData()[0]._id.toString();

export const testCollectionName = 'test/items';
export const testDbName = mongoConfig.dbName;
export const testURLCollectionName = encodeURIComponent(testCollectionName);

export const createConnection = async () => {
  if (!mongod) {
    mongod = await MongoMemoryServer.create();
    mongoConfig.setUri(mongod.getUri());
  }

  return MongoClient.connect(mongoConfig.makeConnectionUrl());
};

export const createTestCollection = async (client) => {
  const insertResults = await client.db().collection(testCollectionName).insertMany(testData);
  const ids = Object.values(insertResults.insertedIds);
  const results = await client.db().collection(testCollectionName).find({ _id: { $in: ids } }).toArray();
  currentTestData = results;

  return results;
};

export const dropTestCollection = (client) => client.db().collection(testCollectionName).drop();

export const closeDb = (client) => client.close();

export const initializeDb = () => createConnection()
  .then((client) => createTestCollection(client).then(() => client));

export const cleanAndCloseDb = (client) => dropTestCollection(client)
  .then(() => closeDb(client));
