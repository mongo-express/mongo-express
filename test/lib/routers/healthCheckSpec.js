import { expect } from 'chai';
import supertest from 'supertest';

import defaultConf from '../../testDefaultConfig.js';
import middleware from '../../../lib/middleware.js';
import { cleanAndCloseDb, initializeDb } from '../../testMongoUtils.js';

// The health check is registered before the auth middleware in router.js, so a probe can
// reach it without credentials. That ordering is the whole point of the endpoint and is
// easy to break by moving a line, so it is asserted here rather than assumed.
const serverWith = async (overrides = {}) => {
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

describe('Router health check', () => {
  let client;

  before(() => initializeDb().then((newClient) => { client = newClient; }));
  after(() => cleanAndCloseDb(client));

  it('answers on the default path', () => withServer({}, async (request) => {
    const res = await request.get('/status').expect(200);
    expect(res.body).to.deep.equal({ status: 'ok' });
  }));

  it('answers on a configured path', () => withServer({ healthCheck: { path: '/healthz' } }, async (request) => {
    const res = await request.get('/healthz').expect(200);
    expect(res.body).to.deep.equal({ status: 'ok' });

    // The default path is no longer served once it has been overridden.
    await request.get('/status').expect(404);
  }));

  it('does not require basic auth, so probes work on a protected instance', () => withServer({
    useBasicAuth: true,
    basicAuth: { username: 'probe-user', password: 'probe-pass' },
  }, async (request) => {
    const res = await request.get('/status').expect(200);
    expect(res.body).to.deep.equal({ status: 'ok' });

    // The rest of the interface is still gated.
    await request.get('/').expect(401);
  }));
});
