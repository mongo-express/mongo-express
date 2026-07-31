import {
  BSON, Binary, Long, ObjectId,
} from 'mongodb';
import { expect } from 'chai';
import { createServer, getDocumentUrl } from '../../testHttpUtils.js';
import {
  cleanAndCloseDb, initializeDb, getFirstDocumentId, testDbName as dbName, testCollection, testURLCollectionName,
} from '../../testMongoUtils.js';

const { UUID } = BSON;

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
  it('GET /db/<dbName>/<collection>/<document> (_id: Long - positive) should return html', async () => {
    const long = '0';
    const _id = new Long(long);
    const doc = { _id };
    await testCollection(db).insertOne(doc);
    return request.get(`/db/${dbName}/${urlColName}/${long}`).query({ type: 'L' }).expect(200)
      .then((res) => {
        expect(res.text).to.match(new RegExp(`<title>${long} - Mongo Express</title>`));
      })
      .finally(() => testCollection(db).deleteOne({ _id }));
  });
  it('GET /db/<dbName>/<collection>/<document> (_id: Long - negative) should return html', async () => {
    const long = '-1';
    const _id = new Long(long);
    const doc = { _id };
    await testCollection(db).insertOne(doc);
    return request.get(`/db/${dbName}/${urlColName}/${long}`).query({ type: 'L' }).expect(200)
      .then((res) => {
        expect(res.text).to.match(new RegExp(`<title>${long} - Mongo Express</title>`));
      })
      .finally(() => testCollection(db).deleteOne({ _id }));
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
      expect(Number.isSafeInteger(result._id)).to.equal(true);
      await testCollection(db).deleteOne({ _id: result._id });
    });
  });
  describe('DEL /db/<dbName>/<collection>/<document>', () => {
    it('should delete the document', async () => {
      const _id = new ObjectId();
      await testCollection(db).insertOne({ _id, testValue: 'toDelete' });

      await request.delete(getDocumentUrl(dbName, urlColName, _id.toString())).expect(302);

      expect(await testCollection(db).findOne({ _id })).to.equal(null);
    });

    it('should preserve the collection view params in the redirect', async () => {
      const _id = new ObjectId();
      await testCollection(db).insertOne({ _id, testValue: 'toDelete' });

      const res = await request.delete(getDocumentUrl(dbName, urlColName, _id.toString()))
        .query({ skip: 10, 'sort[testValue]': -1, query: '{}' })
        .expect(302);

      const location = decodeURIComponent(res.headers.location);
      expect(location).to.contain('sort[testValue]=-1');
      expect(location).to.contain('skip=10');
      expect(location).to.contain('query={}');
    });
  });

  describe('PUT /db/<dbName>/<collection>/<document>', () => {
    it('should update the document', async () => {
      const _id = new ObjectId();
      await testCollection(db).insertOne({ _id, testValue: 'before' });

      await request.put(getDocumentUrl(dbName, urlColName, _id.toString()))
        .send({ document: `{_id:ObjectId("${_id}"),testValue:"after"}` })
        .expect(302);

      const result = await testCollection(db).findOne({ _id });
      expect(result.testValue).to.equal('after');
      await testCollection(db).deleteOne({ _id });
    });

    it('should preserve the collection view params in the redirect', async () => {
      const _id = new ObjectId();
      await testCollection(db).insertOne({ _id, testValue: 'before' });

      const res = await request.put(getDocumentUrl(dbName, urlColName, _id.toString()))
        .query({ skip: 10, 'sort[testValue]': -1 })
        .send({ document: `{_id:ObjectId("${_id}"),testValue:"after"}` })
        .expect(302);

      const location = decodeURIComponent(res.headers.location);
      expect(location).to.contain('sort[testValue]=-1');
      expect(location).to.contain('skip=10');
      await testCollection(db).deleteOne({ _id });
    });
  });

  after(() => Promise.all([
    cleanAndCloseDb(db),
    close(),
  ]));
});
