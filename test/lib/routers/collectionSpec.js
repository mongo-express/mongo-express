import { expect } from 'chai';
import htmlParser from 'node-html-parser';

import { createServer } from '../../testHttpUtils.js';
import {
  cleanAndCloseDb, initializeDb, testCollectionName as collectionName, testDbName as dbName, testURLCollectionName as urlColName,
} from '../../testMongoUtils.js';

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
    it('No query - _getQuery.result=nul', () => request
      .get(`/db/${dbName}/${urlColName}`).expect(200)
      .then((res) => {
        expect(res.text).to.match(new RegExp(`<title>${collectionName} - Mongo Express</title>`));
        expect(res.text).to.match(new RegExp(`<h1 id="pageTitle">Viewing Collection: ${collectionName}</h1>`));
        expect(htmlParser.parse(res.text).querySelectorAll('[id^="doc-"]').length).to.equal(4);
      }));

    it('query={testItem:1} - _getQuery.result={testItem: 1}', () => request
      .get(`/db/${dbName}/${urlColName}`).expect(200).query({ query: '{testItem:1}' })
      .then((res) => {
        expect(res.text).to.match(new RegExp(`<title>${collectionName} - Mongo Express</title>`));
        expect(res.text).to.match(new RegExp(`<h1 id="pageTitle">Viewing Collection: ${collectionName}</h1>`));
        expect(htmlParser.parse(res.text).querySelectorAll('[id^="doc-"]').length).to.equal(1);
      }));

    describe('runAggregate=on', () => {
      it('query= - _getQuery.result=null', () => request
        .get(`/db/${dbName}/${urlColName}`).expect(200).query({ runAggregate: 'on', query: '' })
        .then((res) => {
          expect(res.text).to.match(new RegExp(`<title>${collectionName} - Mongo Express</title>`));
          expect(res.text).to.match(new RegExp(`<h1 id="pageTitle">Viewing Collection: ${collectionName}</h1>`));
          expect(htmlParser.parse(res.text).querySelectorAll('[id^="doc-"]').length).to.equal(4);
        }));

      it('query=[] - _getQuery.result=[]', () => request
        .get(`/db/${dbName}/${urlColName}`).expect(200).query({ runAggregate: 'on', query: '[]' })
        .then((res) => {
          expect(res.text).to.match(new RegExp(`<title>${collectionName} - Mongo Express</title>`));
          expect(res.text).to.match(new RegExp(`<h1 id="pageTitle">Viewing Collection: ${collectionName}</h1>`));
          expect(htmlParser.parse(res.text).querySelectorAll('[id^="doc-"]').length).to.equal(4);
        }));

      it('query=[{$match:{testItem:1}}] - _getQuery.result=[{$match:{testItem:1}}]', () => request
        .get(`/db/${dbName}/${urlColName}`).expect(200).query({ runAggregate: 'on', query: '[{$match:{testItem:1}}]' })
        .then((res) => {
          expect(res.text).to.match(new RegExp(`<title>${collectionName} - Mongo Express</title>`));
          expect(res.text).to.match(new RegExp(`<h1 id="pageTitle">Viewing Collection: ${collectionName}</h1>`));
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

  it('GET /db/<dbName>/dropIndex/<collection> should drop index');
  it('GET /db/<dbName>/updateCollections/<collection> should updateCollections');

  after(() => Promise.all([
    cleanAndCloseDb(client),
    close(),
  ]));
});
