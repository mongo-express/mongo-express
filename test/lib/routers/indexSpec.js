'use strict';

const expect = require('chai').expect;

const httpUtils = require('../../testHttpUtils');
const testMongoUtils = require('../../testMongoUtils');
const asPromise = require('../../testUtils').asPromise;

describe('Routers index', () => {
  let request;
  let close;
  let db;
  before(() => {
    const server = httpUtils.createServer();
    request = server.request;
    close = server.close;
    return testMongoUtils.initializeDb()
      .then((newDb) => {
        db = newDb;
      });
  });

  it('GET / should return html', () =>
    asPromise(cb => request.get('/').expect(200).end(cb))
      .then((res) => {
        expect(res.text).to.match(/<h4 style="font-weight: bold;">Databases<\/h4>/);
        expect(res.text).to.match(new RegExp('<a href="/db/mongo-express-test-db/">mongo-express-test-db</a></h3>'));
      })
  );

  after(() => Promise.all([
    testMongoUtils.cleanAndCloseDb(db),
    close(),
  ]));
});

