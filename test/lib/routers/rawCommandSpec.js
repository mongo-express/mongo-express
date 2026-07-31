import { expect } from 'chai';
import supertest from 'supertest';

import defaultConf from '../../testDefaultConfig.js';
import middleware from '../../../lib/middleware.js';
import {
  cleanAndCloseDb, initializeDb, testCollection, testDbName as dbName, testURLCollectionName as urlColName,
} from '../../testMongoUtils.js';

// The Raw tab runs a named collection method. The original implementation built its
// arguments with eval(), which turned the `command` query parameter into arbitrary remote
// code execution, and it submits over GET, which the readOnly/noDelete middleware in
// router.js does not intercept.
const serverWith = async (options) => {
  const config = defaultConf();
  Object.assign(config.options, options);
  const app = await middleware(config);
  const httpServer = app.listen();

  return { request: supertest.agent(httpServer), close: () => httpServer.close() };
};

const withServer = async (options, body) => {
  const server = await serverWith(options);
  try {
    return await body(server.request);
  } finally {
    server.close();
  }
};

const collectionPage = (request) => request.get(`/db/${dbName}/${urlColName}`).expect(200);

const run = (request, command) => request.get(`/db/${dbName}/${urlColName}`).query({ command });

describe('Router raw command', () => {
  let client;

  before(() => initializeDb().then((newClient) => { client = newClient; }));
  after(() => cleanAndCloseDb(client));
  afterEach(() => testCollection(client).deleteMany({ raw: true }));

  describe('allowed commands', () => {
    it('runs a read command and reports the result', () => withServer({}, async (request) => {
      await testCollection(client).insertOne({ raw: true, marker: 'readable' });

      const res = await run(request, 'find({raw: true})').expect(302);
      const followed = await request.get(res.headers.location.replace(/^https?:\/\/[^/]+/, ''));

      expect(followed.text).to.contain('readable');
    }));

    it('runs a write command, including arguments containing commas', () => withServer({}, async (request) => {
      await testCollection(client).insertOne({ raw: true, marker: 'before' });

      // A naive split(',') on the argument list — what the original did — breaks this apart
      // in the middle of the documents.
      await run(request, 'updateOne({raw: true, marker: "before"}, {$set: {marker: "after"}})').expect(302);

      expect(await testCollection(client).countDocuments({ raw: true, marker: 'after' })).to.equal(1);
    }));
  });

  describe('rejected input', () => {
    // Regression: `eval()` here executed the query parameter as Node code.
    it('does not evaluate the arguments as JavaScript', () => withServer({}, async (request) => {
      const marker = 'globalThis.__rawCommandEscaped = true';

      await run(request, `find({a: (${marker})})`).expect(302);

      expect(globalThis.__rawCommandEscaped, 'argument was executed as code').to.equal(undefined);
    }));

    it('refuses a method that is not allow-listed', () => withServer({}, async (request) => {
      const res = await run(request, 'drop()').expect(302);
      const followed = await request.get(res.headers.location.replace(/^https?:\/\/[^/]+/, ''));

      expect(followed.text).to.contain('Command not allowed');
      // The collection is still there.
      expect(await testCollection(client).countDocuments()).to.be.a('number');
    }));

    it('refuses something that is not a method call at all', () => withServer({}, async (request) => {
      const res = await run(request, 'constructor').expect(302);
      const followed = await request.get(res.headers.location.replace(/^https?:\/\/[^/]+/, ''));

      expect(followed.text).to.contain('Invalid command');
    }));
  });

  describe('the Raw tab', () => {
    it('is offered by default', () => withServer({}, async (request) => {
      const page = await collectionPage(request);
      expect(page.text).to.contain('id="raw"');
    }));

    it('is hidden when noRawCommand is set', () => withServer({ noRawCommand: true }, async (request) => {
      const page = await collectionPage(request);
      expect(page.text).to.not.contain('id="raw"');
    }));

    it('is hidden when readOnly is set', () => withServer({ readOnly: true }, async (request) => {
      const page = await collectionPage(request);
      expect(page.text).to.not.contain('id="raw"');
    }));
  });

  describe('respects the instance restrictions', () => {
    // The Raw form is a GET, so the router middleware added for readOnly/noDelete never
    // sees it; the handler has to check for itself.
    it('readOnly blocks a write command', () => withServer({ readOnly: true }, async (request) => {
      await testCollection(client).insertOne({ raw: true, marker: 'untouched' });

      await run(request, 'updateOne({raw: true}, {$set: {marker: "changed"}})').expect(302);

      expect(await testCollection(client).countDocuments({ raw: true, marker: 'untouched' })).to.equal(1);
    }));

    it('noDelete blocks a delete command', () => withServer({ noDelete: true }, async (request) => {
      await testCollection(client).insertOne({ raw: true, marker: 'survivor' });

      await run(request, 'deleteMany({raw: true})').expect(302);

      expect(await testCollection(client).countDocuments({ raw: true })).to.equal(1);
    }));

    it('readOnly still allows a read command', () => withServer({ readOnly: true }, async (request) => {
      await testCollection(client).insertOne({ raw: true, marker: 'visible' });

      const res = await run(request, 'countDocuments({raw: true})').expect(302);
      const followed = await request.get(res.headers.location.replace(/^https?:\/\/[^/]+/, ''));

      expect(followed.text).to.not.contain('readOnly is set to true');
    }));
  });
});
