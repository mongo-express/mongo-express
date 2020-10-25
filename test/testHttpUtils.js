'use strict';

const supertest = require('supertest');

const defaultConf = require('./testDefaultConfig');
const testUtils = require('./testUtils');
const middleware = require('../lib/middleware');

exports.createServer = async () => {
  const app = await middleware(defaultConf());
  const httpServer = app.listen();
  const request = supertest.agent(httpServer);

  // There is currently a race condition with collection registering to mongoDb.
  // @TODO fix the race condition and remove me
  await testUtils.timeoutPromise(50);

  return ({ request, close: () => testUtils.asPromise((cb) => httpServer.close(cb)) });
};

exports.getDocumentUrl = (db, collection, documentId) => `/db/${db}/${collection}/${JSON.stringify(documentId)}`;
