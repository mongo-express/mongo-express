import { ObjectId } from 'mongodb';
import { expect } from 'chai';
import supertest from 'supertest';

import defaultConf from '../../testDefaultConfig.js';
import middleware from '../../../lib/middleware.js';
import {
  cleanAndCloseDb, initializeDb, testCollection, testDbName as dbName, testURLCollectionName as urlColName,
} from '../../testMongoUtils.js';

// readOnly and noDelete are security controls, not cosmetics: an operator sets them to make
// an instance safe to expose. Before this was enforced in the router they only hid controls
// in the templates and were checked in two collection handlers, so a direct HTTP request
// still went through — a DELETE deleted the document with readOnly turned on.
const serverWith = async (options) => {
  const config = defaultConf();
  Object.assign(config.options, options);
  const app = await middleware(config);
  const httpServer = app.listen();

  return { request: supertest.agent(httpServer), close: () => httpServer.close() };
};

const deleteDocument = (request, _id) => request
  .delete(`/db/${dbName}/${urlColName}/${JSON.stringify(_id.toString())}`);

const addDocument = (request) => request
  .post(`/db/${dbName}/${urlColName}`).send({ document: '{probe:true,added:true}' });

describe('Router read-only and no-delete enforcement', () => {
  let client;

  before(() => initializeDb().then((newClient) => { client = newClient; }));
  after(() => cleanAndCloseDb(client));

  const withProbeDocument = async (options, run) => {
    const _id = new ObjectId();
    await testCollection(client).insertOne({ _id, probe: true });
    const server = await serverWith(options);

    try {
      return await run(server.request, _id);
    } finally {
      server.close();
      await testCollection(client).deleteMany({ probe: true });
    }
  };

  describe('with no restrictions', () => {
    it('deletes a document', () => withProbeDocument({}, async (request, _id) => {
      await deleteDocument(request, _id);
      expect(await testCollection(client).findOne({ _id })).to.equal(null);
    }));

    it('adds a document', () => withProbeDocument({}, async (request) => {
      await addDocument(request);
      expect(await testCollection(client).countDocuments({ added: true })).to.equal(1);
    }));
  });

  describe('readOnly', () => {
    it('refuses to delete a document', () => withProbeDocument({ readOnly: true }, async (request, _id) => {
      await deleteDocument(request, _id);
      expect(await testCollection(client).findOne({ _id })).to.not.equal(null);
    }));

    it('refuses to add a document', () => withProbeDocument({ readOnly: true }, async (request) => {
      await addDocument(request);
      expect(await testCollection(client).countDocuments({ added: true })).to.equal(0);
    }));

    it('still serves reads', () => withProbeDocument({ readOnly: true }, (request) => request
      .get(`/db/${dbName}/${urlColName}`).expect(200)));
  });

  describe('noDelete', () => {
    it('refuses to delete a document', () => withProbeDocument({ noDelete: true }, async (request, _id) => {
      await deleteDocument(request, _id);
      expect(await testCollection(client).findOne({ _id })).to.not.equal(null);
    }));

    it('still allows adding a document', () => withProbeDocument({ noDelete: true }, async (request) => {
      await addDocument(request);
      expect(await testCollection(client).countDocuments({ added: true })).to.equal(1);
    }));
  });
});
