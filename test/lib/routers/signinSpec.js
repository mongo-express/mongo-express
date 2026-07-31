import { expect } from 'chai';
import supertest from 'supertest';

import defaultConf from '../../testDefaultConfig.js';
import middleware from '../../../lib/middleware.js';
import { resolveStrategy, verifyCredentials } from '../../../lib/auth.js';
import { cleanAndCloseDb, initializeDb } from '../../testMongoUtils.js';

const credentials = { username: 'form-user', password: 'form-pass' };

const serverWith = async (overrides) => {
  const config = defaultConf();
  Object.assign(config, overrides);
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

const formConfig = {
  authStrategy: 'form',
  useBasicAuth: true,
  basicAuth: credentials,
};

const signIn = (request, username, password) => request
  .post('/login').type('form').send({ username, password });

describe('Sign-in form', () => {
  let client;

  before(() => initializeDb().then((newClient) => { client = newClient; }));
  after(() => cleanAndCloseDb(client));

  describe('resolveStrategy', () => {
    it('prefers an explicit authStrategy', () => {
      expect(resolveStrategy({ authStrategy: 'form', useBasicAuth: true })).to.equal('form');
    });

    it('falls back to the legacy booleans', () => {
      expect(resolveStrategy({ useOidcAuth: true })).to.equal('oidc');
      expect(resolveStrategy({ useBasicAuth: true })).to.equal('basic');
    });

    // Authentication is switched off by not configuring it, never by asking for it.
    it('reports none when nothing is configured', () => {
      expect(resolveStrategy({})).to.equal('none');
    });
  });

  describe('verifyCredentials', () => {
    const config = { basicAuth: credentials };

    it('accepts the configured pair', () => {
      expect(verifyCredentials(config, 'form-user', 'form-pass')).to.equal(true);
    });

    for (const [label, user, pass] of [
      ['a wrong password', 'form-user', 'nope'],
      ['a wrong username', 'nobody', 'form-pass'],
      ['a password that is a prefix', 'form-user', 'form-pas'],
      ['nothing at all', undefined, undefined],
    ]) {
      it(`rejects ${label}`, () => {
        expect(verifyCredentials(config, user, pass)).to.equal(false);
      });
    }
  });

  describe('the gate', () => {
    it('redirects an anonymous visitor to the sign-in page', () => withServer(formConfig, async (request) => {
      const res = await request.get('/').expect(302);
      expect(res.headers.location).to.contain('/login');
    }));

    it('serves the sign-in page itself', () => withServer(formConfig, async (request) => {
      const res = await request.get('/login').expect(200);
      // A real form with the autocomplete hints password managers look for — the point of #1733.
      expect(res.text).to.contain('name="username"');
      expect(res.text).to.contain('autocomplete="current-password"');
    }));

    // The probe has to work while signed out, or the container looks unhealthy.
    it('leaves the health check reachable', () => withServer(formConfig, (request) => request
      .get('/status').expect(200)));

    it('lets a visitor in after a correct sign-in', () => withServer(formConfig, async (request) => {
      await signIn(request, credentials.username, credentials.password).expect(302);

      await request.get('/').expect(200);
    }));

    it('keeps a visitor out after a wrong sign-in', () => withServer(formConfig, async (request) => {
      const res = await signIn(request, credentials.username, 'wrong').expect(302);
      expect(res.headers.location).to.contain('/login');

      await request.get('/').expect(302);
    }));

    it('signs the visitor back out', () => withServer(formConfig, async (request) => {
      await signIn(request, credentials.username, credentials.password).expect(302);
      await request.get('/').expect(200);

      await request.get('/logout').expect(302);

      await request.get('/').expect(302);
    }));

    // Session fixation: the id handed out before signing in must not become the signed-in one.
    it('issues a new session id on sign-in', () => withServer(formConfig, async (request) => {
      const before = await request.get('/login').expect(200);
      const beforeCookie = String(before.headers['set-cookie'] || '');

      const after = await signIn(request, credentials.username, credentials.password).expect(302);
      const afterCookie = String(after.headers['set-cookie'] || '');

      expect(afterCookie).to.not.equal('');
      expect(afterCookie).to.not.equal(beforeCookie);
    }));
  });

  describe('other strategies are untouched', () => {
    it('basic auth still challenges', () => withServer({
      useBasicAuth: true,
      basicAuth: credentials,
    }, (request) => request.get('/').expect(401)));

    it('and accepts the right credentials', () => withServer({
      useBasicAuth: true,
      basicAuth: credentials,
    }, (request) => request.get('/').auth(credentials.username, credentials.password).expect(200)));
  });
});
