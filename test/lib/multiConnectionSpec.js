import { MongoClient } from 'mongodb';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { expect } from 'chai';
import supertest from 'supertest';

import middleware from '../../lib/middleware.js';
import { deepmerge } from '../../lib/utils.js';
import configDefault from '../../config.default.js';

// config.mongodb may be a single connection or a list of them (lib/db.js splits on
// Array.isArray). The list form was unreachable in practice: config.default.js declares
// mongodb as an object, and deepmerge threw "(target || []) is not iterable" when a
// config.js overrode it with an array, so the app refused to start.
describe('Multiple connections', () => {
  let first;
  let second;
  let server;

  before(async () => {
    [first, second] = await Promise.all([MongoMemoryServer.create(), MongoMemoryServer.create()]);

    await Promise.all([[first, 'sales'], [second, 'orders']].map(async ([instance, dbName]) => {
      const client = await MongoClient.connect(instance.getUri());
      await client.db(dbName).collection('items').insertOne({ probe: true });
      await client.close();
    }));
  });

  after(async () => {
    if (server) {
      server.close();
    }
    await Promise.all([first?.stop(), second?.stop()]);
  });

  it('merges a list of connections over the default single one', () => {
    const merged = deepmerge(configDefault, {
      mongodb: [{ connectionString: 'mongodb://a' }, { connectionString: 'mongodb://b' }],
    });

    expect(Array.isArray(merged.mongodb)).to.equal(true);
    expect(merged.mongodb).to.have.lengthOf(2);
  });

  it('serves databases from every connection, prefixed by connection name', async () => {
    const config = deepmerge(configDefault, {
      mongodb: [
        { connectionString: `${first.getUri()}sales`, connectionName: 'primary' },
        { connectionString: `${second.getUri()}orders`, connectionName: 'secondary' },
      ],
      site: { sessionSecret: 'sessionsecret', cookieSecret: 'cookiesecret' },
      options: { console: false },
    });

    const app = await middleware(config);
    server = app.listen();

    const res = await supertest(server).get('/').expect(200);

    // With more than one client, db.js keys databases as `${connectionName}_${dbName}`.
    expect(res.text).to.contain('primary_sales');
    expect(res.text).to.contain('secondary_orders');
  });
});
