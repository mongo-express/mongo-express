'use strict';

const { expect } = require('chai');

const httpUtils = require('../../testHttpUtils');
const mongoUtils = require('../../testMongoUtils');
const { asPromise } = require('../../testUtils');

const dbName = mongoUtils.testDbName;
const collectionName = mongoUtils.testCollectionName;
const urlColName = mongoUtils.testURLCollectionName;

describe('Router collection', () => {
  let request;
  let close;
  let client;
  before(() => mongoUtils.initializeDb()
    .then((newClient) => {
      client = newClient;
      return httpUtils.createServer();
    }).then((server) => {
      request = server.request;
      close = server.close;
    }));

  it('GET /db/<dbName>/<collection> should return html', () => asPromise((cb) => request.get(`/db/${dbName}/${urlColName}`).expect(200).end(cb))
    .then((res) => {
      expect(res.text).to.match(new RegExp(`<title>${collectionName} - Mongo Express</title>`));
      expect(res.text).to.match(new RegExp(`<h1 id="pageTitle">Viewing Collection: ${collectionName}</h1>`));
    }));

  it('POST /db/<dbName> should add a new collection');
  it('DEL /db/<dbName>/<collection> should delete the collection');
  it('PUT /db/<dbName>/<collection> should rename the collection');

  it('GET /db/<dbName>/compact/<collection> should compact');
  it('GET /db/<dbName>/expArr/<collection> should export as array');
  it('GET /db/<dbName>/expCsv/<collection> should export as csv');
  it('GET /db/<dbName>/reIndex/<collection> should reIndex');
  it('PUT /db/<dbName>/addIndex/<collection> should addIndex');
  it('GET /db/<dbName>/export/<collection> should export as json');
  it('GET /db/<dbName>/dropIndex/<collection> should drop index');
  it('GET /db/<dbName>/updateCollections/<collection> should updateCollections');

  after(() => Promise.all([
    mongoUtils.cleanAndCloseDb(client),
    close(),
  ]));
});
