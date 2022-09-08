import { expect } from 'chai';

import { createServer } from '../../testHttpUtils.js';
import {
  initializeDb, cleanAndCloseDb, testCollectionName as collectionName, testDbName as dbName, testURLCollectionName as urlColName,
} from '../../testMongoUtils.js';

describe('Router database', () => {
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

  it('GET /db/<dbName> should return html', () => request.get(`/db/${dbName}`).expect(200)
    .then((res) => {
      expect(res.text).to.match(new RegExp(`<title>${dbName} - Mongo Express</title>`));
      expect(res.text).to.match(new RegExp(`<a href="/db/${dbName}/${urlColName}">${collectionName}</a>`));
    }));

  it('POST / should add a new db');
  it('DEL /<dbName> should delete the db');

  after(() => Promise.all([
    cleanAndCloseDb(db),
    close(),
  ]));
});
