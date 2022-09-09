import { expect } from 'chai';

import { createServer } from '../../testHttpUtils.js';
import {
  cleanAndCloseDb, initializeDb, testCollectionName as collectionName, testDbName as dbName, testURLCollectionName as urlColName,
} from '../../testMongoUtils.js';

describe('Router collection', () => {
  let request;
  let close;
  let client;
  before(() => initializeDb()
    .then((newClient) => {
      client = newClient;
      return createServer();
    }).then((server) => {
      request = server.request;
      close = server.close;
    }));

  it('GET /db/<dbName>/<collection> should return html', () => request.get(`/db/${dbName}/${urlColName}`).expect(200)
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
    cleanAndCloseDb(client),
    close(),
  ]));
});
