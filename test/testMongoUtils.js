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
let mongoauthd;
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

export const createConnectionWithWrongAuth = async () => {
  if (!mongoauthd) {
    mongoauthd = await MongoMemoryServer.create({
      auth: {
        enable: true, // enable automatic user creation
        customRootName: 'adm', // by default "mongodb-memory-server-root"
        customRootPwd: 'pass',
      },
    });
    mongoConfig.setUri(mongoauthd.getUri());
  }

  return MongoClient.connect(mongoConfig.makeConnectionUrl());
};

export const createTestCollection = async (client) => {
  // insertMany assigns _id onto the objects it is given. Passing `testData` directly meant
  // the module-level fixture kept the ids from the first spec file, so as soon as one spec
  // failed to drop the collection every later spec died with E11000 instead of just the
  // culprit. Insert a fresh copy each time.
  const documents = testData.map((document) => ({ ...document }));
  const insertResults = await client.db().collection(testCollectionName).insertMany(documents);
  const ids = Object.values(insertResults.insertedIds);
  const results = await client.db().collection(testCollectionName).find({ _id: { $in: ids } }).toArray();
  currentTestData = results;

  return results;
};

/** @typedef {import('mongodb').MongoClient} MongoClient */

/**
 * Return collection instance
 * @param {MongoClient} client
 */
export const testCollection = (client) => client.db().collection(testCollectionName);

export const dropTestCollection = (client) => client.db().collection(testCollectionName).drop();

export const closeDb = (client) => client.close();

export const initializeDb = () => createConnection()
  .then((client) => createTestCollection(client).then(() => client));

export const initializeDbWithWrongAuth = () => createConnectionWithWrongAuth();
export const cleanAndCloseDb = (client) => dropTestCollection(client)
  .then(() => closeDb(client));

/**
 * Shut the ephemeral MongoDB servers down and delete their data directories.
 *
 * Without this, `exit: true` tears the process down before mongodb-memory-server can clean
 * up, leaving a ~200 MB dbpath under the temp dir on every run. On a developer machine
 * those pile up until the disk (a 15 GB tmpfs here) is full and mongod starts failing to
 * boot with an opaque `fassert() failure`.
 */
export const stopMemoryServers = async () => {
  await Promise.all([mongod?.stop(), mongoauthd?.stop()]);
  mongod = undefined;
  mongoauthd = undefined;
};
