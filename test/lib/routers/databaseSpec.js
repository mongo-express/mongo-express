'use strict';

const { expect } = require('chai');

const httpUtils = require('../../testHttpUtils');
const mongoUtils = require('../../testMongoUtils');
const { asPromise } = require('../../testUtils');

const dbName = mongoUtils.testDbName;
const collectionName = mongoUtils.testCollectionName;
const urlColName = mongoUtils.testURLCollectionName;

describe('Router database', () => {
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

  it('GET /db/<dbName> should return html', () => asPromise((cb) => request.get(`/db/${dbName}`).expect(200).end(cb))
    .then((res) => {
      expect(res.text).to.match(new RegExp(`<title>${dbName} - Mongo Express</title>`));
      expect(res.text).to.match(new RegExp(`<a href="/db/${dbName}/${urlColName}">${collectionName}</a>`));
    }));

  it('POST / should add a new db');
  it('DEL /<dbName> should delete the db');

  after(() => Promise.all([
    mongoUtils.cleanAndCloseDb(db),
    close(),
  ]));
});
