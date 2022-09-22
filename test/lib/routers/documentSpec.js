import { Binary } from 'bson';
import { expect } from 'chai';
import { v4 as uuidv4 } from 'uuid';

import { createServer, getDocumentUrl } from '../../testHttpUtils.js';
import {
  cleanAndCloseDb, initializeDb, getFirstDocumentId, testDbName as dbName, testCollection, testURLCollectionName,
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

  it('GET /db/<dbName>/<collection>/<document> (_id: ObjectId) should return html', () => {
    const docId = getFirstDocumentId();
    return request.get(getDocumentUrl(dbName, urlColName, docId)).expect(200)
      .then((res) => {
        expect(res.text).to.match(new RegExp(`<title>${docId} - Mongo Express</title>`));
      });
  });
  it('GET /db/<dbName>/<collection>/<document> (_id: UUID) should return html', async () => {
    const UUID = uuidv4();
    const hex = UUID.split('-').join('');
    const buffer = new Buffer.from(hex, 'hex');
    const _id = new Binary(buffer, Binary.SUBTYPE_UUID);
    const doc = { _id };
    await testCollection(db).insertOne(doc);
    return request.get(getDocumentUrl(dbName, urlColName, UUID)).query({ subtype: Binary.SUBTYPE_UUID }).expect(200)
      .then((res) => {
        expect(res.text).to.match(new RegExp(`<title>${UUID} - Mongo Express</title>`));
      })
      .finally(() => testCollection(db).deleteOne({ _id }));
  });

  it('POST /db/<dbName>/<collection> should add a new document');
  it('DEL /db/<dbName>/<collection>/<document> should delete the document');
  it('PUT /db/<dbName>/<collection>/<document> should update the document');

  after(() => Promise.all([
    cleanAndCloseDb(db),
    close(),
  ]));
});
