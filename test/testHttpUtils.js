'use strict';

const supertest = require('supertest');

const defaultConf = require('./testDefaultConfig');
const middleware = require('../lib/middleware');

exports.createServer = async () => {
  const app = await middleware(defaultConf());
  const httpServer = app.listen();
  const request = supertest.agent(httpServer);

  return ({ request, close: () => httpServer.close() });
};

exports.getDocumentUrl = (db, collection, documentId) => `/db/${db}/${collection}/${JSON.stringify(documentId)}`;
