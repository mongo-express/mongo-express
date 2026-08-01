import { expect } from 'chai';
import supertest from 'supertest';

import defaultConf from '../../testDefaultConfig.js';
import middleware from '../../../lib/middleware.js';
import {
  cleanAndCloseDb, initializeDb, testDbName as dbName,
} from '../../testMongoUtils.js';

// Redirect targets are built from config.site.baseUrl, not from res.locals.baseHref, which
// is derived from req.originalUrl. Feeding request-derived data to res.redirect is what
// CodeQL reports as js/server-side-unvalidated-url-redirection, and it is how an attacker
// gets a foothold on where other people are sent.
const serverWith = async (overrides = {}) => {
  const config = defaultConf();
  Object.assign(config.site, overrides);
  const app = await middleware(config);
  const httpServer = app.listen();

  return { request: supertest.agent(httpServer), close: () => httpServer.close() };
};

const withServer = async (overrides, body) => {
  const server = await serverWith(overrides);
  try {
    return await body(server.request);
  } finally {
    server.close();
  }
};

describe('Redirect targets', () => {
  let client;

  before(() => initializeDb().then((newClient) => { client = newClient; }));
  after(() => cleanAndCloseDb(client));

  describe('follow the configured base', () => {
    it('a missing database goes to the root', () => withServer({}, async (request) => {
      const res = await request.get('/db/does-not-exist').expect(302);
      expect(res.headers.location).to.equal('/');
    }));

    it('a missing collection goes to its database', () => withServer({}, async (request) => {
      const res = await request.get(`/db/${dbName}/does-not-exist`).expect(302);
      expect(res.headers.location).to.equal(`/db/${dbName}`);
    }));

    it('honours a configured baseUrl', () => withServer({ baseUrl: '/mongo/' }, async (request) => {
      const res = await request.get('/db/does-not-exist').expect(302);
      expect(res.headers.location).to.equal('/mongo/');
    }));
  });

  describe('ignore the request when choosing where to send people', () => {
    // These paths do not resolve to a route, so nothing should redirect off-host. The point
    // is that the target never picks up anything the caller supplied.
    for (const attempt of [
      '//evil.example.com/db/does-not-exist',
      '/%2f%2fevil.example.com/db/does-not-exist',
      '/db/does-not-exist/../..//evil.example.com',
    ]) {
      it(`does not send the visitor off-host for ${attempt}`, () => withServer({}, async (request) => {
        const res = await request.get(attempt);
        const location = res.headers.location;

        if (location) {
          expect(location).to.not.contain('evil.example.com');
          expect(location.startsWith('/'), `absolute or protocol-relative target: ${location}`).to.equal(true);
          expect(location.startsWith('//')).to.equal(false);
        }
      }));
    }
  });
});
