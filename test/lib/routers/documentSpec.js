import { expect } from 'chai';

import { createServer, getDocumentUrl } from '../../testHttpUtils.js';
import {
  cleanAndCloseDb, initializeDb, getFirstDocumentId, testDbName as dbName, testURLCollectionName,
} from '../../testMongoUtils.js';

// const collectionName = mongoUtils.testCollectionName;
const urlColName = testURLCollectionName;

describe('Router document', () => {
  let request;
  let close;
  let db;
  before(() => initializeDb()
    .then((newDb) => {
      db = newDb;
      return createServer();
    }).then((server) => {
      request = server.request;
      close = server.close;
    }));

  it('GET /db/<dbName>/<collection>/<document> should return html', () => {
    const docId = getFirstDocumentId();
    return request.get(getDocumentUrl(dbName, urlColName, docId)).expect(200)
      .then((res) => {
        expect(res.text).to.match(new RegExp(`<title>${docId} - Mongo Express</title>`));
      });
  });

  it('POST /db/<dbName>/<collection> should add a new document');
  it('DEL /db/<dbName>/<collection>/<document> should delete the document');
  it('PUT /db/<dbName>/<collection>/<document> should update the document');

  after(() => Promise.all([
    cleanAndCloseDb(db),
    close(),
  ]));
});
