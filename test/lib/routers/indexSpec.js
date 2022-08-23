'use strict';

const { expect } = require('chai');

const httpUtils = require('../../testHttpUtils');
const mongoUtils = require('../../testMongoUtils');

describe('Router index', () => {
  let request;
  let close;
  let db;
  before(() => mongoUtils.initializeDb()
    .then((newDb) => {
      db = newDb;
      return httpUtils.createServer();
    }).then((server) => {
      request = server.request;
      close = server.close;
    }));

  it('GET / should return html', () => request.get('/').expect(200)
    .then((res) => {
      expect(res.text).to.match(/<title>Home - Mongo Express<\/title>/);
      expect(res.text).to.match(/<h4 style="font-weight: bold;">Databases<\/h4>/);
      const dbName = mongoUtils.testDbName;
      expect(res.text).to.match(new RegExp(`<a href="/db/${dbName}/">${dbName}</a></h3>`));
    }));

  after(() => Promise.all([
    mongoUtils.cleanAndCloseDb(db),
    close(),
  ]));
});
