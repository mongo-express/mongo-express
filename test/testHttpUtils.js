'use strict';

const supertest = require('supertest');

const defaultConf = require('./testDefaultConfig');
const asPromise = require('./testUtils').asPromise;
const middleware = require('../lib/middleware');

exports.createServer = () => {
  const app = middleware(defaultConf());
  const httpServer = app.listen();
  const request = supertest.agent(httpServer);
  return { request, close: () => asPromise(cb => httpServer.close(cb)) };
};
