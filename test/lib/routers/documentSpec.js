import { Binary, ObjectId, UUID } from 'bson';
import { expect } from 'chai';
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
    const uuid = new UUID().toString();
    const hex = uuid.split('-').join('');
    const buffer = new Buffer.from(hex, 'hex');
    const _id = new Binary(buffer, Binary.SUBTYPE_UUID);
    const doc = { _id };
    await testCollection(db).insertOne(doc);
    return request.get(getDocumentUrl(dbName, urlColName, uuid)).query({ subtype: Binary.SUBTYPE_UUID }).expect(200)
      .then((res) => {
        expect(res.text).to.match(new RegExp(`<title>${uuid} - Mongo Express</title>`));
      })
      .finally(() => testCollection(db).deleteOne({ _id }));
  });

  describe('POST /db/<dbName>/<collection> should add a new document', () => {
    it('ObjectId()', async () => {
      const testValue = 'ObjectId()';
      await request.post(`/db/${dbName}/${urlColName}`).send({ document: `{_id:ObjectId(),testValue:"${testValue}"}` }).expect(302);
      const result = await testCollection(db).findOne({ testValue });
      expect(ObjectId.isValid(result._id.toString())).to.equal(true);
      await testCollection(db).deleteOne({ _id: result._id });
    });
    it('ObjectId(<object_id>)', async () => {
      const testValue = new ObjectId();
      await request.post(`/db/${dbName}/${urlColName}`).send({ document: `{_id:ObjectId("${testValue}"),testValue:"${testValue}"}` }).expect(302);
      const result = await testCollection(db).findOne({ testValue: testValue.toString() });
      expect(ObjectId.isValid(result._id.toString())).to.equal(true);
      await testCollection(db).deleteOne({ _id: result._id });
    });
    it('UUID()', async () => {
      const testValue = 'UUID()';
      await request.post(`/db/${dbName}/${urlColName}`).send({ document: `{_id:UUID(),testValue:"${testValue}"}` }).expect(302);
      const result = await testCollection(db).findOne({ testValue });
      expect(UUID.isValid(result._id.toString())).to.equal(true);
      await testCollection(db).deleteOne({ _id: result._id });
    });
    it('UUID(<uuid>)', async () => {
      const testUuid = new UUID();
      const testValue = `UUID("${testUuid}")`;
      await request.post(`/db/${dbName}/${urlColName}`).send({ document: `{_id:${testValue},testValue:${testValue}}` }).expect(302);
      const result = await testCollection(db).findOne({ testValue: new UUID(testUuid) });
      expect(UUID.isValid(result._id.toString())).to.equal(true);
      await testCollection(db).deleteOne({ _id: result._id });
    });
    it('Integer', async () => {
      const testId = 1;
      const testValue = '1';
      await request.post(`/db/${dbName}/${urlColName}`).send({ document: `{_id:${testValue},testValue:${testValue}}` }).expect(302);
      const result = await testCollection(db).findOne({ testValue: testId });
      expect(Number.isInteger(result._id)).to.equal(true);
      await testCollection(db).deleteOne({ _id: result._id });
    });
  });
  it('DEL /db/<dbName>/<collection>/<document> should delete the document');
  it('PUT /db/<dbName>/<collection>/<document> should update the document');

  after(() => Promise.all([
    cleanAndCloseDb(db),
    close(),
  ]));
});
