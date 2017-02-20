'use strict';

const expect = require('chai').expect;

const httpUtils = require('../../testHttpUtils');
const mongoUtils = require('../../testMongoUtils');
const asPromise = require('../../testUtils').asPromise;

const dbName = mongoUtils.testDbName;
// const collectionName = mongoUtils.testCollectionName;
const urlColName = mongoUtils.testURLCollectionName;

describe('Router document', () => {
  let request;
  let close;
  let db;
  before(() => {
    const server = httpUtils.createServer();
    request = server.request;
    close = server.close;
    return mongoUtils.initializeDb()
      .then((newDb) => {
        db = newDb;
      });
  });

  it('GET /db/<dbName>/<collection>/<document> should return html', () => {
    const docId = mongoUtils.getFirstDocumentId();
    return asPromise(cb => request.get(httpUtils.getDocumentUrl(dbName, urlColName, docId)).expect(200).end(cb))
      .then((res) => {
        expect(res.text).to.match(new RegExp(`<title>${docId} - Mongo Express</title>`));
      });
  });

  it('POST /db/<dbName>/<collection> should add a new document');
  it('DEL /db/<dbName>/<collection>/<document> should delete the document');
  it('PUT /db/<dbName>/<collection>/<document> should update the document');

  after(() => Promise.all([
    mongoUtils.cleanAndCloseDb(db),
    close(),
  ]));
});

