import { BSON, Binary, ObjectId } from 'mongodb';
import { expect } from 'chai';
import htmlParser from 'node-html-parser';

import { createServer } from '../../testHttpUtils.js';
import {
  cleanAndCloseDb, initializeDb, testCollection, testCollectionName as collectionName, testDbName as dbName, testURLCollectionName as urlColName,
} from '../../testMongoUtils.js';

const { UUID } = BSON;

const toBinaryUUID = (uuid) => new Binary(Buffer.from(uuid.replaceAll('-', ''), 'hex'), Binary.SUBTYPE_UUID);

// Run a simple search with the default String type and report how many rows came back.
const countStringSearch = (request, dbName, urlColName, key, value) => request
  .get(`/db/${dbName}/${urlColName}`).query({ key, value, type: 'S' }).expect(200)
  .then((res) => htmlParser.parse(res.text).querySelectorAll('[id^="doc-"]').length);

describe('Router collection', () => {
  /** @type {import('supertest').SuperAgentTest} */
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

  describe('GET /db/<dbName>/<collection> should return html', () => {
    it('No query - _getQuery.result={}', () => request
      .get(`/db/${dbName}/${urlColName}`).expect(200)
      .then((res) => {
        expect(res.text).to.match(new RegExp(`<title>${collectionName} - Mongo Express</title>`));
        expect(res.text).to.match(new RegExp(
          `<h1 id="pageTitle" class="pb-2 border-bottom border-dark">Viewing Collection: ${collectionName}</h1>`,
        ));
        expect(htmlParser.parse(res.text).querySelectorAll('[id^="doc-"]').length).to.equal(4);
      }));

    it('query={testItem:1} - _getQuery.result={testItem: 1}', () => request
      .get(`/db/${dbName}/${urlColName}`).expect(200).query({ query: '{testItem:1}' })
      .then((res) => {
        expect(res.text).to.match(new RegExp(`<title>${collectionName} - Mongo Express</title>`));
        expect(res.text).to.match(new RegExp(`<h1 id="pageTitle" class="pb-2 border-bottom border-dark">Viewing Collection: ${collectionName}</h1>`));
        expect(htmlParser.parse(res.text).querySelectorAll('[id^="doc-"]').length).to.equal(1);
      }));

    // Regression: `sort[testItem]=-1` only reaches _getSort() as a nested object when the
    // 'extended' query parser is enabled. With Express 5's 'simple' default it arrives as the
    // flat key 'sort[testItem]' and sorting is silently ignored.
    it('sort[testItem]=-1 - documents are sorted descending', () => request
      .get(`/db/${dbName}/${urlColName}`).expect(200).query('sort[testItem]=-1')
      .then((res) => {
        const root = htmlParser.parse(res.text);
        expect(root.querySelector('[data-column="testItem"]').attributes['data-direction']).to.equal('-1');
        const values = root.querySelectorAll('[id^="doc-"]')
          .map((row) => row.querySelectorAll('.tableContent')[1].text.trim());
        expect(values).to.deep.equal(['4', '3', '2', '1']);
      }));

    // The default search type is String. Pasting an _id, a UUID or a boolean used to return
    // nothing unless the user also switched the type dropdown; the S converter now queries
    // both the raw string and the typed BSON value with $in.
    describe('type=S auto-detects typed values', () => {
      const objectId = new ObjectId();
      const uuid = new UUID().toString();
      const inserted = [];

      before(async () => {
        const documents = [
          { probe: 'objectid-typed', ref: objectId },
          { probe: 'objectid-string', ref: objectId.toString() },
          { probe: 'uuid-typed', uid: toBinaryUUID(uuid) },
          { probe: 'uuid-string', uid: uuid },
          { probe: 'bool-typed', flag: true },
          { probe: 'bool-string', flag: 'true' },
        ];
        const { insertedIds } = await testCollection(client).insertMany(documents);
        inserted.push(...Object.values(insertedIds));
      });

      after(() => testCollection(client).deleteMany({ _id: { $in: inserted } }));

      it('finds both the ObjectId and the string form of an _id', async () => {
        expect(await countStringSearch(request, dbName, urlColName, 'ref', objectId.toString())).to.equal(2);
      });

      it('finds both the Binary and the string form of a UUID', async () => {
        expect(await countStringSearch(request, dbName, urlColName, 'uid', uuid)).to.equal(2);
      });

      it('finds both the boolean and the string form of true', async () => {
        expect(await countStringSearch(request, dbName, urlColName, 'flag', 'true')).to.equal(2);
      });

      it('leaves an ordinary string search untouched', async () => {
        expect(await countStringSearch(request, dbName, urlColName, 'probe', 'bool-string')).to.equal(1);
      });

      // Regression: the 'extended' query parser can deliver value as an object, and calling
      // .toLowerCase() on it threw instead of falling back to a plain search.
      it('does not throw when value is not a string', () => request
        .get(`/db/${dbName}/${urlColName}`).query('key=probe&value[a]=b&type=S').expect(200));
    });

    describe('runAggregate=on', () => {
      it('query= - _getQuery.result={}', () => request
        .get(`/db/${dbName}/${urlColName}`).expect(200).query({ runAggregate: 'on', query: '' })
        .then((res) => {
          expect(res.text).to.match(new RegExp(`<title>${collectionName} - Mongo Express</title>`));
          expect(res.text).to.match(new RegExp(
            `<h1 id="pageTitle" class="pb-2 border-bottom border-dark">Viewing Collection: ${collectionName}</h1>`,
          ));
          expect(htmlParser.parse(res.text).querySelectorAll('[id^="doc-"]').length).to.equal(4);
        }));

      it('query=[] - _getQuery.result=[]', () => request
        .get(`/db/${dbName}/${urlColName}`).expect(200).query({ runAggregate: 'on', query: '[]' })
        .then((res) => {
          expect(res.text).to.match(new RegExp(`<title>${collectionName} - Mongo Express</title>`));
          expect(res.text).to.match(new RegExp(
            `<h1 id="pageTitle" class="pb-2 border-bottom border-dark">Viewing Collection: ${collectionName}</h1>`,
          ));
          expect(htmlParser.parse(res.text).querySelectorAll('[id^="doc-"]').length).to.equal(4);
        }));

      it('query=[{$match:{testItem:1}}] - _getQuery.result=[{$match:{testItem:1}}]', () => request
        .get(`/db/${dbName}/${urlColName}`).expect(200).query({ runAggregate: 'on', query: '[{$match:{testItem:1}}]' })
        .then((res) => {
          expect(res.text).to.match(new RegExp(`<title>${collectionName} - Mongo Express</title>`));
          expect(res.text).to.match(new RegExp(
            `<h1 id="pageTitle" class="pb-2 border-bottom border-dark">Viewing Collection: ${collectionName}</h1>`,
          ));
          expect(htmlParser.parse(res.text).querySelectorAll('[id^="doc-"]').length).to.equal(1);
        }));
    });
  });

  it('POST /db/<dbName> should add a new collection');
  it('DEL /db/<dbName>/<collection> should delete the collection');
  it('PUT /db/<dbName>/<collection> should rename the collection');

  it('GET /db/<dbName>/compact/<collection> should compact');
  it('GET /db/<dbName>/reIndex/<collection> should reIndex');
  it('PUT /db/<dbName>/addIndex/<collection> should addIndex');

  it('GET /db/<dbName>/export/<collection> should export as json', () => request
    .get(`/db/${dbName}/export/${urlColName}`).expect(200).responseType('blob')
    .then((res) => {
      expect(res.headers['content-disposition']).to.equal(`attachment; filename="${collectionName}.json"; filename*=UTF-8''${collectionName}.json`);
      expect(res.headers['content-type']).to.equal('application/json');

      // The body is worth asserting, not just the headers. This route serialises through a
      // stream transform, and when driver 7 quietly stopped honouring the cursor's transform
      // option the documents went out unserialised — headers looked perfect either way.
      const body = res.body.toString();
      expect(body, 'export should not be empty').to.not.equal('');
      expect(body).to.contain('"_id"');
      expect(body).to.not.contain('[object Object]');
    }));

  it('GET /db/<dbName>/expArr/<collection> should export as array', () => request
    .get(`/db/${dbName}/expArr/${urlColName}`).expect(200).responseType('blob')
    .then((res) => {
      expect(res.headers['content-disposition']).to.equal(`attachment; filename="${collectionName}.json"; filename*=UTF-8''${collectionName}.json`);
      expect(res.headers['content-type']).to.equal('application/json');
    }));

  it('GET /db/<dbName>/expCsv/<collection> should export as csv', () => request
    .get(`/db/${dbName}/expCsv/${urlColName}`).expect(200).responseType('blob')
    .then((res) => {
      expect(res.headers['content-disposition']).to.equal(`attachment; filename="${collectionName}.csv"; filename*=UTF-8''${collectionName}.csv`);
      expect(res.headers['content-type']).to.equal('text/csv');
    }));

  // Regression for #1674: with the Aggregate box ticked, the exports passed the pipeline
  // array to find() as a filter. MongoDB rejected it with "Query filter must be a plain
  // object or ObjectId", thrown inside the cursor stream where the try/catch could not see it.
  describe('exports with an aggregate query', () => {
    const pipeline = '[{$match:{testItem:1}}]';

    it('json export returns the matching document', () => request
      .get(`/db/${dbName}/export/${urlColName}`).query({ runAggregate: 'on', query: pipeline })
      .expect(200).responseType('blob')
      .then((res) => {
        expect(res.body.toString()).to.contain('"testItem":1');
      }));

    it('array export returns the matching document', () => request
      .get(`/db/${dbName}/expArr/${urlColName}`).query({ runAggregate: 'on', query: pipeline })
      .expect(200).responseType('blob')
      .then((res) => {
        const items = JSON.parse(res.body.toString());
        expect(items).to.have.lengthOf(1);
        expect(items[0].testItem).to.equal(1);
      }));

    it('csv export returns the matching document', () => request
      .get(`/db/${dbName}/expCsv/${urlColName}`).query({ runAggregate: 'on', query: pipeline })
      .expect(200).responseType('blob')
      .then((res) => {
        expect(res.body.toString()).to.contain('testItem');
      }));
  });

  it('GET /db/<dbName>/dropIndex/<collection> should drop index');
  it('GET /db/<dbName>/updateCollections/<collection> should updateCollections');

  after(() => Promise.all([
    cleanAndCloseDb(client),
    close(),
  ]));
});
